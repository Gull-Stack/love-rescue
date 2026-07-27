/**
 * QA remediation P0-E / P1-A: the server-owned journey spine.
 * The date test FAILS if hasLoggedToday goes back to createdAt filtering.
 */
const { computeJourney, getState, getNextAction, computeStreak } = require('../../lib/journey');
const { localDayStart } = require('../../lib/dates');

describe('getState transitions', () => {
  test('no assessments → BLANK', () => {
    expect(getState({ assessmentsDone: 0, daysActive: 0, streak: 0, strategyCycle: 0 })).toBe('BLANK');
  });
  test('1 assessment, new account → DISCOVERING', () => {
    expect(getState({ assessmentsDone: 1, daysActive: 2, streak: 0, strategyCycle: 0 })).toBe('DISCOVERING');
  });
  test('3 assessments → BUILDING', () => {
    expect(getState({ assessmentsDone: 3, daysActive: 3, streak: 0, strategyCycle: 0 })).toBe('BUILDING');
  });
  test('2 weeks in with a live streak → PRACTICING', () => {
    expect(getState({ assessmentsDone: 3, daysActive: 15, streak: 4, strategyCycle: 1 })).toBe('PRACTICING');
  });
  test('6+ weeks or second strategy cycle → TRANSFORMED', () => {
    expect(getState({ assessmentsDone: 5, daysActive: 50, streak: 2, strategyCycle: 1 })).toBe('TRANSFORMED');
    expect(getState({ assessmentsDone: 5, daysActive: 20, streak: 2, strategyCycle: 2 })).toBe('TRANSFORMED');
  });
});

describe('getNextAction priority ladder', () => {
  const base = { assessmentsDone: 3, hasLoggedToday: true, hasGratitudeToday: true, hasStrategy: true };
  test('assessments come first', () => {
    expect(getNextAction({ ...base, assessmentsDone: 0 }).key).toMatch(/assess/i);
  });
  test('then the daily check-in', () => {
    expect(getNextAction({ ...base, hasLoggedToday: false }).key).toMatch(/log|check/i);
  });
  test('everything done → a terminal action that still links somewhere', () => {
    const action = getNextAction(base);
    expect(action).toBeTruthy();
    expect(action.path).toBeTruthy();
  });
});

describe('computeStreak', () => {
  const d = (offset) => {
    const x = new Date();
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - offset);
    return x;
  };
  test('empty → 0', () => expect(computeStreak([])).toBe(0));
  test('today + yesterday → 2', () => expect(computeStreak([d(0), d(1)])).toBe(2));
  test('streak alive if last log was yesterday', () => expect(computeStreak([d(1), d(2)])).toBe(2));
  test('gap breaks the streak', () => expect(computeStreak([d(0), d(2), d(3)])).toBe(1));
});

describe('computeJourney (P0-E: domain date, graceful failure)', () => {
  const user = { id: 'user-1', createdAt: new Date() };

  function prismaMock(overrides = {}) {
    return {
      assessment: { count: jest.fn().mockResolvedValue(0) },
      dailyLog: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([])
      },
      gratitudeEntry: { findFirst: jest.fn().mockResolvedValue(null) },
      strategy: { findFirst: jest.fn().mockResolvedValue(null) },
      ...overrides
    };
  }

  test('hasLoggedToday queries the domain date column at local midnight — never createdAt', async () => {
    const prisma = prismaMock();
    await computeJourney(prisma, user, null);

    const where = prisma.dailyLog.findFirst.mock.calls[0][0].where;
    expect(where.createdAt).toBeUndefined();
    expect(where.date).toBeInstanceOf(Date);
    expect(where.date.getTime()).toBe(localDayStart().getTime());

    const gratWhere = prisma.gratitudeEntry.findFirst.mock.calls[0][0].where;
    expect(gratWhere.createdAt).toBeUndefined();
    expect(gratWhere.date).toBeInstanceOf(Date);
  });

  test('a matching date row (even with an old createdAt) sets hasLoggedToday', async () => {
    const prisma = prismaMock();
    prisma.dailyLog.findFirst.mockResolvedValue({ id: 'log-1' });
    const journey = await computeJourney(prisma, user, null);
    expect(journey.hasLoggedToday).toBe(true);
  });

  test('a DB failure degrades to a BLANK-safe default instead of throwing', async () => {
    const prisma = prismaMock();
    prisma.assessment.count.mockRejectedValue(new Error('db down'));
    const journey = await computeJourney(prisma, user, null);
    expect(journey).toBeTruthy();
    expect(journey.state).toBe('BLANK');
    expect(journey.hasLoggedToday).toBe(false);
  });
});
