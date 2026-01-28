/**
 * Scoring utilities for assessments
 */

/**
 * Score attachment style assessment
 * @param {Object} responses - { questionId: score (1-5) }
 * @returns {Object} - { style: string, anxietyScore: number, avoidanceScore: number }
 */
function scoreAttachment(responses) {
  // Question categories:
  // Anxious: 1, 5, 8, 12
  // Avoidant: 2, 7
  // Secure: 3, 6, 11
  // Dismissive: 4, 9
  // Fearful: 5, 10

  const anxiousQuestions = [1, 5, 8, 12];
  const avoidantQuestions = [2, 7];
  const secureQuestions = [3, 6, 11];
  const dismissiveQuestions = [4, 9];
  const fearfulQuestions = [5, 10];

  let anxietyScore = 0;
  let avoidanceScore = 0;
  let secureScore = 0;

  for (const [qId, value] of Object.entries(responses)) {
    const id = parseInt(qId);
    const score = parseInt(value);

    if (anxiousQuestions.includes(id) || fearfulQuestions.includes(id)) {
      anxietyScore += score;
    }
    if (avoidantQuestions.includes(id) || dismissiveQuestions.includes(id)) {
      avoidanceScore += score;
    }
    if (secureQuestions.includes(id)) {
      secureScore += score;
    }
  }

  // Normalize scores
  const maxAnxiety = anxiousQuestions.length * 5 + fearfulQuestions.length * 5;
  const maxAvoidance = avoidantQuestions.length * 5 + dismissiveQuestions.length * 5;
  const maxSecure = secureQuestions.length * 5;

  const normAnxiety = (anxietyScore / maxAnxiety) * 100;
  const normAvoidance = (avoidanceScore / maxAvoidance) * 100;
  const normSecure = (secureScore / maxSecure) * 100;

  // Determine style
  let style;
  if (normSecure > 60 && normAnxiety < 40 && normAvoidance < 40) {
    style = 'secure';
  } else if (normAnxiety > 60 && normAvoidance < 50) {
    style = 'anxious';
  } else if (normAvoidance > 60 && normAnxiety < 50) {
    style = 'avoidant';
  } else if (normAnxiety > 50 && normAvoidance > 50) {
    style = 'dismissive-fearful';
  } else {
    style = 'secure'; // Default
  }

  return {
    style,
    anxietyScore: Math.round(normAnxiety),
    avoidanceScore: Math.round(normAvoidance),
    secureScore: Math.round(normSecure)
  };
}

/**
 * Score 16 Personalities assessment
 * @param {Object} responses - { questionId: score (1-5) }
 * @returns {Object} - { type: string, dimensions: Object, description: string }
 */
function scorePersonality(responses) {
  // Dimensions: E/I, S/N, T/F, J/P
  const dimensions = {
    E: 0, I: 0,
    S: 0, N: 0,
    T: 0, F: 0,
    J: 0, P: 0
  };

  const questionMapping = {
    1: { dimension: 'EI', direction: 'E' },
    2: { dimension: 'SN', direction: 'S' },
    3: { dimension: 'TF', direction: 'T' },
    4: { dimension: 'JP', direction: 'J' },
    5: { dimension: 'EI', direction: 'E' },
    6: { dimension: 'SN', direction: 'N' },
    7: { dimension: 'TF', direction: 'F' },
    8: { dimension: 'JP', direction: 'P' },
    9: { dimension: 'EI', direction: 'I' },
    10: { dimension: 'SN', direction: 'N' },
    11: { dimension: 'TF', direction: 'T' },
    12: { dimension: 'JP', direction: 'J' },
    13: { dimension: 'EI', direction: 'I' },
    14: { dimension: 'SN', direction: 'N' },
    15: { dimension: 'TF', direction: 'F' },
    16: { dimension: 'JP', direction: 'P' },
    17: { dimension: 'EI', direction: 'E' },
    18: { dimension: 'SN', direction: 'N' },
    19: { dimension: 'TF', direction: 'T' },
    20: { dimension: 'JP', direction: 'J' }
  };

  for (const [qId, value] of Object.entries(responses)) {
    const id = parseInt(qId);
    const score = parseInt(value);
    const mapping = questionMapping[id];

    if (mapping) {
      dimensions[mapping.direction] += score;
    }
  }

  // Determine type
  const type = [
    dimensions.E > dimensions.I ? 'E' : 'I',
    dimensions.S > dimensions.N ? 'S' : 'N',
    dimensions.T > dimensions.F ? 'T' : 'F',
    dimensions.J > dimensions.P ? 'J' : 'P'
  ].join('');

  const descriptions = {
    'INTJ': 'Strategic and independent thinker with high standards',
    'INTP': 'Innovative problem-solver who values logic and ideas',
    'ENTJ': 'Decisive leader who excels at organization',
    'ENTP': 'Clever debater who loves intellectual challenges',
    'INFJ': 'Insightful idealist with strong values and vision',
    'INFP': 'Thoughtful idealist guided by core values',
    'ENFJ': 'Charismatic leader focused on helping others grow',
    'ENFP': 'Enthusiastic creative with infectious optimism',
    'ISTJ': 'Reliable and practical, values tradition and loyalty',
    'ISFJ': 'Dedicated protector with strong sense of duty',
    'ESTJ': 'Organized administrator who values order',
    'ESFJ': 'Caring and social, focused on harmony',
    'ISTP': 'Practical problem-solver who stays calm under pressure',
    'ISFP': 'Gentle caregiver with artistic sensibilities',
    'ESTP': 'Energetic doer who lives in the moment',
    'ESFP': 'Spontaneous entertainer who loves people'
  };

  return {
    type,
    dimensions: {
      EI: { E: dimensions.E, I: dimensions.I },
      SN: { S: dimensions.S, N: dimensions.N },
      TF: { T: dimensions.T, F: dimensions.F },
      JP: { J: dimensions.J, P: dimensions.P }
    },
    description: descriptions[type] || 'Unique combination of personality traits'
  };
}

/**
 * Score wellness behavior assessment
 * @param {Object} responses - { questionId: score (1-5) }
 * @returns {Object} - { score: number (0-100), level: string }
 */
function scoreWellnessBehavior(responses) {
  // Positive items: 1, 4, 6, 8, 10 (higher = better)
  // Negative items: 2, 3, 5, 7, 9 (lower = better, so we invert)
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
      // Invert: 1->5, 2->4, 3->3, 4->2, 5->1
      totalScore += (6 - score);
      maxPossible += 5;
    }
  }

  const normalizedScore = Math.round((totalScore / maxPossible) * 100);

  let level;
  if (normalizedScore >= 70) level = 'high';
  else if (normalizedScore >= 40) level = 'medium';
  else level = 'low';

  return {
    score: normalizedScore,
    level,
    rawScore: totalScore,
    maxScore: maxPossible
  };
}

/**
 * Score negative patterns and closeness assessment
 * @param {Object} responses - { questionId: score (1-5) }
 * @returns {Object} - { patterns: Object, closeness: number }
 */
function scoreNegativePatterns(responses) {
  const patternMapping = {
    1: 'criticism',
    2: 'defensiveness',
    3: 'disrespect',
    4: 'withdrawal',
    5: 'closeness',
    6: 'closeness',
    7: 'disrespect',
    8: 'defensiveness',
    9: 'criticism',
    10: 'withdrawal',
    11: 'closeness',
    12: 'closeness',
    13: 'disrespect',
    14: 'defensiveness',
    15: 'closeness'
  };

  const patterns = {
    criticism: 0,
    defensiveness: 0,
    disrespect: 0,
    withdrawal: 0
  };
  const patternCounts = {
    criticism: 0,
    defensiveness: 0,
    disrespect: 0,
    withdrawal: 0
  };

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

  // Normalize patterns to 0-100 (higher = more problematic)
  for (const p of Object.keys(patterns)) {
    if (patternCounts[p] > 0) {
      patterns[p] = Math.round((patterns[p] / (patternCounts[p] * 5)) * 100);
    }
  }

  // Closeness score 0-100 (higher = better)
  const closeness = closenessCount > 0
    ? Math.round((closenessTotal / (closenessCount * 5)) * 100)
    : 50;

  return {
    patterns,
    closeness,
    overallRisk: Math.round(
      (patterns.criticism + patterns.defensiveness + patterns.disrespect + patterns.withdrawal) / 4
    )
  };
}

/**
 * Calculate matchup score between two users
 * @param {Object} user1Assessments - Array of user1's assessments
 * @param {Object} user2Assessments - Array of user2's assessments
 * @returns {Object} - { score: number, alignments: Array, misses: Array, details: Object }
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

  // Attachment compatibility (25 points max)
  maxPoints += 25;
  if (u1.attachment && u2.attachment) {
    const style1 = u1.attachment.style;
    const style2 = u2.attachment.style;

    if (style1 === 'secure' && style2 === 'secure') {
      totalPoints += 25;
      alignments.push({ area: 'attachment', note: 'Both have secure attachment styles' });
    } else if (style1 === 'secure' || style2 === 'secure') {
      totalPoints += 15;
      alignments.push({ area: 'attachment', note: 'One partner has secure attachment' });
    } else if (
      (style1 === 'anxious' && style2 === 'avoidant') ||
      (style1 === 'avoidant' && style2 === 'anxious')
    ) {
      totalPoints += 5;
      misses.push({ area: 'attachment', note: 'Anxious-avoidant pairing may cause friction' });
    } else {
      totalPoints += 10;
    }

    details.attachment = { style1, style2 };
  }

  // Personality compatibility (25 points max)
  maxPoints += 25;
  if (u1.personality && u2.personality) {
    const type1 = u1.personality.type;
    const type2 = u2.personality.type;

    // Simple compatibility: count matching dimensions
    let matches = 0;
    for (let i = 0; i < 4; i++) {
      if (type1[i] === type2[i]) matches++;
    }

    const points = Math.round((matches / 4) * 25);
    totalPoints += points;

    if (matches >= 3) {
      alignments.push({ area: 'personality', note: `Strong personality compatibility (${matches}/4 dimensions)` });
    } else if (matches <= 1) {
      misses.push({ area: 'personality', note: 'Different personality styles - requires understanding' });
    }

    details.personality = { type1, type2, matches };
  }

  // Wellness behavior compatibility (25 points max)
  maxPoints += 25;
  if (u1.wellness_behavior && u2.wellness_behavior) {
    const score1 = u1.wellness_behavior.score;
    const score2 = u2.wellness_behavior.score;
    const diff = Math.abs(score1 - score2);
    const avg = (score1 + score2) / 2;

    if (avg >= 70 && diff < 20) {
      totalPoints += 25;
      alignments.push({ area: 'wellness', note: 'Both partners have healthy coping strategies' });
    } else if (avg >= 50) {
      totalPoints += 15;
    } else {
      totalPoints += 5;
      misses.push({ area: 'wellness', note: 'Coping strategies need development' });
    }

    details.wellness = { score1, score2, difference: diff };
  }

  // Negative patterns compatibility (25 points max)
  maxPoints += 25;
  if (u1.negative_patterns_closeness && u2.negative_patterns_closeness) {
    const risk1 = u1.negative_patterns_closeness.overallRisk;
    const risk2 = u2.negative_patterns_closeness.overallRisk;
    const close1 = u1.negative_patterns_closeness.closeness;
    const close2 = u2.negative_patterns_closeness.closeness;

    const avgRisk = (risk1 + risk2) / 2;
    const avgCloseness = (close1 + close2) / 2;

    if (avgRisk < 30 && avgCloseness > 70) {
      totalPoints += 25;
      alignments.push({ area: 'patterns', note: 'Low negative patterns and high closeness' });
    } else if (avgRisk < 50) {
      totalPoints += 15;
    } else {
      totalPoints += 5;
      misses.push({ area: 'patterns', note: 'Some concerning interaction patterns detected' });
    }

    details.patterns = {
      risk1, risk2,
      closeness1: close1, closeness2: close2
    };
  }

  const score = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

  return {
    score,
    alignments,
    misses,
    details
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

module.exports = {
  scoreAttachment,
  scorePersonality,
  scoreWellnessBehavior,
  scoreNegativePatterns,
  calculateMatchupScore,
  calculateRatio
};
