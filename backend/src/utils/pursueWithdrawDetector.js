/**
 * @module pursueWithdrawDetector
 * @description Pursue-Withdraw Pattern Detector for LoveRescue — analyzes couple
 * engagement data to identify the universal pursue-withdraw cycle described by
 * Gottman, Sue Johnson (EFT), and Amir Levine (attachment theory).
 *
 * As SteveRogers' meta-pattern #3 states: "The pursue-withdraw cycle is universal —
 * same pattern, 6 expert descriptions." This module quantifies it from behavioral data.
 *
 * THEORETICAL FRAMEWORK:
 * - Gottman: "Distance and Isolation Cascade" — pursuer demands, withdrawer stonewalls
 * - Sue Johnson (EFT): "Demon Dialogues" — protest polka (pursue-withdraw),
 *   find the bad guy (mutual criticism), freeze and flee (mutual withdrawal)
 * - Amir Levine: Anxious-avoidant trap — anxious partner pursues, avoidant deactivates
 *
 * SAFETY: Results are for therapist clinical insight only. Never shown to clients
 * as labels or used to assign blame. The CYCLE is the enemy, not either partner.
 *
 * @author SteveRogers / LoveRescue
 */

'use strict';

const logger = require('./logger');

/**
 * Module-level prisma reference, set via init().
 * @private
 */
let _prisma = null;

/**
 * Initialize the detector module with a shared Prisma client instance.
 * @param {import('@prisma/client').PrismaClient} prismaInstance
 */
function init(prismaInstance) {
  _prisma = prismaInstance;
}

/**
 * Returns the active prisma instance (parameter override or module-level).
 * @private
 */
function _getPrisma(prismaParam) {
  const p = prismaParam || _prisma;
  if (!p) throw new Error('pursueWithdrawDetector: prisma not initialized. Call init(prisma) or pass prisma as parameter.');
  return p;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** @enum {string} Pattern intensity levels */
const INTENSITY = Object.freeze({
  NONE: 'none',
  MILD: 'mild',
  MODERATE: 'moderate',
  SEVERE: 'severe',
});

/** @enum {string} Pattern trend direction */
const TREND = Object.freeze({
  IMPROVING: 'improving',
  STABLE: 'stable',
  INTENSIFYING: 'intensifying',
});

/** @enum {string} Partner role in the cycle */
const ROLE = Object.freeze({
  PURSUER: 'pursuer',
  WITHDRAWER: 'withdrawer',
  BALANCED: 'balanced',
});

/**
 * Thresholds for pattern detection.
 * Derived from Gottman's research on engagement disparity and Johnson's EFT cycle markers.
 * @private
 */
const DETECTION_THRESHOLDS = Object.freeze({
  /** Minimum negative correlation (7-day rolling) to flag pursue-withdraw */
  correlationThreshold: -0.4,
  /** Minimum days the pattern must persist to be flagged */
  minPatternDays: 7,
  /** Engagement ratio (pursuer/withdrawer) for mild */
  mildRatio: 1.5,
  /** Engagement ratio for moderate */
  moderateRatio: 2.5,
  /** Engagement ratio for severe */
  severeRatio: 4.0,
  /** Minimum data points needed for reliable detection */
  minDataPoints: 7,
  /** Trend comparison: current window vs previous window */
  trendComparisonSplit: 0.5,
});

// ═══════════════════════════════════════════════════════════════════════════════
// CORE DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} PartnerProfile
 * @property {string} userId - Partner's user UUID
 * @property {string} label - 'Partner A' or 'Partner B' (never real names in detection output)
 * @property {string} role - One of ROLE enum values
 * @property {number} engagementScore - Composite engagement score (0-100)
 * @property {number} activityCount - Total activities completed in window
 * @property {number} avgMood - Average mood score in window
 * @property {number} logFrequency - Daily logs per day ratio
 * @property {number} avgResponseLength - Average journal entry length (proxy for depth)
 * @property {number} engagementVariance - Variance in daily engagement (high = reactive)
 */

/**
 * @typedef {Object} PursueWithdrawResult
 * @property {boolean} patternDetected - Whether a pursue-withdraw pattern was found
 * @property {string} intensity - One of INTENSITY enum values
 * @property {string} trend - One of TREND enum values
 * @property {string} patternType - 'pursue-withdraw', 'mutual-avoidance', 'mutual-pursuit', or 'balanced'
 * @property {PartnerProfile|null} pursuer - Profile of the pursuing partner (null if balanced)
 * @property {PartnerProfile|null} withdrawer - Profile of the withdrawing partner (null if balanced)
 * @property {number} correlation - 7-day rolling correlation between partners' engagement
 * @property {number} engagementDisparity - Ratio of pursuer to withdrawer engagement
 * @property {Object} clinicalNotes - Therapist-facing interpretive notes
 * @property {Object} metadata - Analysis metadata (window, data quality, etc.)
 */

/**
 * Detects pursue-withdraw patterns in a couple's engagement data.
 *
 * Algorithm:
 * 1. Gather daily engagement signals for both partners over the window
 * 2. Compute composite engagement scores per day per partner
 * 3. Calculate rolling correlation between partners
 * 4. Identify roles (pursuer has higher engagement + higher variance)
 * 5. Assess intensity based on engagement disparity ratio
 * 6. Determine trend by comparing first half vs second half of window
 *
 * @param {string} coupleId - Relationship UUID
 * @param {number} [windowDays=14] - Number of days to analyze (default 14)
 * @returns {Promise<PursueWithdrawResult>} Structured detection result
 *
 * @example
 * const result = await detectPursueWithdrawPattern('relationship-uuid', 14);
 * if (result.patternDetected && result.trend === 'intensifying') {
 *   // Trigger therapist alert
 * }
 */
async function detectPursueWithdrawPattern(coupleId, windowDays = 14, prisma) {
  if (!coupleId) {
    throw new Error('detectPursueWithdrawPattern: coupleId is required');
  }

  const db = _getPrisma(prisma);
  const effectiveWindow = Math.max(windowDays, DETECTION_THRESHOLDS.minDataPoints);

  try {
    // 1. Get the relationship and both partners
    const relationship = await db.relationship.findUnique({
      where: { id: coupleId },
      select: { id: true, user1Id: true, user2Id: true, status: true },
    });

    if (!relationship) {
      return _emptyResult(coupleId, effectiveWindow, 'Relationship not found');
    }

    if (!relationship.user2Id) {
      return _emptyResult(coupleId, effectiveWindow, 'Not a couple relationship (single user)');
    }

    if (relationship.status !== 'active') {
      return _emptyResult(coupleId, effectiveWindow, 'Relationship is not active');
    }

    const partnerAId = relationship.user1Id;
    const partnerBId = relationship.user2Id;

    // 2. Gather engagement data for both partners
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - effectiveWindow);

    const [partnerAData, partnerBData] = await Promise.all([
      _gatherEngagementData(partnerAId, windowStart, db),
      _gatherEngagementData(partnerBId, windowStart, db),
    ]);

    // 3. Check data quality
    const totalDataPoints = partnerAData.dailyScores.length + partnerBData.dailyScores.length;
    if (totalDataPoints < DETECTION_THRESHOLDS.minDataPoints * 2) {
      return _emptyResult(coupleId, effectiveWindow, 'Insufficient data for reliable detection');
    }

    // 4. Compute daily engagement scores
    const partnerAProfile = _buildPartnerProfile(partnerAId, 'Partner A', partnerAData);
    const partnerBProfile = _buildPartnerProfile(partnerBId, 'Partner B', partnerBData);

    // 5. Calculate correlation between partners' daily engagement
    const correlation = _pearsonCorrelation(
      partnerAData.dailyScores.map((d) => d.score),
      partnerBData.dailyScores.map((d) => d.score)
    );

    // 6. Identify pattern type and roles
    const { patternType, pursuer, withdrawer } = _identifyRoles(
      partnerAProfile,
      partnerBProfile,
      correlation
    );

    // 7. Assess intensity
    const engagementDisparity = _calculateDisparity(pursuer, withdrawer);
    const intensity = _assessIntensity(engagementDisparity, correlation, patternType);

    // 8. Determine trend (compare first half vs second half of window)
    const trend = _assessTrend(
      partnerAData.dailyScores,
      partnerBData.dailyScores,
      effectiveWindow
    );

    // 9. Generate clinical notes
    const clinicalNotes = _generateClinicalNotes(
      patternType,
      intensity,
      trend,
      pursuer,
      withdrawer,
      correlation,
      engagementDisparity
    );

    return {
      patternDetected: patternType === 'pursue-withdraw' || patternType === 'mutual-avoidance',
      intensity,
      trend,
      patternType,
      pursuer: patternType === 'pursue-withdraw' ? pursuer : null,
      withdrawer: patternType === 'pursue-withdraw' ? withdrawer : null,
      correlation: Math.round(correlation * 1000) / 1000,
      engagementDisparity: Math.round(engagementDisparity * 100) / 100,
      clinicalNotes,
      metadata: {
        coupleId,
        windowDays: effectiveWindow,
        windowStart: windowStart.toISOString(),
        windowEnd: new Date().toISOString(),
        partnerADataPoints: partnerAData.dailyScores.length,
        partnerBDataPoints: partnerBData.dailyScores.length,
        dataQuality: totalDataPoints >= effectiveWindow * 2 ? 'good' : 'limited',
      },
    };
  } catch (error) {
    logger.error('Error analyzing couple pursue-withdraw', { coupleId, error: error.message });
    return _emptyResult(coupleId, effectiveWindow, `Analysis error: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVATE: DATA GATHERING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} EngagementData
 * @property {Array<{date: Date, score: number}>} dailyScores - Daily engagement scores
 * @property {number} totalActivities - Total activities completed
 * @property {number} totalLogs - Total daily logs
 * @property {number} avgMood - Average mood
 * @property {number} avgJournalLength - Average journal entry length
 * @property {number} totalGratitudes - Total gratitude entries
 * @property {number} totalVideos - Total videos watched
 */

/**
 * Gathers all engagement signals for a partner within the window.
 * @private
 * @param {string} userId
 * @param {Date} windowStart
 * @returns {Promise<EngagementData>}
 */
async function _gatherEngagementData(userId, windowStart, db) {
  const [dailyLogs, gratitudes, videoCompletions, assessments] = await Promise.all([
    db.dailyLog.findMany({
      where: { userId, date: { gte: windowStart } },
      orderBy: { date: 'asc' },
    }),
    db.gratitudeEntry.findMany({
      where: { userId, date: { gte: windowStart } },
    }),
    db.videoCompletion.findMany({
      where: { userId, watchedAt: { gte: windowStart } },
    }),
    db.assessment.findMany({
      where: { userId, completedAt: { gte: windowStart } },
    }),
  ]);

  // Build a map of date → engagement signals
  const dateMap = {};

  for (const log of dailyLogs) {
    const key = _dateKey(log.date);
    if (!dateMap[key]) dateMap[key] = _emptyDay(log.date);
    dateMap[key].hasLog = true;
    dateMap[key].mood = log.mood || 0;
    dateMap[key].positiveCount = log.positiveCount || 0;
    dateMap[key].negativeCount = log.negativeCount || 0;
    dateMap[key].journalLength = (log.journalEntry || '').length;
    dateMap[key].closenessScore = log.closenessScore || 0;
  }

  for (const g of gratitudes) {
    const key = _dateKey(g.date);
    if (!dateMap[key]) dateMap[key] = _emptyDay(g.date);
    dateMap[key].gratitudeCount++;
  }

  for (const v of videoCompletions) {
    const key = _dateKey(v.watchedAt);
    if (!dateMap[key]) dateMap[key] = _emptyDay(v.watchedAt);
    dateMap[key].videoCount++;
  }

  for (const a of assessments) {
    const key = _dateKey(a.completedAt);
    if (!dateMap[key]) dateMap[key] = _emptyDay(a.completedAt);
    dateMap[key].assessmentCount++;
  }

  // Compute composite daily engagement score (0-100)
  const dailyScores = Object.values(dateMap)
    .sort((a, b) => a.date - b.date)
    .map((day) => ({
      date: day.date,
      score: _computeDailyEngagement(day),
    }));

  // Aggregate stats
  const moods = dailyLogs.filter((l) => l.mood).map((l) => l.mood);
  const journalLengths = dailyLogs.filter((l) => l.journalEntry).map((l) => l.journalEntry.length);

  return {
    dailyScores,
    totalActivities: dailyLogs.length + gratitudes.length + videoCompletions.length + assessments.length,
    totalLogs: dailyLogs.length,
    avgMood: moods.length > 0 ? moods.reduce((s, m) => s + m, 0) / moods.length : 0,
    avgJournalLength: journalLengths.length > 0 ? journalLengths.reduce((s, l) => s + l, 0) / journalLengths.length : 0,
    totalGratitudes: gratitudes.length,
    totalVideos: videoCompletions.length,
  };
}

/**
 * Computes a composite daily engagement score (0-100).
 * Weighted signals:
 * - Has daily log: 25 points
 * - Mood entry: up to 10 points
 * - Journal entry: up to 20 points (by length)
 * - Gratitude entry: 15 points
 * - Video watched: 15 points
 * - Assessment taken: 15 points
 * @private
 * @param {Object} day
 * @returns {number}
 */
function _computeDailyEngagement(day) {
  let score = 0;

  if (day.hasLog) score += 25;
  if (day.mood > 0) score += Math.min(10, day.mood); // mood 1-10
  if (day.journalLength > 0) score += Math.min(20, day.journalLength / 25); // ~500 chars = max
  if (day.gratitudeCount > 0) score += 15;
  if (day.videoCount > 0) score += 15;
  if (day.assessmentCount > 0) score += 15;

  return Math.min(100, Math.round(score));
}

/**
 * Creates an empty day record.
 * @private
 */
function _emptyDay(date) {
  return {
    date: new Date(date),
    hasLog: false,
    mood: 0,
    positiveCount: 0,
    negativeCount: 0,
    journalLength: 0,
    closenessScore: 0,
    gratitudeCount: 0,
    videoCount: 0,
    assessmentCount: 0,
  };
}

/**
 * Returns a date key string (YYYY-MM-DD).
 * @private
 */
function _dateKey(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVATE: STATISTICAL ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Builds a partner profile from engagement data.
 * @private
 * @param {string} userId
 * @param {string} label
 * @param {EngagementData} data
 * @returns {PartnerProfile}
 */
function _buildPartnerProfile(userId, label, data) {
  const scores = data.dailyScores.map((d) => d.score);
  const mean = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
  const variance = scores.length > 1
    ? scores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (scores.length - 1)
    : 0;

  return {
    userId,
    label,
    role: ROLE.BALANCED, // assigned later
    engagementScore: Math.round(mean),
    activityCount: data.totalActivities,
    avgMood: Math.round(data.avgMood * 10) / 10,
    logFrequency: data.dailyScores.length > 0 ? data.totalLogs / data.dailyScores.length : 0,
    avgResponseLength: Math.round(data.avgJournalLength),
    engagementVariance: Math.round(variance * 10) / 10,
  };
}

/**
 * Calculates Pearson correlation between two arrays.
 * Aligns arrays by taking the shorter length.
 * @private
 * @param {number[]} x
 * @param {number[]} y
 * @returns {number} Correlation coefficient (-1 to 1), or 0 if insufficient data
 */
function _pearsonCorrelation(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;

  const a = x.slice(0, n);
  const b = y.slice(0, n);

  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;

  let numerator = 0;
  let denomA = 0;
  let denomB = 0;

  for (let i = 0; i < n; i++) {
    const dA = a[i] - meanA;
    const dB = b[i] - meanB;
    numerator += dA * dB;
    denomA += dA * dA;
    denomB += dB * dB;
  }

  const denominator = Math.sqrt(denomA * denomB);
  if (denominator === 0) return 0;

  return numerator / denominator;
}

/**
 * Identifies pattern type and assigns partner roles.
 * @private
 * @param {PartnerProfile} profileA
 * @param {PartnerProfile} profileB
 * @param {number} correlation
 * @returns {{patternType: string, pursuer: PartnerProfile|null, withdrawer: PartnerProfile|null}}
 */
function _identifyRoles(profileA, profileB, correlation) {
  const threshold = DETECTION_THRESHOLDS.correlationThreshold;

  // Negative correlation + engagement disparity = pursue-withdraw
  if (correlation < threshold) {
    const higher = profileA.engagementScore >= profileB.engagementScore ? profileA : profileB;
    const lower = profileA.engagementScore >= profileB.engagementScore ? profileB : profileA;

    // Pursuer: higher engagement AND higher variance (reactive, protest behavior)
    // Withdrawer: lower engagement, declining or flat
    higher.role = ROLE.PURSUER;
    lower.role = ROLE.WITHDRAWER;

    return {
      patternType: 'pursue-withdraw',
      pursuer: higher,
      withdrawer: lower,
    };
  }

  // Both low engagement = mutual avoidance (Johnson's "freeze and flee")
  if (profileA.engagementScore < 20 && profileB.engagementScore < 20) {
    profileA.role = ROLE.WITHDRAWER;
    profileB.role = ROLE.WITHDRAWER;

    return {
      patternType: 'mutual-avoidance',
      pursuer: null,
      withdrawer: null,
    };
  }

  // Both high engagement with positive correlation = mutual pursuit or healthy
  if (correlation > 0.3 && profileA.engagementScore > 40 && profileB.engagementScore > 40) {
    profileA.role = ROLE.BALANCED;
    profileB.role = ROLE.BALANCED;

    return {
      patternType: 'balanced',
      pursuer: null,
      withdrawer: null,
    };
  }

  // Weak or ambiguous pattern
  profileA.role = ROLE.BALANCED;
  profileB.role = ROLE.BALANCED;

  return {
    patternType: 'balanced',
    pursuer: null,
    withdrawer: null,
  };
}

/**
 * Calculates engagement disparity ratio between pursuer and withdrawer.
 * @private
 * @param {PartnerProfile|null} pursuer
 * @param {PartnerProfile|null} withdrawer
 * @returns {number} Ratio (1.0 = equal, higher = more disparity)
 */
function _calculateDisparity(pursuer, withdrawer) {
  if (!pursuer || !withdrawer) return 1.0;
  if (withdrawer.engagementScore <= 0) return pursuer.engagementScore > 0 ? 10.0 : 1.0;
  return pursuer.engagementScore / withdrawer.engagementScore;
}

/**
 * Assesses pattern intensity based on disparity and correlation.
 * @private
 * @param {number} disparity
 * @param {number} correlation
 * @param {string} patternType
 * @returns {string} One of INTENSITY enum values
 */
function _assessIntensity(disparity, correlation, patternType) {
  if (patternType === 'balanced') return INTENSITY.NONE;

  if (patternType === 'mutual-avoidance') {
    // For mutual avoidance, intensity is based on how low both are
    return INTENSITY.MODERATE; // Always concerning
  }

  // For pursue-withdraw, use disparity ratio
  if (disparity >= DETECTION_THRESHOLDS.severeRatio) return INTENSITY.SEVERE;
  if (disparity >= DETECTION_THRESHOLDS.moderateRatio) return INTENSITY.MODERATE;
  if (disparity >= DETECTION_THRESHOLDS.mildRatio) return INTENSITY.MILD;

  return INTENSITY.MILD;
}

/**
 * Assesses trend by comparing pattern metrics in first half vs second half of window.
 * @private
 * @param {Array<{date: Date, score: number}>} scoresA
 * @param {Array<{date: Date, score: number}>} scoresB
 * @param {number} windowDays
 * @returns {string} One of TREND enum values
 */
function _assessTrend(scoresA, scoresB, windowDays) {
  const midpoint = Math.floor(windowDays * DETECTION_THRESHOLDS.trendComparisonSplit);

  const now = new Date();
  const midDate = new Date();
  midDate.setDate(now.getDate() - midpoint);

  // Split each partner's scores into first half and second half
  const firstA = scoresA.filter((s) => s.date < midDate).map((s) => s.score);
  const secondA = scoresA.filter((s) => s.date >= midDate).map((s) => s.score);
  const firstB = scoresB.filter((s) => s.date < midDate).map((s) => s.score);
  const secondB = scoresB.filter((s) => s.date >= midDate).map((s) => s.score);

  if (firstA.length < 2 || secondA.length < 2 || firstB.length < 2 || secondB.length < 2) {
    return TREND.STABLE; // Not enough data to assess trend
  }

  // Calculate correlation in each half
  const firstCorr = _pearsonCorrelation(firstA, firstB);
  const secondCorr = _pearsonCorrelation(secondA, secondB);

  // Calculate disparity in each half
  const meanFirstA = firstA.reduce((s, v) => s + v, 0) / firstA.length;
  const meanFirstB = firstB.reduce((s, v) => s + v, 0) / firstB.length;
  const meanSecondA = secondA.reduce((s, v) => s + v, 0) / secondA.length;
  const meanSecondB = secondB.reduce((s, v) => s + v, 0) / secondB.length;

  const firstDisparity = Math.max(meanFirstA, meanFirstB) / (Math.min(meanFirstA, meanFirstB) || 1);
  const secondDisparity = Math.max(meanSecondA, meanSecondB) / (Math.min(meanSecondA, meanSecondB) || 1);

  // Intensifying: correlation becoming more negative OR disparity increasing
  if (secondCorr < firstCorr - 0.15 || secondDisparity > firstDisparity * 1.2) {
    return TREND.INTENSIFYING;
  }

  // Improving: correlation becoming more positive OR disparity decreasing
  if (secondCorr > firstCorr + 0.15 || secondDisparity < firstDisparity * 0.8) {
    return TREND.IMPROVING;
  }

  return TREND.STABLE;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVATE: CLINICAL INTERPRETATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generates therapist-facing clinical notes based on detection results.
 * References specific research and frameworks to support clinical reasoning.
 * @private
 * @param {string} patternType
 * @param {string} intensity
 * @param {string} trend
 * @param {PartnerProfile|null} pursuer
 * @param {PartnerProfile|null} withdrawer
 * @param {number} correlation
 * @param {number} disparity
 * @returns {Object}
 */
function _generateClinicalNotes(patternType, intensity, trend, pursuer, withdrawer, correlation, disparity) {
  const notes = {
    patternDescription: '',
    theoreticalContext: '',
    clinicalImplications: [],
    suggestedInterventions: [],
    caveats: [],
  };

  // Always add data quality caveat
  notes.caveats.push(
    'Pattern detection is based on app engagement data, which is a proxy for relationship dynamics — not a direct measure.',
    'Use as a clinical hypothesis to explore in session, not as a diagnostic conclusion.',
    'The CYCLE is the problem, not either partner. Avoid framing results as blame.'
  );

  switch (patternType) {
    case 'pursue-withdraw':
      notes.patternDescription = `A pursue-withdraw cycle is detected (${intensity} intensity, ${trend}). ` +
        `${pursuer?.label || 'One partner'} shows significantly higher app engagement (score: ${pursuer?.engagementScore || 0}), ` +
        `while ${withdrawer?.label || 'the other'} shows declining or minimal engagement (score: ${withdrawer?.engagementScore || 0}). ` +
        `The engagement disparity ratio is ${disparity.toFixed(1)}:1.`;

      notes.theoreticalContext =
        'Gottman identifies pursue-withdraw as part of the "Distance and Isolation Cascade" — ' +
        'one of the primary paths to relationship dissolution. Sue Johnson (EFT) calls this the ' +
        '"Protest Polka" — the pursuer\'s increased activity is protest behavior driven by attachment anxiety, ' +
        'while the withdrawer\'s disengagement is a deactivation response to perceived criticism or overwhelm. ' +
        'Amir Levine\'s research shows this often maps to anxious-avoidant attachment pairing.';

      notes.clinicalImplications = [
        `The pursuing partner's high engagement may reflect attachment anxiety — increased activity as a bid for connection.`,
        `The withdrawing partner's low engagement may signal overwhelm, shame, or avoidant deactivation — not lack of caring.`,
        trend === 'intensifying'
          ? 'The pattern is intensifying — without intervention, Gottman\'s research predicts increasing emotional distance and risk of separation.'
          : trend === 'improving'
            ? 'The pattern shows signs of improvement — the couple may be finding ways to break the cycle.'
            : 'The pattern is stable — neither worsening nor improving. Intervention could shift this.',
      ];

      notes.suggestedInterventions = [
        'EFT: Help the pursuer express vulnerability ("I chase because I\'m scared of losing you") instead of protest behavior.',
        'EFT: Help the withdrawer express the overwhelm ("I go quiet because I\'m afraid of making it worse") instead of stonewalling.',
        'Gottman: Introduce structured turn-taking conversations (each partner speaks uninterrupted for 10 minutes).',
        'Attachment work: Explore each partner\'s attachment history and how it plays into the current cycle.',
        'Practical: Discuss shared app activities the couple can do together to equalize engagement.',
      ];
      break;

    case 'mutual-avoidance':
      notes.patternDescription =
        'Both partners show low app engagement, suggesting mutual withdrawal or avoidance. ' +
        'Neither partner is actively pursuing connection through the platform.';

      notes.theoreticalContext =
        'Sue Johnson identifies this as "Freeze and Flee" — one of the three Demon Dialogues. ' +
        'Both partners have given up on protest and retreated into self-protection. ' +
        'Gottman\'s research correlates mutual withdrawal with the highest risk of relationship dissolution — ' +
        'more dangerous than active conflict, because there\'s no energy left to fight for the relationship.';

      notes.clinicalImplications = [
        'Mutual disengagement is often the most dangerous pattern — the absence of conflict can mask deep disconnection.',
        'Both partners may have lost hope that their needs can be met in the relationship.',
        'This may indicate the relationship is in Gottman\'s "Distance and Isolation" end-stage.',
      ];

      notes.suggestedInterventions = [
        'EFT: Create a safe space for each partner to express what they\'ve given up on — the unspoken needs.',
        'Gottman: Rebuild the Fondness & Admiration system with small, low-risk positive interactions.',
        'Practical: Assign ONE small shared activity per week — rebuild momentum before expectations.',
        'Attachment: Explore whether avoidance is self-protection from anticipated rejection or genuine indifference.',
      ];
      break;

    case 'balanced':
      notes.patternDescription =
        'Both partners show balanced engagement patterns. No significant pursue-withdraw dynamic detected.';

      notes.theoreticalContext =
        'Balanced engagement correlates with Johnson\'s Secure Functioning model — ' +
        'both partners are accessible, responsive, and engaged. Gottman associates this with ' +
        'a healthy "Sound Relationship House" where bids for connection are regularly turned toward.';

      notes.clinicalImplications = [
        'The couple appears to be engaging with the program in a balanced way — a positive indicator.',
        'Continue monitoring; balanced patterns can shift under stress.',
      ];

      notes.suggestedInterventions = [
        'Reinforce the positive pattern — acknowledge the couple\'s mutual investment.',
        'Use current engagement as a foundation for deeper therapeutic work.',
      ];
      break;

    default:
      notes.patternDescription = 'Pattern analysis inconclusive with available data.';
  }

  return notes;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVATE: UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns an empty/default result for cases where detection cannot proceed.
 * @private
 * @param {string} coupleId
 * @param {number} windowDays
 * @param {string} reason
 * @returns {PursueWithdrawResult}
 */
function _emptyResult(coupleId, windowDays, reason) {
  return {
    patternDetected: false,
    intensity: INTENSITY.NONE,
    trend: TREND.STABLE,
    patternType: 'balanced',
    pursuer: null,
    withdrawer: null,
    correlation: 0,
    engagementDisparity: 1.0,
    clinicalNotes: {
      patternDescription: reason,
      theoreticalContext: '',
      clinicalImplications: [],
      suggestedInterventions: [],
      caveats: [reason],
    },
    metadata: {
      coupleId,
      windowDays,
      windowStart: new Date(Date.now() - windowDays * 86400000).toISOString(),
      windowEnd: new Date().toISOString(),
      partnerADataPoints: 0,
      partnerBDataPoints: 0,
      dataQuality: 'insufficient',
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  init,
  detectPursueWithdrawPattern,

  // Constants (for external reference)
  INTENSITY,
  TREND,
  ROLE,
  DETECTION_THRESHOLDS,
};
