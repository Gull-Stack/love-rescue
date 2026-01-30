const { getCoursePosition } = require('../../utils/coursePosition');

describe('getCoursePosition', () => {
  // Compute createdAt relative to the real clock at call time so that
  // Math.floor(diffMs / msPerDay) yields the exact desired day count.
  function testPosition(daysAgo) {
    const now = Date.now();
    const userCreatedAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
    return getCoursePosition(userCreatedAt);
  }

  test('day 0 (created today) returns courseDay 1, week 1, day 1', () => {
    const result = testPosition(0);
    expect(result.daysSinceStart).toBe(0);
    expect(result.courseDay).toBe(1);
    expect(result.week).toBe(1);
    expect(result.day).toBe(1);
  });

  test('day 1 returns courseDay 2, week 1, day 2', () => {
    const result = testPosition(1);
    expect(result.daysSinceStart).toBe(1);
    expect(result.courseDay).toBe(2);
    expect(result.week).toBe(1);
    expect(result.day).toBe(2);
  });

  test('day 6 returns courseDay 7, week 1, day 7', () => {
    const result = testPosition(6);
    expect(result.daysSinceStart).toBe(6);
    expect(result.courseDay).toBe(7);
    expect(result.week).toBe(1);
    expect(result.day).toBe(7);
  });

  test('day 7 returns courseDay 8, week 2, day 1', () => {
    const result = testPosition(7);
    expect(result.daysSinceStart).toBe(7);
    expect(result.courseDay).toBe(8);
    expect(result.week).toBe(2);
    expect(result.day).toBe(1);
  });

  test('day 13 returns courseDay 14, week 2, day 7', () => {
    const result = testPosition(13);
    expect(result.daysSinceStart).toBe(13);
    expect(result.courseDay).toBe(14);
    expect(result.week).toBe(2);
    expect(result.day).toBe(7);
  });

  test('day 97 returns courseDay 98, week 14, day 7', () => {
    const result = testPosition(97);
    expect(result.daysSinceStart).toBe(97);
    expect(result.courseDay).toBe(98);
    expect(result.week).toBe(14);
    expect(result.day).toBe(7);
  });

  test('day 98 wraps around to courseDay 1, week 1, day 1', () => {
    const result = testPosition(98);
    expect(result.daysSinceStart).toBe(98);
    expect(result.courseDay).toBe(1);
    expect(result.week).toBe(1);
    expect(result.day).toBe(1);
  });

  test('day 99 wraps to courseDay 2, week 1, day 2', () => {
    const result = testPosition(99);
    expect(result.daysSinceStart).toBe(99);
    expect(result.courseDay).toBe(2);
    expect(result.week).toBe(1);
    expect(result.day).toBe(2);
  });
});
