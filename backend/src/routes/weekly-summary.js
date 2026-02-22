/**
 * Weekly Summary API (Improvement 15)
 * Generates narrative week-in-review from past 7 days of activity
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Expert quotes keyed by dominant dimension
const DIMENSION_QUOTES = {
  appreciation: {
    expert: 'Dr. John Gottman',
    quote: 'Small things often. That\'s the motto of the relationship masters.',
    framework: 'The Gottman Method',
  },
  consistency: {
    expert: 'James Clear',
    quote: 'You do not rise to the level of your goals. You fall to the level of your systems.',
    framework: 'Atomic Habits',
  },
  vulnerability: {
    expert: 'Dr. Brené Brown',
    quote: 'Staying vulnerable is a risk we have to take if we want to experience connection.',
    framework: 'Daring Greatly',
  },
  communication: {
    expert: 'Dr. Sue Johnson',
    quote: 'When we can reach out and touch our partner, we can deal with anything.',
    framework: 'Hold Me Tight',
  },
  resilience: {
    expert: 'Esther Perel',
    quote: 'The quality of our relationships determines the quality of our lives.',
    framework: 'Mating in Captivity',
  },
};

// Narrative templates by dominant dimension
const NARRATIVE_TEMPLATES = {
  appreciation: {
    high: 'This was a week of gratitude and recognition. You consistently noticed the good in your partner, building the kind of positive sentiment override that protects relationships during hard times.',
    medium: 'You showed moments of genuine appreciation this week. Each gratitude entry strengthens the foundation of your relationship.',
    low: 'There\'s an opportunity to grow in appreciation this week. Even small acknowledments — a "thank you" or a noticed effort — can shift the dynamic.',
  },
  consistency: {
    high: 'Your consistency this week was outstanding. Showing up day after day is the single most powerful predictor of relationship growth.',
    medium: 'You maintained a solid rhythm this week. Every day you logged was a day you chose your relationship.',
    low: 'This week had gaps, and that\'s okay. What matters is that you\'re here now, ready to build the next streak.',
  },
  vulnerability: {
    high: 'This week you opened up in meaningful ways. Your journal entries show courage — the willingness to feel without certainty.',
    medium: 'You shared some honest reflections this week. Each vulnerable moment builds trust and deepens connection.',
    low: 'Consider sharing more of your inner world this coming week. Vulnerability isn\'t weakness — it\'s the birthplace of intimacy.',
  },
  communication: {
    high: 'Your communication patterns this week were strong. You maintained healthy ratios and engaged with conflict constructively.',
    medium: 'You showed solid communication this week, with more positive interactions than negative ones. Keep building on that ratio.',
    low: 'Communication is a muscle. This week, focus on leading with curiosity instead of criticism — even one soft startup can change the tone.',
  },
  resilience: {
    high: 'This week showed real resilience. You faced difficulties and kept showing up — that\'s what relationship warriors do.',
    medium: 'You navigated some challenges this week while maintaining engagement. That balance takes real strength.',
    low: 'Every relationship faces tough weeks. The fact that you\'re reviewing this summary shows you haven\'t given up.',
  },
};

/**
 * GET /api/weekly-summary
 * Generate narrative week-in-review from past 7 days
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Calculate date range (past 7 days)
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(now);
    weekEnd.setHours(23, 59, 59, 999);

    // Gather all activity data
    const [dailyLogs, gratitudeEntries, streakData, assessmentCount] =
      await Promise.all([
        req.prisma.dailyLog.findMany({
          where: {
            userId,
            date: { gte: weekStart, lte: weekEnd },
          },
          orderBy: { date: 'asc' },
        }),
        req.prisma.gratitudeEntry.count({
          where: {
            userId,
            createdAt: { gte: weekStart, lte: weekEnd },
          },
        }),
        req.prisma.dailyLog
          .findMany({
            where: { userId },
            orderBy: { date: 'desc' },
            select: { date: true },
          })
          .then((logs) => {
            // Calculate streak from all logs
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dates = logs.map((l) => {
              const d = new Date(l.date);
              d.setHours(0, 0, 0, 0);
              return d.getTime();
            });

            let streak = 0;
            let checkDate = new Date(today);
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            if (
              dates.includes(today.getTime()) ||
              dates.includes(yesterday.getTime())
            ) {
              if (dates.includes(today.getTime())) {
                checkDate = new Date(today);
              } else {
                checkDate = new Date(yesterday);
              }
              while (dates.includes(checkDate.getTime())) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
              }
            }
            return { currentStreak: streak };
          }),
        req.prisma.assessment.count({ where: { userId } }),
      ]);

    // Calculate stats
    const streakDays = streakData.currentStreak;
    const daysLogged = dailyLogs.length;
    const totalPositives = dailyLogs.reduce(
      (sum, l) => sum + (l.positiveCount || 0),
      0
    );
    const totalNegatives = dailyLogs.reduce(
      (sum, l) => sum + (l.negativeCount || 0),
      0
    );
    const avgRatio =
      totalNegatives > 0
        ? Math.round((totalPositives / totalNegatives) * 10) / 10
        : totalPositives > 0
          ? 999
          : 0;
    const totalBidsTurned = dailyLogs.reduce(
      (sum, l) => sum + (l.bidsTurned || 0),
      0
    );
    const journalEntries = dailyLogs.filter(
      (l) => l.journalEntry && l.journalEntry.length > 20
    ).length;
    const avgMood =
      dailyLogs.length > 0
        ? Math.round(
            (dailyLogs.reduce((sum, l) => sum + (l.mood || 3), 0) /
              dailyLogs.length) *
              10
          ) / 10
        : 0;

    // Score each dimension (0-100)
    const dimensions = {
      appreciation: Math.min(
        100,
        (gratitudeEntries / 7) * 100 * 0.6 +
          (totalPositives > 0 ? 40 : 0)
      ),
      consistency: Math.min(100, (daysLogged / 7) * 100),
      vulnerability: Math.min(100, (journalEntries / 3) * 100),
      communication: Math.min(
        100,
        avgRatio >= 5
          ? 100
          : avgRatio >= 3
            ? 70
            : avgRatio >= 1
              ? 40
              : 10
      ),
      resilience: Math.min(
        100,
        (streakDays >= 7 ? 50 : (streakDays / 7) * 50) +
          (daysLogged >= 5 ? 50 : (daysLogged / 5) * 50)
      ),
    };

    // Find dominant dimension
    const dominantDimension = Object.entries(dimensions).reduce(
      (max, [key, val]) => (val > max.val ? { key, val } : max),
      { key: 'consistency', val: 0 }
    ).key;

    // Determine narrative level
    const dominantScore = dimensions[dominantDimension];
    const level =
      dominantScore >= 70 ? 'high' : dominantScore >= 40 ? 'medium' : 'low';

    const narrative = NARRATIVE_TEMPLATES[dominantDimension][level];
    const expertQuote = DIMENSION_QUOTES[dominantDimension];

    // Compute techniques used (unique positive behaviors)
    const techniquesUsed = new Set();
    if (gratitudeEntries > 0) techniquesUsed.add('Gratitude');
    if (totalBidsTurned > 0) techniquesUsed.add('Bid Turning');
    if (journalEntries > 0) techniquesUsed.add('Journaling');
    if (totalPositives > totalNegatives * 3)
      techniquesUsed.add('Positive Ratio');
    if (daysLogged >= 5) techniquesUsed.add('Daily Logging');

    // Conflicts and resolution
    const conflictDays = dailyLogs.filter(
      (l) => l.negativeCount > 0
    ).length;
    const resolvedConflicts = dailyLogs.filter(
      (l) =>
        l.negativeCount > 0 &&
        l.positiveCount > 0 &&
        l.positiveCount >= l.negativeCount
    ).length;

    res.json({
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      stats: {
        streakDays,
        daysLogged,
        totalPositives,
        totalNegatives,
        avgRatio: avgRatio === 999 ? '∞' : avgRatio,
        appreciationsSent: gratitudeEntries,
        techniquesUsed: [...techniquesUsed],
        conflictDays,
        resolvedConflicts,
        avgMood,
        journalEntries,
        assessmentsCompleted: assessmentCount,
      },
      dimensions,
      dominantDimension,
      narrative,
      expertQuote,
    });
  } catch (error) {
    logger.error('Weekly summary error:', { error: error.message });
    next(error);
  }
});

module.exports = router;
