/**
 * Comprehensive Scoring Utilities for Love Rescue Assessments
 * 
 * Scores ALL 8 assessment types with rich, nuanced results.
 * Each scorer returns normalized scores, subscores, and actionable insights.
 * 
 * Mirror, not weapon — all results are framed for self-awareness and growth.
 */

const { questionBank } = require('./questionBank');

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Average an array of numbers
 */
function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * Normalize a raw score to 0-100 given a possible range
 */
function normalize(raw, min, max) {
  if (max === min) return 0;
  return Math.round(((raw - min) / (max - min)) * 100);
}

/**
 * Get percentage (0-100) from a score on a given scale
 */
function toPercent(score, scaleMax) {
  if (!scaleMax) return 0;
  return Math.round((score / scaleMax) * 100);
}

/**
 * Group questions by a key and compute average score for each group
 */
function groupScores(responses, questions, groupKey, scaleMax, handleReverse = false) {
  const groups = {};
  const counts = {};

  for (const q of questions) {
    const group = q[groupKey];
    if (!group) continue;

    const rawValue = Number(responses[q.id]);
    if (isNaN(rawValue)) continue;

    let value = rawValue;
    if (handleReverse && q.reverseScored) {
      value = (scaleMax + 1) - rawValue;
    }

    groups[group] = (groups[group] || 0) + value;
    counts[group] = (counts[group] || 0) + 1;
  }

  const result = {};
  for (const [group, total] of Object.entries(groups)) {
    const count = counts[group] || 0;
    result[group] = {
      rawTotal: total,
      count,
      average: count > 0 ? Math.round((total / count) * 100) / 100 : 0,
      percentage: count > 0 ? toPercent(total, count * scaleMax) : 0,
    };
  }

  return result;
}

/**
 * Sort object entries by value (descending) and return as sorted array of [key, value]
 */
function sortByValue(obj, key = 'percentage') {
  return Object.entries(obj)
    .sort((a, b) => b[1][key] - a[1][key]);
}


// ═══════════════════════════════════════════════════════════════
// 1. ATTACHMENT STYLE SCORING
// ═══════════════════════════════════════════════════════════════

/**
 * Score attachment style assessment
 * @param {Object} responses - { questionId: score (1-7) }
 * @returns {Object} Rich attachment profile
 */
function scoreAttachment(responses) {
  const questions = questionBank.attachment.questions;
  const scaleMax = 7;

  // Group by category
  const categoryScores = groupScores(responses, questions, 'category', scaleMax);

  // Extract percentages
  const secure = categoryScores.secure?.percentage || 0;
  const anxious = categoryScores.anxious?.percentage || 0;
  const avoidant = categoryScores.avoidant?.percentage || 0;
  const fearful = categoryScores.fearful_avoidant?.percentage || 0;

  // Compute dimensional scores (Bartholomew model)
  // Anxiety dimension = anxious + fearful_avoidant weighted
  // Avoidance dimension = avoidant + fearful_avoidant weighted
  const anxietyDimension = Math.round(anxious * 0.6 + fearful * 0.4);
  const avoidanceDimension = Math.round(avoidant * 0.6 + fearful * 0.4);

  // Determine primary style with nuance
  let style;
  let confidence;
  const scores = { secure, anxious, avoidant, fearful_avoidant: fearful };
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topScore = sorted[0][1];
  const secondScore = sorted[1][1];
  const gap = topScore - secondScore;

  style = sorted[0][0];
  
  // Confidence based on gap
  if (gap >= 20) {
    confidence = 'high';
  } else if (gap >= 10) {
    confidence = 'moderate';
  } else {
    confidence = 'low'; // Blended style
  }

  // Determine secondary style if gap is small
  const secondary = gap < 20 ? sorted[1][0] : null;

  // Growth-oriented descriptions
  const styleDescriptions = {
    secure: 'You tend to be comfortable with intimacy and interdependence. You can express your needs directly and respond to your partner\'s needs with empathy.',
    anxious: 'You deeply value closeness and connection. You may notice a heightened sensitivity to shifts in your partner\'s availability or responsiveness.',
    avoidant: 'You value your autonomy and self-reliance. You may notice a tendency to create distance when emotional intimacy increases.',
    fearful_avoidant: 'You experience a push-pull between wanting closeness and fearing it. This often comes from early experiences where connection felt both desired and unsafe.',
  };

  return {
    style,
    secondary,
    confidence,
    description: styleDescriptions[style],
    scores: {
      secure,
      anxious,
      avoidant,
      fearful_avoidant: fearful,
    },
    dimensions: {
      anxiety: anxietyDimension,
      avoidance: avoidanceDimension,
    },
    categoryDetails: categoryScores,
    // Legacy compatibility
    anxietyScore: anxietyDimension,
    avoidanceScore: avoidanceDimension,
    secureScore: secure,
  };
}


// ═══════════════════════════════════════════════════════════════
// 2. PERSONALITY TYPE SCORING
// ═══════════════════════════════════════════════════════════════

/**
 * Score personality (MBTI-style) assessment
 * @param {Object} responses - { questionId: score (1-7) }
 * @returns {Object} Rich personality profile
 */
function scorePersonality(responses) {
  const questions = questionBank.personality.questions;
  const scaleMax = 7;

  // Accumulate scores per direction
  const directionTotals = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
  const directionCounts = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };

  for (const q of questions) {
    const value = Number(responses[q.id]);
    if (isNaN(value)) continue;
    directionTotals[q.direction] += value;
    directionCounts[q.direction] += 1;
  }

  // Calculate preference percentages for each dimension
  function dimensionScore(a, b) {
    const totalA = directionTotals[a] || 0;
    const totalB = directionTotals[b] || 0;
    const maxA = Math.max((directionCounts[a] || 0) * scaleMax, 1);
    const maxB = Math.max((directionCounts[b] || 0) * scaleMax, 1);
    const pctA = (totalA / maxA) * 100;
    const pctB = (totalB / maxB) * 100;
    const total = pctA + pctB;
    // Normalize so they sum to 100
    const normA = total > 0 ? Math.round((pctA / total) * 100) : 50;
    const normB = total > 0 ? Math.round((pctB / total) * 100) : 50;
    const preference = normA >= normB ? a : b;
    const clarity = Math.abs(normA - normB);

    return {
      [a]: normA,
      [b]: normB,
      preference,
      clarity,
      clarityLabel: clarity >= 30 ? 'clear' : clarity >= 10 ? 'moderate' : 'slight',
    };
  }

  const EI = dimensionScore('E', 'I');
  const SN = dimensionScore('S', 'N');
  const TF = dimensionScore('T', 'F');
  const JP = dimensionScore('J', 'P');

  const type = EI.preference + SN.preference + TF.preference + JP.preference;

  const descriptions = {
    'INTJ': 'The Architect — Strategic, independent, and driven by their inner vision. Values competence and long-term planning.',
    'INTP': 'The Logician — Innovative and curious, lives in the world of ideas. Values truth and theoretical understanding.',
    'ENTJ': 'The Commander — Decisive and organized, natural-born leader. Values efficiency and strategic direction.',
    'ENTP': 'The Debater — Quick-witted and resourceful, loves intellectual sparring. Values innovation and possibility.',
    'INFJ': 'The Advocate — Insightful and principled, driven by deep values. Values meaning and authentic connection.',
    'INFP': 'The Mediator — Idealistic and empathetic, guided by inner values. Values authenticity and emotional depth.',
    'ENFJ': 'The Protagonist — Charismatic and empathetic, inspires growth in others. Values harmony and human potential.',
    'ENFP': 'The Campaigner — Enthusiastic and creative, sees possibilities everywhere. Values freedom and genuine connection.',
    'ISTJ': 'The Logistician — Reliable and thorough, values tradition and duty. Brings stability and follow-through.',
    'ISFJ': 'The Defender — Warm and dedicated, deeply loyal. Values security and caring for others.',
    'ESTJ': 'The Executive — Organized and decisive, values order and community. Brings structure and reliability.',
    'ESFJ': 'The Consul — Caring and sociable, values harmony and cooperation. Brings warmth and practical support.',
    'ISTP': 'The Virtuoso — Practical and observant, calm under pressure. Values hands-on problem-solving and autonomy.',
    'ISFP': 'The Adventurer — Gentle and sensitive, with a keen aesthetic sense. Values freedom and living authentically.',
    'ESTP': 'The Entrepreneur — Energetic and perceptive, lives in the moment. Values action and tangible results.',
    'ESFP': 'The Entertainer — Spontaneous and enthusiastic, brings joy. Values experiences and genuine human connection.',
  };

  return {
    type,
    description: descriptions[type] || 'A unique combination of personality preferences.',
    dimensions: { EI, SN, TF, JP },
    clarityProfile: {
      EI: EI.clarityLabel,
      SN: SN.clarityLabel,
      TF: TF.clarityLabel,
      JP: JP.clarityLabel,
    },
    // Relationship implications
    relationshipStyle: {
      communication: TF.preference === 'F' ? 'emotion-first' : 'logic-first',
      planning: JP.preference === 'J' ? 'structured' : 'flexible',
      energy: EI.preference === 'E' ? 'externally-energized' : 'internally-energized',
      perception: SN.preference === 'S' ? 'detail-oriented' : 'big-picture',
    },
  };
}


// ═══════════════════════════════════════════════════════════════
// 3. LOVE LANGUAGE SCORING
// ═══════════════════════════════════════════════════════════════

/**
 * Score love language forced-choice assessment
 * @param {Object} responses - { questionId: 'A' | 'B' }
 * @returns {Object} Love language profile
 */
function scoreLoveLanguage(responses) {
  const questions = questionBank.love_language.questions;

  const tallies = {
    words_of_affirmation: 0,
    acts_of_service: 0,
    receiving_gifts: 0,
    quality_time: 0,
    physical_touch: 0,
  };

  let totalAnswered = 0;

  for (const q of questions) {
    const choice = responses[q.id];
    if (choice === 'A') {
      tallies[q.optionA.language]++;
      totalAnswered++;
    } else if (choice === 'B') {
      tallies[q.optionB.language]++;
      totalAnswered++;
    }
  }

  // Convert to percentages
  const allScores = {};
  for (const [lang, count] of Object.entries(tallies)) {
    allScores[lang] = {
      count,
      percentage: totalAnswered > 0 ? Math.round((count / totalAnswered) * 100) : 0,
    };
  }

  // Sort to find primary and secondary
  const sorted = Object.entries(allScores).sort((a, b) => b[1].count - a[1].count);
  const primary = sorted[0][0];
  const secondary = sorted[1][0];

  const languageLabels = {
    words_of_affirmation: 'Words of Affirmation',
    acts_of_service: 'Acts of Service',
    receiving_gifts: 'Receiving Gifts',
    quality_time: 'Quality Time',
    physical_touch: 'Physical Touch',
  };

  const languageDescriptions = {
    words_of_affirmation: 'You feel most loved through verbal expressions — compliments, encouragement, "I love you," and words that affirm your value.',
    acts_of_service: 'You feel most loved when someone takes action to ease your burden — helping, fixing, doing things that show they care through effort.',
    receiving_gifts: 'You feel most loved through thoughtful gifts and symbols — it\'s not about materialism, but about the thought and intentionality behind the gesture.',
    quality_time: 'You feel most loved through focused, undivided attention — being truly present, sharing experiences, and deep conversation.',
    physical_touch: 'You feel most loved through physical closeness — hugs, holding hands, touch that communicates warmth and safety.',
  };

  return {
    primary,
    primaryLabel: languageLabels[primary],
    primaryDescription: languageDescriptions[primary],
    secondary,
    secondaryLabel: languageLabels[secondary],
    allScores,
    ranking: sorted.map(([lang, data]) => ({
      language: lang,
      label: languageLabels[lang],
      ...data,
    })),
  };
}


// ═══════════════════════════════════════════════════════════════
// 4. HUMAN NEEDS SCORING
// ═══════════════════════════════════════════════════════════════

/**
 * Score human needs assessment
 * @param {Object} responses - { questionId: score (1-7) }
 * @returns {Object} Human needs profile
 */
function scoreHumanNeeds(responses) {
  const questions = questionBank.human_needs.questions;
  const scaleMax = 7;

  const needScores = groupScores(responses, questions, 'need', scaleMax);

  const sorted = sortByValue(needScores);
  const topTwo = sorted.slice(0, 2).map(([need]) => need);

  const needLabels = {
    certainty: 'Certainty / Security',
    variety: 'Variety / Excitement',
    significance: 'Significance / Recognition',
    connection: 'Connection / Love',
    growth: 'Growth / Learning',
    contribution: 'Contribution / Giving',
  };

  const needDescriptions = {
    certainty: 'Your core driver is stability and predictability. You seek security in your relationship and feel most grounded when you know what to expect.',
    variety: 'Your core driver is novelty and excitement. You need change, surprise, and new experiences to feel alive in your relationship.',
    significance: 'Your core driver is feeling uniquely valued. You need to feel important, seen, and recognized for who you are and what you bring.',
    connection: 'Your core driver is deep emotional bonding. You need intimacy, closeness, and the feeling of being truly known and loved.',
    growth: 'Your core driver is evolution and self-improvement. You need to feel that both you and your relationship are continuously developing.',
    contribution: 'Your core driver is making a meaningful difference. You feel most fulfilled when you\'re giving, serving, and adding value to others\' lives.',
  };

  // Determine profile type based on top two needs
  // Robbins: first 4 are "needs of the personality," last 2 are "needs of the spirit"
  const personalityNeeds = ['certainty', 'variety', 'significance', 'connection'];
  const spiritNeeds = ['growth', 'contribution'];
  const topTwoInSpirit = topTwo.filter(n => spiritNeeds.includes(n)).length;

  let profile;
  if (topTwoInSpirit === 2) {
    profile = 'spirit-driven';
  } else if (topTwoInSpirit === 1) {
    profile = 'balanced';
  } else {
    profile = 'personality-driven';
  }

  const allNeeds = {};
  for (const [need, data] of Object.entries(needScores)) {
    allNeeds[need] = {
      ...data,
      label: needLabels[need],
    };
  }

  return {
    topTwo,
    topTwoLabels: topTwo.map(n => needLabels[n]),
    topTwoDescriptions: topTwo.map(n => needDescriptions[n]),
    profile,
    profileDescription: profile === 'spirit-driven'
      ? 'Your top needs are growth-oriented — you\'re driven by becoming more and giving more. This often creates deep fulfillment.'
      : profile === 'balanced'
        ? 'You have a blend of personal and growth-oriented needs. This balance can drive both stability and evolution.'
        : 'Your top needs are personality-based — focused on security, excitement, belonging, or recognition. Understanding this helps you meet these needs consciously.',
    allNeeds,
    ranking: sorted.map(([need, data]) => ({
      need,
      label: needLabels[need],
      ...data,
    })),
  };
}


// ═══════════════════════════════════════════════════════════════
// 5. GOTTMAN CHECKUP SCORING
// ═══════════════════════════════════════════════════════════════

/**
 * Score Gottman relationship checkup
 * @param {Object} responses - { questionId: score (1-5) }
 * @returns {Object} Gottman relationship health profile
 */
function scoreGottmanCheckup(responses) {
  const questions = questionBank.gottman_checkup.questions;
  const scaleMax = 7;

  // Separate horsemen questions from strength questions
  const horsemenQuestions = questions.filter(q => q.category === 'four_horsemen');
  const strengthQuestions = questions.filter(q => q.category !== 'four_horsemen');

  // Score horsemen (higher = more problematic)
  const horsemenByType = groupScores(responses, horsemenQuestions, 'subcategory', scaleMax);

  // Score positive dimensions (higher = healthier)
  const strengthsByType = groupScores(responses, strengthQuestions, 'category', scaleMax);

  // Overall horsemen severity (0-100, lower is better)
  const horsemenValues = Object.values(horsemenByType).map(h => h.percentage);
  const horsemenSeverity = horsemenValues.length > 0 ? Math.round(avg(horsemenValues)) : 0;

  // Overall strengths (0-100, higher is better)
  const strengthValues = Object.values(strengthsByType).map(s => s.percentage);
  const strengthScore = strengthValues.length > 0 ? Math.round(avg(strengthValues)) : 0;

  // Overall health: strengths minus horsemen impact
  const overallHealth = Math.max(0, Math.min(100,
    Math.round(strengthScore * 0.6 + (100 - horsemenSeverity) * 0.4)
  ));

  // Identify specific areas
  const horsemenLabels = {
    criticism: 'Criticism — Attacking your partner\'s character instead of addressing specific behavior.',
    contempt: 'Contempt — Expressing superiority or disrespect (the #1 predictor of divorce per Gottman).',
    defensiveness: 'Defensiveness — Deflecting responsibility rather than owning your part.',
    stonewalling: 'Stonewalling — Withdrawing and shutting down during conflict.',
  };

  const strengthLabels = {
    turning_toward: 'Turning Toward — Responding to your partner\'s bids for connection.',
    fondness_admiration: 'Fondness & Admiration — Maintaining respect and appreciation.',
    love_maps: 'Love Maps — Knowing your partner\'s inner world deeply.',
    shared_meaning: 'Shared Meaning — Having a shared sense of purpose and rituals.',
    repair_attempts: 'Repair Attempts — Ability to de-escalate and reconnect after conflict.',
  };

  // Find most concerning horseman
  const sortedHorsemen = Object.entries(horsemenByType).sort((a, b) => b[1].percentage - a[1].percentage);
  const topHorseman = sortedHorsemen[0]?.[0] || null;

  // Find strongest strength
  const sortedStrengths = Object.entries(strengthsByType).sort((a, b) => b[1].percentage - a[1].percentage);
  const topStrength = sortedStrengths[0]?.[0] || null;

  // Find areas needing attention (lowest strengths)
  const areasForGrowth = sortedStrengths
    .filter(([_, data]) => data.percentage < 60)
    .map(([cat]) => cat);

  // Health level
  let healthLevel;
  if (overallHealth >= 80) healthLevel = 'thriving';
  else if (overallHealth >= 60) healthLevel = 'healthy';
  else if (overallHealth >= 40) healthLevel = 'struggling';
  else healthLevel = 'critical';

  return {
    overallHealth,
    healthLevel,
    horsemen: {
      severity: horsemenSeverity,
      byType: horsemenByType,
      mostConcerning: topHorseman,
      mostConcerningLabel: topHorseman ? horsemenLabels[topHorseman] : null,
      labels: horsemenLabels,
    },
    strengths: {
      score: strengthScore,
      byType: strengthsByType,
      topStrength,
      topStrengthLabel: topStrength ? strengthLabels[topStrength] : null,
      labels: strengthLabels,
    },
    areas: areasForGrowth,
    // Gottman ratio approximation (positive to negative interactions)
    estimatedRatio: horsemenSeverity > 0
      ? Math.round((strengthScore / horsemenSeverity) * 100) / 100
      : strengthScore > 0 ? Infinity : 0,
  };
}


// ═══════════════════════════════════════════════════════════════
// 6. EMOTIONAL INTELLIGENCE SCORING
// ═══════════════════════════════════════════════════════════════

/**
 * Score emotional intelligence assessment
 * @param {Object} responses - { questionId: score (1-7) }
 * @returns {Object} EQ profile
 */
function scoreEmotionalIntelligence(responses) {
  const questions = questionBank.emotional_intelligence.questions;
  const scaleMax = 7;

  const categoryScores = groupScores(responses, questions, 'category', scaleMax);

  // Overall EQ score
  const allPercentages = Object.values(categoryScores).map(c => c.percentage);
  const overall = allPercentages.length > 0 ? Math.round(avg(allPercentages)) : 0;

  // Level
  let level;
  if (overall >= 80) level = 'exceptional';
  else if (overall >= 65) level = 'strong';
  else if (overall >= 50) level = 'developing';
  else if (overall >= 35) level = 'emerging';
  else level = 'foundational';

  const categoryLabels = {
    self_awareness: 'Self-Awareness — Knowing what you feel and why.',
    self_regulation: 'Self-Regulation — Managing your emotions rather than being managed by them.',
    motivation: 'Motivation — Inner drive that goes beyond external rewards.',
    empathy: 'Empathy — Sensing and understanding others\' emotions.',
    social_skills: 'Social Skills — Navigating relationships with grace and effectiveness.',
  };

  const sorted = sortByValue(categoryScores);
  const strengths = sorted.filter(([_, data]) => data.percentage >= 65).map(([cat]) => cat);
  const growth = sorted.filter(([_, data]) => data.percentage < 50).map(([cat]) => cat);

  const subscores = {};
  for (const [cat, data] of Object.entries(categoryScores)) {
    subscores[cat] = {
      ...data,
      label: categoryLabels[cat],
    };
  }

  return {
    overall,
    level,
    subscores,
    strengths,
    strengthLabels: strengths.map(s => categoryLabels[s]),
    growth,
    growthLabels: growth.map(g => categoryLabels[g]),
    ranking: sorted.map(([cat, data]) => ({
      category: cat,
      label: categoryLabels[cat],
      ...data,
    })),
  };
}


// ═══════════════════════════════════════════════════════════════
// 7. CONFLICT STYLE SCORING
// ═══════════════════════════════════════════════════════════════

/**
 * Score conflict style assessment
 * @param {Object} responses - { questionId: score (1-7) }
 * @returns {Object} Conflict style profile
 */
function scoreConflictStyle(responses) {
  const questions = questionBank.conflict_style.questions;
  const scaleMax = 7;

  const styleScores = groupScores(responses, questions, 'style', scaleMax);

  const sorted = sortByValue(styleScores);
  const primary = sorted[0]?.[0] || 'collaborating';
  const secondary = sorted[1]?.[0] || 'compromising';

  const styleLabels = {
    competing: 'Competing — Assertive and uncooperative. Pursuing your own concerns at the other\'s expense.',
    collaborating: 'Collaborating — Assertive and cooperative. Working together to find a solution that fully satisfies both.',
    compromising: 'Compromising — Moderate assertiveness and cooperativeness. Finding a mutually acceptable middle ground.',
    avoiding: 'Avoiding — Unassertive and uncooperative. Sidestepping or postponing the conflict.',
    accommodating: 'Accommodating — Unassertive and cooperative. Neglecting your own concerns to satisfy the other.',
  };

  const styleInsights = {
    competing: 'You tend to advocate strongly for your position. This can be effective when quick decisions are needed but may damage trust if overused.',
    collaborating: 'You seek win-win solutions and value both your needs and your partner\'s. This is often the healthiest approach for important issues.',
    compromising: 'You look for practical middle ground. This works well for moderate issues but may leave deeper needs unaddressed.',
    avoiding: 'You tend to sidestep conflict. While this can be wise for trivial issues, important matters may fester unresolved.',
    accommodating: 'You prioritize your partner\'s needs over your own. This shows generosity but can lead to resentment if your needs go unmet.',
  };

  // Assertiveness vs Cooperativeness dimensions
  const assertivenessWeights = { competing: 1.0, collaborating: 0.7, compromising: 0.5, avoiding: 0.0, accommodating: 0.0 };
  const cooperativenessWeights = { competing: 0.0, collaborating: 1.0, compromising: 0.5, avoiding: 0.0, accommodating: 1.0 };

  let assertiveness = 0;
  let cooperativeness = 0;
  let totalWeight = 0;

  for (const [style, data] of Object.entries(styleScores)) {
    const weight = data.percentage / 100;
    assertiveness += assertivenessWeights[style] * weight;
    cooperativeness += cooperativenessWeights[style] * weight;
    totalWeight += weight;
  }

  if (totalWeight > 0) {
    assertiveness = Math.round((assertiveness / totalWeight) * 100);
    cooperativeness = Math.round((cooperativeness / totalWeight) * 100);
  }

  const allStyles = {};
  for (const [style, data] of Object.entries(styleScores)) {
    allStyles[style] = {
      ...data,
      label: styleLabels[style],
    };
  }

  return {
    primary,
    primaryLabel: styleLabels[primary],
    primaryInsight: styleInsights[primary],
    secondary,
    secondaryLabel: styleLabels[secondary],
    allStyles,
    dimensions: {
      assertiveness,
      cooperativeness,
    },
    ranking: sorted.map(([style, data]) => ({
      style,
      label: styleLabels[style],
      insight: styleInsights[style],
      ...data,
    })),
  };
}


// ═══════════════════════════════════════════════════════════════
// 8. DIFFERENTIATION OF SELF SCORING
// ═══════════════════════════════════════════════════════════════

/**
 * Score differentiation of self assessment
 * @param {Object} responses - { questionId: score (1-7) }
 * @returns {Object} Differentiation profile
 */
function scoreDifferentiation(responses) {
  const questions = questionBank.differentiation.questions;
  const scaleMax = 7;

  // Group scores, handling reverse scoring
  // reverseScored = true means higher raw score = LESS differentiated
  // We want final scores where higher = MORE differentiated
  const categoryScores = groupScores(responses, questions, 'category', scaleMax, true);

  const sorted = sortByValue(categoryScores);

  // Overall differentiation level
  const allPercentages = Object.values(categoryScores).map(c => c.percentage);
  const overallLevel = allPercentages.length > 0 ? Math.round(avg(allPercentages)) : 0;

  let level;
  if (overallLevel >= 75) level = 'well-differentiated';
  else if (overallLevel >= 55) level = 'moderately-differentiated';
  else if (overallLevel >= 35) level = 'low-differentiation';
  else level = 'undifferentiated';

  const categoryLabels = {
    emotional_reactivity: 'Emotional Reactivity — How much others\' emotions control your own state.',
    i_position: 'I-Position — Ability to hold your own beliefs and values under pressure.',
    emotional_cutoff: 'Emotional Cutoff — Tendency to distance or sever rather than engage.',
    fusion: 'Fusion — Tendency to merge your identity with your partner\'s.',
  };

  const categoryInsights = {
    emotional_reactivity: 'Lower reactivity means you can stay grounded in emotional storms. Growth edge: practice self-soothing and pausing before responding.',
    i_position: 'A strong I-position means you can be both connected AND autonomous. Growth edge: express your truth even when it differs from your partner\'s.',
    emotional_cutoff: 'Low cutoff means you stay engaged rather than fleeing from difficult feelings. Growth edge: practice staying present even when vulnerabilities are exposed.',
    fusion: 'Low fusion means you maintain a clear sense of self. Growth edge: notice when you\'re abandoning yourself to maintain the relationship.',
  };

  // Find growth edges (lowest differentiation areas)
  const growthEdges = sorted
    .slice()
    .reverse()
    .filter(([_, data]) => data.percentage < 50)
    .map(([cat]) => cat);

  const subscores = {};
  for (const [cat, data] of Object.entries(categoryScores)) {
    subscores[cat] = {
      ...data,
      label: categoryLabels[cat],
      insight: categoryInsights[cat],
    };
  }

  return {
    level,
    overallScore: overallLevel,
    levelDescription: level === 'well-differentiated'
      ? 'You maintain a solid sense of self while staying emotionally connected. You can tolerate differences and manage your own emotions effectively.'
      : level === 'moderately-differentiated'
        ? 'You have a developing sense of self but may sometimes lose yourself in relationships or react strongly to your partner\'s emotions.'
        : level === 'low-differentiation'
          ? 'You may frequently merge with your partner or react intensely to their emotions. Growth in this area can transform your relationship.'
          : 'You likely struggle significantly with maintaining your own identity in relationships. This is a powerful growth area with enormous potential.',
    subscores,
    growthEdges,
    growthEdgeLabels: growthEdges.map(e => categoryLabels[e]),
    growthEdgeInsights: growthEdges.map(e => categoryInsights[e]),
    ranking: sorted.map(([cat, data]) => ({
      category: cat,
      label: categoryLabels[cat],
      insight: categoryInsights[cat],
      ...data,
    })),
  };
}


// ═══════════════════════════════════════════════════════════════
// 9. HORMONAL HEALTH SCORING
// ═══════════════════════════════════════════════════════════════

/**
 * Score hormonal health wellness screener
 * Higher agreement = more symptoms = more concern in that area
 * @param {Object} responses - { questionId: score (1-7) }
 * @returns {Object} Hormonal health profile
 */
function scoreHormonalHealth(responses) {
  const questions = questionBank.hormonal_health.questions;
  const scaleMax = 7;

  const categoryScores = groupScores(responses, questions, 'category', scaleMax);

  const sorted = sortByValue(categoryScores);

  // Overall symptom load (higher = more symptomatic)
  const allPercentages = Object.values(categoryScores).map(c => c.percentage);
  const overallSymptomLoad = allPercentages.length > 0 ? Math.round(avg(allPercentages)) : 0;

  // Level
  let level;
  if (overallSymptomLoad >= 70) level = 'high_concern';
  else if (overallSymptomLoad >= 50) level = 'moderate_concern';
  else if (overallSymptomLoad >= 30) level = 'mild_symptoms';
  else level = 'low_symptoms';

  const categoryLabels = {
    testosterone_symptoms: 'Testosterone-Related Symptoms',
    estrogen_progesterone: 'Estrogen/Progesterone-Related Symptoms',
    cortisol_stress: 'Cortisol/Stress-Related Symptoms',
    thyroid_energy: 'Thyroid/Energy-Related Symptoms',
    libido_drive: 'Libido & Drive Symptoms',
  };

  // Areas of most concern (highest symptom severity)
  const areasOfConcern = sorted.filter(([_, data]) => data.percentage >= 50).map(([cat]) => cat);
  const strengths = sorted.slice().reverse().filter(([_, data]) => data.percentage < 35).map(([cat]) => cat);

  const subscores = {};
  for (const [cat, data] of Object.entries(categoryScores)) {
    subscores[cat] = {
      ...data,
      label: categoryLabels[cat],
    };
  }

  return {
    overallSymptomLoad,
    overall: overallSymptomLoad,
    level,
    subscores,
    areasOfConcern,
    areasOfConcernLabels: areasOfConcern.map(a => categoryLabels[a]),
    strengths,
    strengthLabels: strengths.map(s => categoryLabels[s]),
    ranking: sorted.map(([cat, data]) => ({
      category: cat,
      label: categoryLabels[cat],
      ...data,
    })),
  };
}


// ═══════════════════════════════════════════════════════════════
// 10. PHYSICAL VITALITY SCORING
// ═══════════════════════════════════════════════════════════════

/**
 * Score physical vitality assessment
 * Higher agreement = better vitality in that area
 * @param {Object} responses - { questionId: score (1-7) }
 * @returns {Object} Physical vitality profile
 */
function scorePhysicalVitality(responses) {
  const questions = questionBank.physical_vitality.questions;
  const scaleMax = 7;

  const categoryScores = groupScores(responses, questions, 'category', scaleMax);

  const sorted = sortByValue(categoryScores);

  // Overall vitality score (higher = better)
  const allPercentages = Object.values(categoryScores).map(c => c.percentage);
  const overallVitality = allPercentages.length > 0 ? Math.round(avg(allPercentages)) : 0;

  // Level
  let level;
  if (overallVitality >= 80) level = 'thriving';
  else if (overallVitality >= 65) level = 'strong';
  else if (overallVitality >= 50) level = 'developing';
  else if (overallVitality >= 35) level = 'struggling';
  else level = 'critical';

  const categoryLabels = {
    fitness_activity: 'Fitness & Activity',
    weight_body_composition: 'Weight & Body Confidence',
    nutrition_diet: 'Nutrition & Diet',
    sleep_recovery: 'Sleep & Recovery',
    energy_stamina: 'Energy & Stamina',
  };

  const strengths = sorted.filter(([_, data]) => data.percentage >= 65).map(([cat]) => cat);
  const growth = sorted.slice().reverse().filter(([_, data]) => data.percentage < 50).map(([cat]) => cat);

  const subscores = {};
  for (const [cat, data] of Object.entries(categoryScores)) {
    subscores[cat] = {
      ...data,
      label: categoryLabels[cat],
    };
  }

  return {
    overall: overallVitality,
    level,
    subscores,
    strengths,
    strengthLabels: strengths.map(s => categoryLabels[s]),
    growth,
    growthLabels: growth.map(g => categoryLabels[g]),
    ranking: sorted.map(([cat, data]) => ({
      category: cat,
      label: categoryLabels[cat],
      ...data,
    })),
  };
}


// ═══════════════════════════════════════════════════════════════
// LEGACY / COMPATIBILITY SCORERS
// ═══════════════════════════════════════════════════════════════

/**
 * Score wellness behavior assessment (legacy)
 * @param {Object} responses - { questionId: score (1-5) }
 * @returns {Object} - { score: number (0-100), level: string }
 */
function scoreWellnessBehavior(responses) {
  const positiveQuestions = [1, 4, 6, 8, 10];
  const negativeQuestions = [2, 3, 5, 7, 9];

  let totalScore = 0;
  let maxPossible = 0;

  for (const [qId, value] of Object.entries(responses)) {
    const id = parseInt(qId);
    const score = parseInt(value);

    if (positiveQuestions.includes(id)) {
      totalScore += score;
      maxPossible += 5;
    } else if (negativeQuestions.includes(id)) {
      totalScore += (6 - score);
      maxPossible += 5;
    }
  }

  const normalizedScore = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;

  let level;
  if (normalizedScore >= 70) level = 'high';
  else if (normalizedScore >= 40) level = 'medium';
  else level = 'low';

  return {
    score: normalizedScore,
    level,
    rawScore: totalScore,
    maxScore: maxPossible,
  };
}

/**
 * Score negative patterns and closeness assessment (legacy)
 * @param {Object} responses - { questionId: score (1-5) }
 * @returns {Object} - { patterns: Object, closeness: number }
 */
function scoreNegativePatterns(responses) {
  const patternMapping = {
    1: 'criticism', 2: 'defensiveness', 3: 'disrespect', 4: 'withdrawal',
    5: 'closeness', 6: 'closeness', 7: 'disrespect', 8: 'defensiveness',
    9: 'criticism', 10: 'withdrawal', 11: 'closeness', 12: 'closeness',
    13: 'disrespect', 14: 'defensiveness', 15: 'closeness',
  };

  const patterns = { criticism: 0, defensiveness: 0, disrespect: 0, withdrawal: 0 };
  const patternCounts = { criticism: 0, defensiveness: 0, disrespect: 0, withdrawal: 0 };
  let closenessTotal = 0;
  let closenessCount = 0;

  for (const [qId, value] of Object.entries(responses)) {
    const id = parseInt(qId);
    const score = parseInt(value);
    const pattern = patternMapping[id];

    if (pattern === 'closeness') {
      closenessTotal += score;
      closenessCount++;
    } else if (pattern) {
      patterns[pattern] += score;
      patternCounts[pattern]++;
    }
  }

  for (const p of Object.keys(patterns)) {
    if (patternCounts[p] > 0) {
      patterns[p] = Math.round((patterns[p] / (patternCounts[p] * 5)) * 100);
    }
  }

  const closeness = closenessCount > 0
    ? Math.round((closenessTotal / (closenessCount * 5)) * 100)
    : 50;

  return {
    patterns,
    closeness,
    overallRisk: Math.round(
      (patterns.criticism + patterns.defensiveness + patterns.disrespect + patterns.withdrawal) / 4
    ),
  };
}


// ═══════════════════════════════════════════════════════════════
// MATCHUP / COMPATIBILITY SCORING
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate comprehensive matchup score between two users
 * Expanded to include all 8 assessment types
 * @param {Array} user1Assessments - Array of user1's assessment results
 * @param {Array} user2Assessments - Array of user2's assessment results
 * @returns {Object} Comprehensive compatibility analysis
 */
function calculateMatchupScore(user1Assessments, user2Assessments) {
  const alignments = [];
  const misses = [];
  let totalPoints = 0;
  let maxPoints = 0;
  const details = {};

  // Convert to maps by type
  const u1 = {};
  const u2 = {};
  for (const a of user1Assessments) u1[a.type] = a.score;
  for (const a of user2Assessments) u2[a.type] = a.score;

  // --- ATTACHMENT (20 points) ---
  maxPoints += 20;
  if (u1.attachment && u2.attachment) {
    const s1 = u1.attachment.style;
    const s2 = u2.attachment.style;

    if (s1 === 'secure' && s2 === 'secure') {
      totalPoints += 20;
      alignments.push({ area: 'attachment', note: 'Both have secure attachment styles — strong foundation for safety and trust.' });
    } else if (s1 === 'secure' || s2 === 'secure') {
      totalPoints += 14;
      alignments.push({ area: 'attachment', note: 'One partner has a secure base — this can help the other grow toward security.' });
    } else if (
      (s1 === 'anxious' && s2 === 'avoidant') ||
      (s1 === 'avoidant' && s2 === 'anxious')
    ) {
      totalPoints += 4;
      misses.push({ area: 'attachment', note: 'Anxious-avoidant pairing: the "pursuit-withdrawal" dynamic. Awareness is the first step to breaking the cycle.' });
    } else {
      totalPoints += 8;
    }
    details.attachment = { style1: s1, style2: s2 };
  }

  // --- PERSONALITY (15 points) ---
  maxPoints += 15;
  if (u1.personality && u2.personality) {
    const t1 = u1.personality.type;
    const t2 = u2.personality.type;

    let matches = 0;
    for (let i = 0; i < Math.min(t1.length, t2.length, 4); i++) {
      if (t1[i] === t2[i]) matches++;
    }

    // Some differences are complementary (T/F can be great when one leads with head and other with heart)
    const complementaryBonus =
      (t1[2] !== t2[2]) ? 2 : 0; // T/F difference is often complementary

    const points = Math.min(15, Math.round(((matches / 4) * 12) + complementaryBonus));
    totalPoints += points;

    if (matches >= 3) {
      alignments.push({ area: 'personality', note: `Strong personality alignment (${matches}/4 dimensions match). You naturally understand each other's approach.` });
    } else if (matches <= 1) {
      misses.push({ area: 'personality', note: 'Very different personality styles — requires patience and understanding of each other\'s wiring.' });
    }
    details.personality = { type1: t1, type2: t2, matches };
  }

  // --- LOVE LANGUAGE (15 points) ---
  maxPoints += 15;
  if (u1.love_language && u2.love_language) {
    const p1 = u1.love_language.primary;
    const p2 = u2.love_language.primary;
    const s1 = u1.love_language.secondary;
    const s2 = u2.love_language.secondary;

    if (p1 === p2) {
      totalPoints += 15;
      alignments.push({ area: 'love_language', note: 'You share the same primary love language — you naturally speak each other\'s dialect of love.' });
    } else if (p1 === s2 || p2 === s1) {
      totalPoints += 10;
      alignments.push({ area: 'love_language', note: 'Your primary love language is your partner\'s secondary — with awareness, you can meet each other well.' });
    } else {
      totalPoints += 5;
      misses.push({ area: 'love_language', note: 'Different primary love languages — learning to "translate" is key. Speak their language, not yours.' });
    }
    details.love_language = { primary1: p1, primary2: p2 };
  }

  // --- HUMAN NEEDS (10 points) ---
  maxPoints += 10;
  if (u1.human_needs && u2.human_needs) {
    const top1 = u1.human_needs.topTwo || [];
    const top2 = u2.human_needs.topTwo || [];
    const overlap = top1.filter(n => top2.includes(n)).length;

    if (overlap === 2) {
      totalPoints += 10;
      alignments.push({ area: 'human_needs', note: 'Your top two driving needs match — you\'re motivated by the same things.' });
    } else if (overlap === 1) {
      totalPoints += 7;
      alignments.push({ area: 'human_needs', note: 'You share one top driving need — this gives you common ground.' });
    } else {
      // Check for complementary needs (certainty + variety, significance + connection)
      const complementary = (
        (top1.includes('certainty') && top2.includes('variety')) ||
        (top1.includes('variety') && top2.includes('certainty')) ||
        (top1.includes('significance') && top2.includes('connection')) ||
        (top1.includes('connection') && top2.includes('significance'))
      );
      totalPoints += complementary ? 5 : 3;
      if (!complementary) {
        misses.push({ area: 'human_needs', note: 'Different core needs — understanding what drives each other is essential.' });
      }
    }
    details.human_needs = { topTwo1: top1, topTwo2: top2 };
  }

  // --- GOTTMAN CHECKUP (15 points) ---
  maxPoints += 15;
  if (u1.gottman_checkup && u2.gottman_checkup) {
    const h1 = u1.gottman_checkup.overallHealth || 0;
    const h2 = u2.gottman_checkup.overallHealth || 0;
    const avgHealth = (h1 + h2) / 2;

    if (avgHealth >= 70) {
      totalPoints += 15;
      alignments.push({ area: 'gottman', note: 'Both partners show healthy relationship patterns — strong Gottman indicators.' });
    } else if (avgHealth >= 50) {
      totalPoints += 10;
    } else {
      totalPoints += 3;
      misses.push({ area: 'gottman', note: 'Some concerning relationship patterns detected — the Four Horsemen may be present.' });
    }
    details.gottman = { health1: h1, health2: h2 };
  }

  // --- EMOTIONAL INTELLIGENCE (10 points) ---
  maxPoints += 10;
  if (u1.emotional_intelligence && u2.emotional_intelligence) {
    const eq1 = u1.emotional_intelligence.overall || 0;
    const eq2 = u2.emotional_intelligence.overall || 0;
    const avgEQ = (eq1 + eq2) / 2;

    if (avgEQ >= 65) {
      totalPoints += 10;
      alignments.push({ area: 'emotional_intelligence', note: 'High combined emotional intelligence — you have the tools to navigate challenges well.' });
    } else if (avgEQ >= 45) {
      totalPoints += 6;
    } else {
      totalPoints += 2;
      misses.push({ area: 'emotional_intelligence', note: 'Emotional intelligence is a growth area — investing here will transform your relationship.' });
    }
    details.emotional_intelligence = { eq1, eq2 };
  }

  // --- CONFLICT STYLE (10 points) ---
  maxPoints += 10;
  if (u1.conflict_style && u2.conflict_style) {
    const cs1 = u1.conflict_style.primary;
    const cs2 = u2.conflict_style.primary;

    const healthyStyles = ['collaborating', 'compromising'];
    const bothHealthy = healthyStyles.includes(cs1) && healthyStyles.includes(cs2);
    const oneHealthy = healthyStyles.includes(cs1) || healthyStyles.includes(cs2);
    const toxicPair = (
      (cs1 === 'competing' && cs2 === 'avoiding') ||
      (cs1 === 'avoiding' && cs2 === 'competing') ||
      (cs1 === 'competing' && cs2 === 'accommodating') ||
      (cs1 === 'accommodating' && cs2 === 'competing')
    );

    if (bothHealthy) {
      totalPoints += 10;
      alignments.push({ area: 'conflict', note: 'Both approach conflict constructively — you can work through disagreements together.' });
    } else if (toxicPair) {
      totalPoints += 2;
      misses.push({ area: 'conflict', note: `${cs1}-${cs2} conflict pairing can create power imbalances. Both need to move toward collaboration.` });
    } else if (oneHealthy) {
      totalPoints += 6;
    } else {
      totalPoints += 4;
    }
    details.conflict_style = { style1: cs1, style2: cs2 };
  }

  // --- DIFFERENTIATION (5 points) ---
  maxPoints += 5;
  if (u1.differentiation && u2.differentiation) {
    const d1 = u1.differentiation.overallScore || 0;
    const d2 = u2.differentiation.overallScore || 0;
    const avgDiff = (d1 + d2) / 2;

    if (avgDiff >= 65) {
      totalPoints += 5;
      alignments.push({ area: 'differentiation', note: 'Both partners maintain a solid sense of self — the foundation for mature love.' });
    } else if (avgDiff >= 45) {
      totalPoints += 3;
    } else {
      totalPoints += 1;
      misses.push({ area: 'differentiation', note: 'Differentiation is a growth area — working on "self" is the best gift you can give your relationship.' });
    }
    details.differentiation = { diff1: d1, diff2: d2 };
  }

  const score = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

  return {
    score,
    alignments,
    misses,
    details,
    assessmentsCovered: Object.keys(details).length,
    maxAssessments: 8,
  };
}

// ═══════════════════════════════════════════════════════════════
// 11. SHAME & VULNERABILITY SCORING (Brené Brown)
// ═══════════════════════════════════════════════════════════════

function scoreShameVulnerability(responses) {
  const questions = questionBank.shame_vulnerability.questions;
  const scaleMax = 7;

  const categoryScores = groupScores(responses, questions, 'category', scaleMax);

  const shameTriggers = categoryScores.shame_triggers?.percentage || 0;
  const armorPatterns = categoryScores.armor_patterns?.percentage || 0;
  const vulnerabilityCapacity = categoryScores.vulnerability_capacity?.percentage || 0;
  const storyAwareness = categoryScores.story_awareness?.percentage || 0;

  // Higher shame + armor = more armored; higher vulnerability + story = more resilient
  const shameScore = Math.round((shameTriggers + armorPatterns) / 2);
  const resilienceScore = Math.round((vulnerabilityCapacity + storyAwareness) / 2);
  const resilienceGap = resilienceScore - shameScore; // positive = resilient, negative = armored

  // Determine primary armor pattern
  const armorQuestions = questions.filter(q => q.category === 'armor_patterns');
  const armorDetails = {};
  const armorLabels = {
    sv_9: 'perfectionism', sv_10: 'numbing', sv_11: 'foreboding_joy', sv_12: 'blame',
    sv_13: 'deflection', sv_14: 'busyness', sv_15: 'curation', sv_16: 'anger_shield'
  };
  for (const q of armorQuestions) {
    const val = Number(responses[q.id]);
    if (!isNaN(val)) armorDetails[armorLabels[q.id] || q.id] = val;
  }
  const topArmor = Object.entries(armorDetails).sort((a, b) => b[1] - a[1]);
  const primaryArmor = topArmor.length > 0 ? topArmor[0][0] : 'unknown';

  return {
    overall: resilienceScore,
    shameTriggers,
    armorPatterns,
    vulnerabilityCapacity,
    storyAwareness,
    shameScore,
    resilienceScore,
    resilienceGap,
    primaryArmor,
    armorDetails,
    categoryDetails: categoryScores,
  };
}


// ═══════════════════════════════════════════════════════════════
// 12. DESIRE & ALIVENESS SCORING (Esther Perel)
// ═══════════════════════════════════════════════════════════════

function scoreDesireAliveness(responses) {
  const questions = questionBank.desire_aliveness.questions;
  const scaleMax = 7;

  const categoryScores = groupScores(responses, questions, 'category', scaleMax, true);

  const securityDesireBalance = categoryScores.security_desire_balance?.percentage || 0;
  const individualIdentity = categoryScores.individual_identity?.percentage || 0;
  const eroticAliveness = categoryScores.erotic_aliveness?.percentage || 0;
  const turnOnOff = categoryScores.turn_on_off?.percentage || 0;

  // Security-desire balance: HIGH score = relationship leans heavily toward security (risk of flatline)
  // Individual identity: HIGH = strong self (healthy)
  // Erotic aliveness: HIGH = alive and passionate (healthy)
  const overallAliveness = Math.round((individualIdentity + eroticAliveness) / 2);
  const flatlineRisk = securityDesireBalance > 70 && eroticAliveness < 40;
  const identityMergeRisk = individualIdentity < 40;

  // Determine relationship state
  let relationshipState;
  if (eroticAliveness >= 60 && individualIdentity >= 60) {
    relationshipState = 'thriving';
  } else if (eroticAliveness >= 40 && individualIdentity >= 40) {
    relationshipState = 'stable';
  } else if (securityDesireBalance > 60 && eroticAliveness < 40) {
    relationshipState = 'flatline';
  } else {
    relationshipState = 'seeking';
  }

  return {
    overall: overallAliveness,
    securityDesireBalance,
    individualIdentity,
    eroticAliveness,
    turnOnOffAwareness: turnOnOff,
    flatlineRisk,
    identityMergeRisk,
    relationshipState,
    categoryDetails: categoryScores,
  };
}


// ═══════════════════════════════════════════════════════════════
// 13. TACTICAL EMPATHY SCORING (Chris Voss)
// ═══════════════════════════════════════════════════════════════

function scoreTacticalEmpathy(responses) {
  const questions = questionBank.tactical_empathy.questions;
  const scaleMax = 7;

  const categoryScores = groupScores(responses, questions, 'category', scaleMax, true);

  const listeningQuality = categoryScores.listening_quality?.percentage || 0;
  const empathyAccuracy = categoryScores.empathy_accuracy?.percentage || 0;
  const conflictCommunication = categoryScores.conflict_communication?.percentage || 0;
  const thatsRightSkills = categoryScores.thats_right_skills?.percentage || 0;

  // Weighted overall — empathy accuracy is the most critical skill
  const overall = Math.round(
    listeningQuality * 0.20 +
    empathyAccuracy * 0.35 +
    conflictCommunication * 0.25 +
    thatsRightSkills * 0.20
  );

  // Identify weakest area for targeted improvement
  const areas = {
    listening_quality: listeningQuality,
    empathy_accuracy: empathyAccuracy,
    conflict_communication: conflictCommunication,
    thats_right_skills: thatsRightSkills,
  };
  const sorted = Object.entries(areas).sort((a, b) => a[1] - b[1]);
  const weakestArea = sorted[0][0];
  const strongestArea = sorted[sorted.length - 1][0];

  return {
    overall,
    listeningQuality,
    empathyAccuracy,
    conflictCommunication,
    thatsRightSkills,
    weakestArea,
    strongestArea,
    categoryDetails: categoryScores,
  };
}


/**
 * Calculate positive/negative interaction ratio
 * @param {number} positives - Count of positive interactions
 * @param {number} negatives - Count of negative interactions
 * @returns {number} - Ratio (positives per negative)
 */
function calculateRatio(positives, negatives) {
  if (negatives === 0) {
    return positives > 0 ? Infinity : 0;
  }
  return Math.round((positives / negatives) * 100) / 100;
}


// ═══════════════════════════════════════════════════════════════
// UNIVERSAL SCORE DISPATCHER
// ═══════════════════════════════════════════════════════════════

/**
 * Score any assessment by type
 * @param {string} type - Assessment type
 * @param {Object} responses - User responses
 * @returns {Object} Scored result
 */
function scoreAssessment(type, responses) {
  if (!responses || typeof responses !== 'object' || Object.keys(responses).length === 0) {
    throw new Error(`Invalid responses for assessment type "${type}": responses must be a non-empty object`);
  }

  const scorers = {
    attachment: scoreAttachment,
    personality: scorePersonality,
    love_language: scoreLoveLanguage,
    human_needs: scoreHumanNeeds,
    gottman_checkup: scoreGottmanCheckup,
    emotional_intelligence: scoreEmotionalIntelligence,
    conflict_style: scoreConflictStyle,
    differentiation: scoreDifferentiation,
    hormonal_health: scoreHormonalHealth,
    physical_vitality: scorePhysicalVitality,
    wellness_behavior: scoreWellnessBehavior,
    negative_patterns_closeness: scoreNegativePatterns,
    shame_vulnerability: scoreShameVulnerability,
    desire_aliveness: scoreDesireAliveness,
    tactical_empathy: scoreTacticalEmpathy,
  };

  const scorer = scorers[type];
  if (!scorer) {
    throw new Error(`No scorer for assessment type: "${type}". Valid types: ${Object.keys(scorers).join(', ')}`);
  }

  return scorer(responses);
}


// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // Universal dispatcher
  scoreAssessment,

  // Individual scorers
  scoreAttachment,
  scorePersonality,
  scoreLoveLanguage,
  scoreHumanNeeds,
  scoreGottmanCheckup,
  scoreEmotionalIntelligence,
  scoreConflictStyle,
  scoreDifferentiation,
  scoreHormonalHealth,
  scorePhysicalVitality,

  // New assessments (Brown, Perel, Voss)
  scoreShameVulnerability,
  scoreDesireAliveness,
  scoreTacticalEmpathy,

  // Legacy scorers
  scoreWellnessBehavior,
  scoreNegativePatterns,

  // Compatibility
  calculateMatchupScore,
  calculateRatio,
};
