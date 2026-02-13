/**
 * @fileoverview Session Prep Report Generator for the Therapist Dashboard.
 * Pulls all activity since the last session, assessment score changes,
 * mood data, crisis flags, and generates a structured summary with
 * expert-attributed insights.
 */

const logger = require('./logger');

/**
 * Expert insight templates keyed by observation type.
 * Each returns a string with specific, research-backed context.
 */
const EXPERT_INSIGHTS = {
  /**
   * Generate insight about 5:1 ratio changes
   * @param {number} previousRatio - Previous positive:negative ratio
   * @param {number} currentRatio - Current ratio
   * @returns {string}
   */
  ratioChange(previousRatio, currentRatio) {
    const direction = currentRatio > previousRatio ? 'improved' : 'declined';
    const status = currentRatio >= 5 ? 'now in the healthy zone' : 'still below the 5:1 threshold';
    return `Gottman research shows their 5:1 ratio ${direction} from ${previousRatio.toFixed(1)} to ${currentRatio.toFixed(1)} — ${status}. Couples maintaining 5:1+ stay together 94% of the time.`;
  },

  /**
   * Generate insight about mood trend changes
   * @param {number} avgMoodBefore - Average mood before
   * @param {number} avgMoodAfter - Average mood after
   * @returns {string}
   */
  moodTrend(avgMoodBefore, avgMoodAfter) {
    const delta = avgMoodAfter - avgMoodBefore;
    if (Math.abs(delta) < 0.5) {
      return `Mood has remained stable (${avgMoodBefore.toFixed(1)} → ${avgMoodAfter.toFixed(1)}). Sue Johnson (EFT) notes that emotional stability is itself a sign of growing security in the relationship.`;
    }
    if (delta > 0) {
      return `Mood trending upward (${avgMoodBefore.toFixed(1)} → ${avgMoodAfter.toFixed(1)}). Tony Robbins: "Progress equals happiness" — this upward trajectory suggests the interventions are landing.`;
    }
    return `Mood declining (${avgMoodBefore.toFixed(1)} → ${avgMoodAfter.toFixed(1)}). Brené Brown's research suggests this may indicate increased vulnerability — which can be a sign of deeper work happening, OR a sign of distress. Explore which.`;
  },

  /**
   * Generate insight about attachment pattern changes
   * @param {string} style - Attachment style
   * @param {object} scores - Score changes
   * @returns {string}
   */
  attachmentProgress(style, scores) {
    const insights = {
      anxious: `Amir Levine's research: anxious attachment clients benefit most from consistent responsiveness. ${scores.closenessImproved ? 'Closeness scores improving suggests growing security.' : 'Watch for protest behaviors masking unmet needs.'}`,
      avoidant: `Levine notes avoidant clients show progress through increased emotional disclosure — even small increases matter. ${scores.journalFrequencyUp ? 'Journal frequency is up, suggesting growing comfort with vulnerability.' : 'Encourage small disclosure exercises.'}`,
      fearful_avoidant: `The fearful-avoidant pattern (Levine) requires simultaneous work on trust AND autonomy. ${scores.consistencyImproved ? 'Improved consistency is a strong positive signal.' : 'Watch for hot-cold cycling patterns.'}`,
      secure: `Secure base maintained. Gottman: focus on maintaining the friendship system and continuing to turn toward bids.`,
    };
    return insights[style] || 'Continue monitoring attachment-related behaviors.';
  },

  /**
   * Generate insight about activity engagement
   * @param {number} completionRate - Activity completion percentage
   * @param {number} streak - Current streak in days
   * @returns {string}
   */
  engagement(completionRate, streak) {
    if (completionRate >= 80 && streak >= 7) {
      return `Engagement is excellent (${completionRate}% completion, ${streak}-day streak). Robbins: "Identity is shaped by what we consistently do." This client is building identity-level change.`;
    }
    if (completionRate >= 50) {
      return `Moderate engagement (${completionRate}% completion). Gottman's research shows that even partial practice creates measurable improvement — but consistency accelerates results 3x.`;
    }
    return `Low engagement (${completionRate}% completion). Explore barriers — Perel notes that resistance often signals the exercises are touching something important. Alternatively, the activities may not match their current readiness stage.`;
  },

  /**
   * Generate insight about crisis flags
   * @param {Array} flags - Crisis flag objects
   * @returns {string}
   */
  crisisContext(flags) {
    if (flags.length === 0) return 'No crisis flags since last session.';
    const types = flags.map(f => f.type || f.alertType).join(', ');
    return `${flags.length} crisis flag(s) detected (${types}). Sue Johnson (EFT): crisis moments are often "attachment cries" — the raw need underneath. These are clinical opportunities for deepening, not just problems to solve.`;
  },

  /**
   * Generate insight about horseman patterns
   * @param {string} horseman - Dominant horseman
   * @param {number} previousScore - Previous score
   * @param {number} currentScore - Current score
   * @returns {string}
   */
  horsemanProgress(horseman, previousScore, currentScore) {
    const antidotes = {
      criticism: 'gentle startup (complain without blame)',
      contempt: 'building a culture of appreciation',
      defensiveness: 'accepting responsibility',
      stonewalling: 'physiological self-soothing',
    };
    const direction = currentScore > previousScore ? 'improving' : 'worsening';
    return `Gottman's Four Horsemen: ${horseman} scores ${direction} (${previousScore} → ${currentScore}). The research-backed antidote is ${antidotes[horseman] || 'targeted intervention'}. ${direction === 'improving' ? 'Reinforce what\'s working.' : 'Consider increasing frequency of antidote exercises.'}`;
  },
};

/**
 * Compute the positive:negative ratio from daily logs
 * @param {Array} logs - Daily log entries
 * @returns {number} The ratio (capped at 99 if no negatives)
 */
function computeRatio(logs) {
  const totalPos = logs.reduce((sum, l) => sum + (l.positiveCount || 0), 0);
  const totalNeg = logs.reduce((sum, l) => sum + (l.negativeCount || 0), 0);
  if (totalNeg === 0) return totalPos > 0 ? 99 : 0;
  return totalPos / totalNeg;
}

/**
 * Compute average mood from daily logs
 * @param {Array} logs - Daily log entries with mood field
 * @returns {number} Average mood (0 if no data)
 */
function computeAvgMood(logs) {
  const withMood = logs.filter(l => l.mood != null);
  if (withMood.length === 0) return 0;
  return withMood.reduce((sum, l) => sum + l.mood, 0) / withMood.length;
}

/**
 * Generate a comprehensive session prep report for a therapist.
 *
 * @param {object} prisma - Prisma client instance
 * @param {string} therapistId - Therapist UUID
 * @param {string} clientId - Client (user) UUID
 * @param {Date|string|null} lastSessionDate - Date of last therapy session (null = last 14 days)
 * @returns {Promise<object>} Structured session prep report
 */
async function generateSessionPrepReport(prisma, therapistId, clientId, lastSessionDate) {
  const since = lastSessionDate ? new Date(lastSessionDate) : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  logger.info('Generating session prep report', { therapistId, clientId, since: since.toISOString() });

  // Pull all relevant data in parallel
  const [
    client,
    recentLogs,
    previousLogs,
    recentAssessments,
    previousAssessments,
    completedTasks,
    pendingTasks,
    recentAlerts,
    courseProgress,
    relationship,
    gratitudeEntries,
  ] = await Promise.all([
    // Client info
    prisma.user.findUnique({
      where: { id: clientId },
      select: { id: true, firstName: true, lastName: true, email: true },
    }),
    // Logs since last session
    prisma.dailyLog.findMany({
      where: { userId: clientId, date: { gte: since }, therapistVisible: true },
      orderBy: { date: 'asc' },
    }),
    // Logs from equivalent period before last session (for comparison)
    prisma.dailyLog.findMany({
      where: {
        userId: clientId,
        therapistVisible: true,
        date: {
          gte: new Date(since.getTime() - (Date.now() - since.getTime())),
          lt: since,
        },
      },
      orderBy: { date: 'asc' },
    }),
    // Assessments since last session
    prisma.assessment.findMany({
      where: { userId: clientId, completedAt: { gte: since } },
      orderBy: { completedAt: 'desc' },
    }),
    // Most recent assessments before last session (for comparison)
    prisma.assessment.findMany({
      where: { userId: clientId, completedAt: { lt: since } },
      orderBy: { completedAt: 'desc' },
      take: 20,
    }),
    // Tasks completed since last session
    prisma.therapistTask.findMany({
      where: {
        assignedToUserId: clientId,
        completed: true,
        completedAt: { gte: since },
      },
    }),
    // Pending tasks
    prisma.therapistTask.findMany({
      where: { assignedToUserId: clientId, completed: false },
    }),
    // Alerts since last session
    prisma.therapistAlert.findMany({
      where: { therapistId, clientId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    }),
    // Course progress (userId has @unique constraint)
    prisma.courseProgress.findUnique({
      where: { userId: clientId },
      include: { weeklyStrategies: { orderBy: { weekNumber: 'desc' }, take: 2 } },
    }),
    // Relationship (for couple context)
    prisma.relationship.findFirst({
      where: {
        OR: [{ user1Id: clientId }, { user2Id: clientId }],
        status: 'active',
      },
    }),
    // Gratitude entries since last session
    prisma.gratitudeEntry.findMany({
      where: { userId: clientId, date: { gte: since } },
      orderBy: { date: 'desc' },
    }),
  ]);

  if (!client) {
    throw new Error(`Client not found: ${clientId}`);
  }

  // ── Compute metrics ──

  // Activity completion
  const totalDaysSince = Math.max(1, Math.ceil((Date.now() - since.getTime()) / (24 * 60 * 60 * 1000)));
  const daysWithLogs = recentLogs.length;
  const completionRate = Math.round((daysWithLogs / totalDaysSince) * 100);

  // Streak (consecutive days with logs, counting backward from today)
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const logDates = new Set(recentLogs.map(l => new Date(l.date).toISOString().split('T')[0]));
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (logDates.has(d.toISOString().split('T')[0])) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  // Mood trends
  const currentAvgMood = computeAvgMood(recentLogs);
  const previousAvgMood = computeAvgMood(previousLogs);

  // 5:1 ratio
  const currentRatio = computeRatio(recentLogs);
  const previousRatio = computeRatio(previousLogs);

  // Assessment changes — compare recent vs. previous by type
  const assessmentChanges = {};
  const recentByType = {};
  for (const a of recentAssessments) {
    if (!recentByType[a.type]) recentByType[a.type] = a;
  }
  const prevByType = {};
  for (const a of previousAssessments) {
    if (!prevByType[a.type]) prevByType[a.type] = a;
  }
  for (const type of Object.keys(recentByType)) {
    assessmentChanges[type] = {
      current: recentByType[type].score,
      previous: prevByType[type]?.score || null,
      completedAt: recentByType[type].completedAt,
    };
  }

  // Crisis flags
  const crisisFlags = recentAlerts
    .filter(a => a.alertType === 'CRISIS' || a.severity === 'CRITICAL')
    .map(a => ({
      type: a.alertType,
      severity: a.severity,
      message: a.message,
      date: a.createdAt,
    }));

  // ── Generate expert insights ──
  const expertInsights = [];

  // Ratio insight
  if (recentLogs.length >= 3) {
    expertInsights.push(EXPERT_INSIGHTS.ratioChange(previousRatio || 0, currentRatio));
  }

  // Mood insight
  if (currentAvgMood > 0) {
    expertInsights.push(EXPERT_INSIGHTS.moodTrend(previousAvgMood || currentAvgMood, currentAvgMood));
  }

  // Engagement insight
  expertInsights.push(EXPERT_INSIGHTS.engagement(completionRate, streak));

  // Crisis insight
  expertInsights.push(EXPERT_INSIGHTS.crisisContext(crisisFlags));

  // Attachment insight (if attachment assessment exists)
  const attachmentAssessment = recentByType.attachment || prevByType.attachment;
  if (attachmentAssessment) {
    const score = typeof attachmentAssessment.score === 'string'
      ? JSON.parse(attachmentAssessment.score)
      : attachmentAssessment.score;
    const style = score?.style || score?.attachmentStyle || score?.primary;
    if (style) {
      expertInsights.push(EXPERT_INSIGHTS.attachmentProgress(
        style.toLowerCase().replace(/[-\s]/g, '_'),
        {
          closenessImproved: currentAvgMood > previousAvgMood,
          journalFrequencyUp: recentLogs.filter(l => l.journalEntry).length >
            previousLogs.filter(l => l.journalEntry).length,
          consistencyImproved: completionRate >= 60,
        }
      ));
    }
  }

  // Horseman insight (if gottman assessment exists)
  const gottmanRecent = recentByType.gottman_checkup;
  const gottmanPrev = prevByType.gottman_checkup;
  if (gottmanRecent && gottmanPrev) {
    const current = typeof gottmanRecent.score === 'string' ? JSON.parse(gottmanRecent.score) : gottmanRecent.score;
    const previous = typeof gottmanPrev.score === 'string' ? JSON.parse(gottmanPrev.score) : gottmanPrev.score;
    const horsemen = current?.horsemen || current?.fourHorsemen;
    const prevHorsemen = previous?.horsemen || previous?.fourHorsemen;
    if (horsemen && prevHorsemen) {
      for (const h of ['criticism', 'contempt', 'defensiveness', 'stonewalling']) {
        if (horsemen[h] != null && prevHorsemen[h] != null) {
          expertInsights.push(EXPERT_INSIGHTS.horsemanProgress(h, prevHorsemen[h], horsemen[h]));
        }
      }
    }
  }

  // ── Build summary ──
  const summaryParts = [
    `**Session Prep Report — ${client.firstName} ${client.lastName || ''}**`,
    `Period: ${since.toLocaleDateString()} to ${new Date().toLocaleDateString()}`,
    '',
    `**Engagement:** ${completionRate}% daily completion | ${streak}-day streak | ${completedTasks.length} tasks completed, ${pendingTasks.length} pending`,
    `**Mood:** ${currentAvgMood > 0 ? `${currentAvgMood.toFixed(1)}/10 avg` : 'No mood data'} ${previousAvgMood > 0 ? `(was ${previousAvgMood.toFixed(1)})` : ''}`,
    `**5:1 Ratio:** ${currentRatio.toFixed(1)}:1 ${previousRatio > 0 ? `(was ${previousRatio.toFixed(1)}:1)` : ''}`,
    `**Gratitude Entries:** ${gratitudeEntries.length} since last session`,
    `**Course Progress:** ${courseProgress ? `Week ${courseProgress.currentWeek}` : 'Not enrolled'}`,
    '',
    `**Crisis Flags:** ${crisisFlags.length > 0 ? crisisFlags.map(f => `⚠️ ${f.type} (${f.severity}): ${f.message}`).join('; ') : 'None'}`,
    '',
    '**Expert Insights:**',
    ...expertInsights.map((insight, i) => `${i + 1}. ${insight}`),
  ];

  const generatedSummary = summaryParts.join('\n');

  // ── Persist the report ──
  const report = await prisma.sessionPrepReport.create({
    data: {
      therapistId,
      clientId,
      coupleId: relationship?.id || null,
      lastSessionDate: since,
      activitiesCompleted: {
        totalDays: totalDaysSince,
        daysActive: daysWithLogs,
        completionRate,
        streak,
        tasksCompleted: completedTasks.length,
        tasksPending: pendingTasks.length,
        gratitudeCount: gratitudeEntries.length,
      },
      assessmentChanges,
      moodTrends: {
        currentAvg: currentAvgMood,
        previousAvg: previousAvgMood,
        trend: currentAvgMood > previousAvgMood ? 'improving' : currentAvgMood < previousAvgMood ? 'declining' : 'stable',
        dailyMoods: recentLogs.filter(l => l.mood != null).map(l => ({ date: l.date, mood: l.mood })),
      },
      crisisFlags,
      generatedSummary,
      expertInsights,
    },
  });

  logger.info('Session prep report generated', { reportId: report.id, therapistId, clientId });

  return {
    id: report.id,
    client: { id: client.id, firstName: client.firstName, lastName: client.lastName },
    reportDate: report.reportDate,
    lastSessionDate: since,
    activitiesCompleted: report.activitiesCompleted,
    assessmentChanges: report.assessmentChanges,
    moodTrends: report.moodTrends,
    crisisFlags: report.crisisFlags,
    generatedSummary: report.generatedSummary,
    expertInsights: report.expertInsights,
    courseProgress: courseProgress
      ? { currentWeek: courseProgress.currentWeek, isActive: courseProgress.isActive }
      : null,
    pendingTasks: pendingTasks.map(t => ({
      id: t.id,
      description: t.taskDescription,
      priority: t.priority,
      dueDate: t.dueDate,
    })),
  };
}

module.exports = {
  generateSessionPrepReport,
  EXPERT_INSIGHTS,
};
