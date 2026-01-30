const {
  scoreAttachment,
  scorePersonality,
  scoreWellnessBehavior,
  scoreNegativePatterns,
  calculateMatchupScore,
  calculateRatio
} = require('../../utils/scoring');

// ---------------------------------------------------------------------------
// scoreAttachment
// ---------------------------------------------------------------------------
describe('scoreAttachment', () => {
  test('returns secure style when secure questions are high and anxiety/avoidance are low', () => {
    // Secure questions: 3,6,11 scored high (5 each) => secureScore=15, normSecure=100
    // Anxious questions: 1,5,8,12 + fearful: 5,10 => ids 1,5,8,10,12 scored low (1 each)
    //   anxietyScore = 5, maxAnxiety = (4+2)*5 = 30, normAnxiety = 16.67
    // Avoidant questions: 2,7 + dismissive: 4,9 scored low (1 each)
    //   avoidanceScore = 4, maxAvoidance = (2+2)*5 = 20, normAvoidance = 20
    const responses = {
      1: 1, 2: 1, 3: 5, 4: 1, 5: 1, 6: 5, 7: 1, 8: 1, 9: 1, 10: 1, 11: 5, 12: 1
    };
    const result = scoreAttachment(responses);
    expect(result.style).toBe('secure');
    expect(result.secureScore).toBeGreaterThan(60);
    expect(result.anxietyScore).toBeLessThan(40);
    expect(result.avoidanceScore).toBeLessThan(40);
  });

  test('returns anxious style when anxiety is high and avoidance is below 50', () => {
    // Anxious/fearful questions: 1,5,8,10,12 all scored 5 => anxietyScore=25, norm=83.3
    // Avoidant/dismissive questions: 2,4,7,9 scored 1 => avoidanceScore=4, norm=20
    // Secure questions: 3,6,11 scored 1 => secureScore=3, norm=20
    const responses = {
      1: 5, 2: 1, 3: 1, 4: 1, 5: 5, 6: 1, 7: 1, 8: 5, 9: 1, 10: 5, 11: 1, 12: 5
    };
    const result = scoreAttachment(responses);
    expect(result.style).toBe('anxious');
    expect(result.anxietyScore).toBeGreaterThan(60);
    expect(result.avoidanceScore).toBeLessThan(50);
  });

  test('returns avoidant style when avoidance is high and anxiety is below 50', () => {
    // Avoidant/dismissive questions: 2,4,7,9 scored 5 => avoidanceScore=20, norm=100
    // Anxious/fearful questions: 1,5,8,10,12 scored 1 => anxietyScore=5, norm=16.67
    // Secure questions: 3,6,11 scored 1 => low secure
    const responses = {
      1: 1, 2: 5, 3: 1, 4: 5, 5: 1, 6: 1, 7: 5, 8: 1, 9: 5, 10: 1, 11: 1, 12: 1
    };
    const result = scoreAttachment(responses);
    expect(result.style).toBe('avoidant');
    expect(result.avoidanceScore).toBeGreaterThan(60);
    expect(result.anxietyScore).toBeLessThan(50);
  });

  test('returns dismissive-fearful style when both anxiety and avoidance are above 50', () => {
    // All questions scored high (5) => anxiety and avoidance both near 100
    const responses = {
      1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 7: 5, 8: 5, 9: 5, 10: 5, 11: 5, 12: 5
    };
    const result = scoreAttachment(responses);
    expect(result.style).toBe('dismissive-fearful');
    expect(result.anxietyScore).toBeGreaterThan(50);
    expect(result.avoidanceScore).toBeGreaterThan(50);
  });

  test('defaults to secure when no specific style criteria are met', () => {
    // Middle-of-the-road scores that don't trigger any specific style
    // normAnxiety ~50, normAvoidance ~50, normSecure ~47
    // Not secure (secure<60), not anxious (anxiety not >60), not avoidant (avoidance not >60),
    // not dismissive-fearful (need both >50, and these are right at boundary)
    const responses = {
      1: 3, 2: 2, 3: 3, 4: 2, 5: 2, 6: 2, 7: 3, 8: 3, 9: 2, 10: 3, 11: 2, 12: 2
    };
    const result = scoreAttachment(responses);
    // normAnxiety = (3+2+3+3+2)/30*100 = 13/30*100 = 43.3
    // normAvoidance = (2+2+3+2)/20*100 = 9/20*100 = 45
    // normSecure = (3+2+2)/15*100 = 7/15*100 = 46.7
    // None of the specific conditions met => default secure
    expect(result.style).toBe('secure');
  });

  test('handles empty responses object', () => {
    const result = scoreAttachment({});
    // All scores are 0/0 => NaN normalized, which rounds to NaN
    // NaN comparisons return false, so style defaults to 'secure'
    expect(result.style).toBe('secure');
  });

  test('handles string values by parsing them as integers', () => {
    const responses = {
      '1': '1', '2': '1', '3': '5', '4': '1', '5': '1',
      '6': '5', '7': '1', '8': '1', '9': '1', '10': '1', '11': '5', '12': '1'
    };
    const result = scoreAttachment(responses);
    expect(result.style).toBe('secure');
    expect(typeof result.anxietyScore).toBe('number');
    expect(typeof result.avoidanceScore).toBe('number');
    expect(typeof result.secureScore).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// scorePersonality
// ---------------------------------------------------------------------------
describe('scorePersonality', () => {
  test('returns ESTJ type with correct dimension scores', () => {
    // E questions: 1,5,17 (direction E); I questions: 9,13 (direction I)
    // S questions: 2 (direction S); N questions: 6,10,14,18 (direction N)
    // T questions: 3,11,19 (direction T); F questions: 7,15 (direction F)
    // J questions: 4,12,20 (direction J); P questions: 8,16 (direction P)
    // E high, S high, T high, J high
    const responses = {
      1: 5, 5: 5, 17: 5,   // E: 15
      9: 1, 13: 1,          // I: 2
      2: 5,                  // S: 5
      6: 1, 10: 1, 14: 1, 18: 1, // N: 4
      3: 5, 11: 5, 19: 5,   // T: 15
      7: 1, 15: 1,          // F: 2
      4: 5, 12: 5, 20: 5,   // J: 15
      8: 1, 16: 1           // P: 2
    };
    const result = scorePersonality(responses);
    expect(result.type).toBe('ESTJ');
    expect(result.dimensions.EI.E).toBe(15);
    expect(result.dimensions.EI.I).toBe(2);
    expect(result.dimensions.SN.S).toBe(5);
    expect(result.dimensions.TF.T).toBe(15);
    expect(result.dimensions.JP.J).toBe(15);
  });

  test('returns INFP type with correct dimension scores', () => {
    const responses = {
      1: 1, 5: 1, 17: 1,   // E: 3
      9: 5, 13: 5,          // I: 10
      2: 1,                  // S: 1
      6: 5, 10: 5, 14: 5, 18: 5, // N: 20
      3: 1, 11: 1, 19: 1,   // T: 3
      7: 5, 15: 5,          // F: 10
      4: 1, 12: 1, 20: 1,   // J: 3
      8: 5, 16: 5           // P: 10
    };
    const result = scorePersonality(responses);
    expect(result.type).toBe('INFP');
    expect(result.dimensions.EI.I).toBeGreaterThan(result.dimensions.EI.E);
    expect(result.dimensions.SN.N).toBeGreaterThan(result.dimensions.SN.S);
    expect(result.dimensions.TF.F).toBeGreaterThan(result.dimensions.TF.T);
    expect(result.dimensions.JP.P).toBeGreaterThan(result.dimensions.JP.J);
  });

  test('returns a description matching the personality type', () => {
    const responses = {
      1: 5, 5: 5, 17: 5, 9: 1, 13: 1,
      2: 5, 6: 1, 10: 1, 14: 1, 18: 1,
      3: 5, 11: 5, 19: 5, 7: 1, 15: 1,
      4: 5, 12: 5, 20: 5, 8: 1, 16: 1
    };
    const result = scorePersonality(responses);
    expect(result.type).toBe('ESTJ');
    expect(result.description).toBe('Organized administrator who values order');
  });

  test('handles partial responses gracefully', () => {
    // Only a few questions answered; unmapped dimensions default to 0
    const responses = { 1: 5, 2: 3 };
    const result = scorePersonality(responses);
    expect(result.type).toBeDefined();
    expect(result.type).toHaveLength(4);
    expect(result.dimensions).toBeDefined();
    // E=5, I=0, S=3, N=0 => type starts with 'ES'
    expect(result.type[0]).toBe('E');
    expect(result.type[1]).toBe('S');
    // T=0, F=0 => tie goes to second letter (I wins in code since !(0>0))
    // J=0, P=0 => same logic
    expect(result.description).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// scoreWellnessBehavior
// ---------------------------------------------------------------------------
describe('scoreWellnessBehavior', () => {
  test('returns high level for score >= 70', () => {
    // All positive questions (1,4,6,8,10) scored 5 => 25
    // All negative questions (2,3,5,7,9) scored 1 => inverted to 5 each => 25
    // Total = 50, max = 50, normalized = 100
    const responses = {
      1: 5, 2: 1, 3: 1, 4: 5, 5: 1, 6: 5, 7: 1, 8: 5, 9: 1, 10: 5
    };
    const result = scoreWellnessBehavior(responses);
    expect(result.level).toBe('high');
    expect(result.score).toBe(100);
  });

  test('returns medium level for score between 40 and 69', () => {
    // All questions scored 3 => positive: 3*5=15, negative: (6-3)*5=15 => total=30
    // max=50, normalized=60
    const responses = {
      1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3, 8: 3, 9: 3, 10: 3
    };
    const result = scoreWellnessBehavior(responses);
    expect(result.level).toBe('medium');
    expect(result.score).toBe(60);
  });

  test('returns low level for score below 40', () => {
    // Positive questions scored 1 => 5, negative scored 5 => inverted to 1 each => 5
    // Total = 10, max = 50, normalized = 20
    const responses = {
      1: 1, 2: 5, 3: 5, 4: 1, 5: 5, 6: 1, 7: 5, 8: 1, 9: 5, 10: 1
    };
    const result = scoreWellnessBehavior(responses);
    expect(result.level).toBe('low');
    expect(result.score).toBe(20);
  });

  test('calculates rawScore and maxScore correctly', () => {
    const responses = {
      1: 4, 2: 2, 3: 2, 4: 4, 5: 2, 6: 4, 7: 2, 8: 4, 9: 2, 10: 4
    };
    // Positive: 4*5=20
    // Negative: (6-2)*5=20
    // Total raw = 40, max = 50
    const result = scoreWellnessBehavior(responses);
    expect(result.rawScore).toBe(40);
    expect(result.maxScore).toBe(50);
    expect(result.score).toBe(80);
  });

  test('inverts negative question scores correctly', () => {
    // Only negative questions provided
    // Question 2 scored 1 => inverted to 5
    // Question 3 scored 5 => inverted to 1
    const responses = { 2: 1, 3: 5 };
    const result = scoreWellnessBehavior(responses);
    // rawScore = 5 + 1 = 6, maxScore = 10
    expect(result.rawScore).toBe(6);
    expect(result.maxScore).toBe(10);
    expect(result.score).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// scoreNegativePatterns
// ---------------------------------------------------------------------------
describe('scoreNegativePatterns', () => {
  test('detects high criticism when criticism questions are scored high', () => {
    // Criticism: questions 1,9
    const responses = { 1: 5, 9: 5 };
    const result = scoreNegativePatterns(responses);
    // criticism = (5+5) / (2*5) * 100 = 100
    expect(result.patterns.criticism).toBe(100);
  });

  test('returns low patterns with high closeness', () => {
    // All negative patterns scored 1, closeness scored 5
    const responses = {
      1: 1, 2: 1, 3: 1, 4: 1,
      5: 5, 6: 5,
      7: 1, 8: 1, 9: 1, 10: 1,
      11: 5, 12: 5, 13: 1, 14: 1, 15: 5
    };
    const result = scoreNegativePatterns(responses);
    expect(result.patterns.criticism).toBe(20);
    expect(result.patterns.defensiveness).toBe(20);
    expect(result.patterns.disrespect).toBe(20);
    expect(result.patterns.withdrawal).toBe(20);
    expect(result.closeness).toBe(100);
  });

  test('defaults closeness to 50 when no closeness questions are answered', () => {
    // Only non-closeness questions
    const responses = { 1: 3, 2: 3, 3: 3, 4: 3 };
    const result = scoreNegativePatterns(responses);
    expect(result.closeness).toBe(50);
  });

  test('calculates overallRisk as average of four pattern scores', () => {
    const responses = {
      1: 5, 9: 5,      // criticism: 100
      2: 3, 8: 3, 14: 3, // defensiveness: 60
      3: 2, 7: 2, 13: 2, // disrespect: 40
      4: 1, 10: 1      // withdrawal: 20
    };
    const result = scoreNegativePatterns(responses);
    expect(result.patterns.criticism).toBe(100);
    expect(result.patterns.defensiveness).toBe(60);
    expect(result.patterns.disrespect).toBe(40);
    expect(result.patterns.withdrawal).toBe(20);
    expect(result.overallRisk).toBe(Math.round((100 + 60 + 40 + 20) / 4));
  });
});

// ---------------------------------------------------------------------------
// calculateMatchupScore
// ---------------------------------------------------------------------------
describe('calculateMatchupScore', () => {
  test('scores 25 points for attachment when both are secure', () => {
    const u1 = [{ type: 'attachment', score: { style: 'secure' } }];
    const u2 = [{ type: 'attachment', score: { style: 'secure' } }];
    const result = calculateMatchupScore(u1, u2);
    expect(result.details.attachment.style1).toBe('secure');
    expect(result.details.attachment.style2).toBe('secure');
    expect(result.alignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ area: 'attachment', note: 'Both have secure attachment styles' })
      ])
    );
  });

  test('scores 5 points for anxious-avoidant pairing and records a miss', () => {
    const u1 = [{ type: 'attachment', score: { style: 'anxious' } }];
    const u2 = [{ type: 'attachment', score: { style: 'avoidant' } }];
    const result = calculateMatchupScore(u1, u2);
    expect(result.misses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ area: 'attachment', note: 'Anxious-avoidant pairing may cause friction' })
      ])
    );
    // Only attachment category present: 5/25 = 20%
    expect(result.score).toBe(Math.round((5 / 100) * 100));
  });

  test('scores full compatibility when all categories are optimal', () => {
    const u1 = [
      { type: 'attachment', score: { style: 'secure' } },
      { type: 'personality', score: { type: 'ESTJ' } },
      { type: 'wellness_behavior', score: { score: 80 } },
      { type: 'negative_patterns_closeness', score: { overallRisk: 10, closeness: 90 } }
    ];
    const u2 = [
      { type: 'attachment', score: { style: 'secure' } },
      { type: 'personality', score: { type: 'ESTJ' } },
      { type: 'wellness_behavior', score: { score: 80 } },
      { type: 'negative_patterns_closeness', score: { overallRisk: 10, closeness: 90 } }
    ];
    const result = calculateMatchupScore(u1, u2);
    // Attachment: 25, Personality: 4/4 match = 25, Wellness: avg 80 diff 0 => 25, Patterns: risk<30 close>70 => 25
    expect(result.score).toBe(100);
  });

  test('returns score 0 when both users have no assessments', () => {
    const result = calculateMatchupScore([], []);
    expect(result.score).toBe(0);
    expect(result.alignments).toEqual([]);
    expect(result.misses).toEqual([]);
  });

  test('handles partial assessments where only some categories exist', () => {
    const u1 = [
      { type: 'attachment', score: { style: 'secure' } },
      { type: 'personality', score: { type: 'ESTJ' } }
    ];
    const u2 = [
      { type: 'attachment', score: { style: 'secure' } },
      { type: 'personality', score: { type: 'INFP' } }
    ];
    const result = calculateMatchupScore(u1, u2);
    // Attachment: 25/25, Personality: 0/4 matches = 0/25
    // maxPoints = 100, totalPoints = 25 + 0 = 25
    expect(result.score).toBe(25);
    expect(result.details.attachment).toBeDefined();
    expect(result.details.personality).toBeDefined();
    expect(result.details.wellness).toBeUndefined();
    expect(result.details.patterns).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// calculateRatio
// ---------------------------------------------------------------------------
describe('calculateRatio', () => {
  test('returns normal ratio for non-zero negatives', () => {
    expect(calculateRatio(10, 2)).toBe(5);
  });

  test('returns Infinity when negatives is 0 and positives > 0', () => {
    expect(calculateRatio(5, 0)).toBe(Infinity);
  });

  test('returns 0 when both positives and negatives are 0', () => {
    expect(calculateRatio(0, 0)).toBe(0);
  });

  test('rounds to 2 decimal places', () => {
    // 7/3 = 2.3333... => rounded to 2.33
    expect(calculateRatio(7, 3)).toBe(2.33);
    // 10/3 = 3.3333... => 3.33
    expect(calculateRatio(10, 3)).toBe(3.33);
    // 1/3 = 0.3333... => 0.33
    expect(calculateRatio(1, 3)).toBe(0.33);
  });
});
