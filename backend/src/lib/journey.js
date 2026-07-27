/**
 * Server-owned journey state + next best action.
 *
 * This is the single source of truth for "where is this user on the road and
 * what should they do next". The client used to re-derive lifecycle state in
 * two places (Dashboard + Layout) and relay it through localStorage, which
 * left the nav permanently one step stale; and it ran THREE competing
 * next-action ladders. Everything now reads this.
 */

const { localDayStart } = require('./dates');

const STATES = ['BLANK', 'DISCOVERING', 'BUILDING', 'PRACTICING', 'TRANSFORMED'];

// Single TZ policy lives in lib/dates.js — "today" is the server-local day,
// matching how logs.js/gratitude.js stamp the domain `date` column.
const startOfToday = () => localDayStart();

// Consecutive-day streak ending today or yesterday (cheap: last 60 log dates).
function computeStreak(logDates) {
  if (!logDates.length) return 0;
  const days = new Set(
    logDates.map((d) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x.getTime();
    })
  );
  const DAY = 24 * 60 * 60 * 1000;
  let cursor = startOfToday().getTime();
  if (!days.has(cursor)) cursor -= DAY; // streak still alive if logged yesterday
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor -= DAY;
  }
  return streak;
}

function getState({ assessmentsDone, daysActive, streak, strategyCycle }) {
  if (assessmentsDone === 0) return 'BLANK';
  if (assessmentsDone < 3 && daysActive < 7) return 'DISCOVERING';
  if (daysActive >= 42 || strategyCycle > 1) return 'TRANSFORMED';
  if (daysActive >= 14 && streak > 0) return 'PRACTICING';
  if (assessmentsDone >= 3) return 'BUILDING';
  return 'DISCOVERING';
}

// The one canonical next-best-action ladder.
function getNextAction({ assessmentsDone, hasLoggedToday, hasGratitudeToday, hasStrategy }) {
  if (assessmentsDone === 0) {
    return {
      key: 'first_assessment',
      label: 'Take your first assessment',
      description: 'Your plan starts with a few quick questions about you.',
      path: '/assessments',
    };
  }
  if (assessmentsDone < 3) {
    return {
      key: 'more_assessments',
      label: `Finish your assessments — ${3 - assessmentsDone} to go`,
      description: 'Three assessments unlock your personalized plan.',
      path: '/assessments',
    };
  }
  if (!hasLoggedToday) {
    return {
      key: 'daily_checkin',
      label: "Today's check-in",
      description: 'About 45 seconds. It keeps your plan honest.',
      path: '/daily',
    };
  }
  if (!hasStrategy) {
    return {
      key: 'get_plan',
      label: 'Get your plan',
      description: 'A personalized weekly roadmap built from your assessments.',
      path: '/strategies',
    };
  }
  if (!hasGratitudeToday) {
    return {
      key: 'gratitude',
      label: 'Notice one good thing',
      description: 'A 20-second appreciation rewires how you see each other.',
      path: '/gratitude',
    };
  }
  return {
    key: 'explore',
    label: "You're caught up for today",
    description: 'Keep momentum with this week in your Journey.',
    path: '/course',
  };
}

/**
 * Compute the journey block served on /auth/me.
 * All queries are cheap (counts / firsts); failures degrade to a BLANK-safe
 * default rather than breaking auth.
 */
async function computeJourney(prisma, user, relationship) {
  try {
    // "Logged today" is judged on the domain `date` column (the upsert key),
    // NOT createdAt: a row created yesterday and upserted today, or a
    // backdated entry, would make createdAt lie about the calendar day.
    const todayStart = startOfToday();
    const [assessmentsDone, todayLog, todayGratitude, logDates, strategy] = await Promise.all([
      prisma.assessment.count({ where: { userId: user.id } }),
      prisma.dailyLog.findFirst({
        where: { userId: user.id, date: todayStart },
        select: { id: true },
      }),
      prisma.gratitudeEntry
        ? prisma.gratitudeEntry.findFirst({
            where: { userId: user.id, date: todayStart },
            select: { id: true },
          })
        : null,
      prisma.dailyLog.findMany({
        where: { userId: user.id },
        orderBy: { date: 'desc' },
        take: 60,
        select: { date: true },
      }),
      relationship
        ? prisma.strategy.findFirst({
            where: { relationshipId: relationship.id },
            orderBy: [{ cycleNumber: 'desc' }, { week: 'desc' }],
            select: { id: true, cycleNumber: true },
          })
        : null,
    ]);

    const daysActive = user.createdAt
      ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (24 * 60 * 60 * 1000))
      : 0;
    const streak = computeStreak(logDates.map((l) => l.date));
    const state = getState({
      assessmentsDone,
      daysActive,
      streak,
      strategyCycle: strategy?.cycleNumber || 0,
    });
    const nextAction = getNextAction({
      assessmentsDone,
      hasLoggedToday: !!todayLog,
      hasGratitudeToday: !!todayGratitude,
      hasStrategy: !!strategy,
    });

    return {
      state,
      streak,
      assessmentsCompleted: assessmentsDone,
      hasLoggedToday: !!todayLog,
      hasGratitudeToday: !!todayGratitude,
      nextAction,
    };
  } catch (_e) {
    // Never let journey math break /auth/me.
    return {
      state: 'BLANK',
      streak: 0,
      assessmentsCompleted: 0,
      hasLoggedToday: false,
      hasGratitudeToday: false,
      nextAction: getNextAction({
        assessmentsDone: 0,
        hasLoggedToday: false,
        hasGratitudeToday: false,
        hasStrategy: false,
      }),
    };
  }
}

module.exports = { computeJourney, getState, getNextAction, computeStreak, STATES };
