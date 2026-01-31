const express = require('express');
const { authenticate, requireSubscription } = require('../middleware/auth');
const { calculateRatio } = require('../utils/scoring');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/logs/daily
 * Log daily interactions
 */
router.post('/daily', authenticate, requireSubscription, async (req, res, next) => {
  try {
    const {
      date,
      positiveCount,
      negativeCount,
      journalEntry,
      bidsTurned,
      closenessScore,
      mood,
      isPrivate,
      therapistVisible
    } = req.body;

    let logDate;
    if (date) {
      // Parse date string as local timezone (new Date('YYYY-MM-DD') parses as UTC, causing mismatches)
      const [year, month, day] = date.split('-').map(Number);
      logDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    } else {
      logDate = new Date();
      logDate.setHours(0, 0, 0, 0);
    }

    // Calculate ratio
    const ratio = calculateRatio(positiveCount || 0, negativeCount || 0);

    // Upsert daily log
    const dailyLog = await req.prisma.dailyLog.upsert({
      where: {
        userId_date: {
          userId: req.user.id,
          date: logDate
        }
      },
      update: {
        positiveCount: positiveCount || 0,
        negativeCount: negativeCount || 0,
        ratio: ratio === Infinity ? 999 : ratio,
        journalEntry,
        bidsTurned,
        closenessScore,
        mood,
        isPrivate: isPrivate || false,
        therapistVisible: therapistVisible !== false
      },
      create: {
        userId: req.user.id,
        date: logDate,
        positiveCount: positiveCount || 0,
        negativeCount: negativeCount || 0,
        ratio: ratio === Infinity ? 999 : ratio,
        journalEntry,
        bidsTurned,
        closenessScore,
        mood,
        isPrivate: isPrivate || false,
        therapistVisible: therapistVisible !== false
      }
    });

    logger.info('Daily log saved', { userId: req.user.id, date: logDate });

    res.json({
      message: 'Daily log saved',
      log: {
        id: dailyLog.id,
        date: dailyLog.date,
        positiveCount: dailyLog.positiveCount,
        negativeCount: dailyLog.negativeCount,
        ratio: dailyLog.ratio,
        bidsTurned: dailyLog.bidsTurned,
        closenessScore: dailyLog.closenessScore,
        mood: dailyLog.mood
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/logs/daily/:date
 * Get daily log for specific date
 */
router.get('/daily/:date', authenticate, async (req, res, next) => {
  try {
    const { date } = req.params;
    // Parse date string as local timezone (new Date('YYYY-MM-DD') parses as UTC, causing mismatches)
    const [year, month, day] = date.split('-').map(Number);
    const logDate = new Date(year, month - 1, day, 0, 0, 0, 0);

    const dailyLog = await req.prisma.dailyLog.findUnique({
      where: {
        userId_date: {
          userId: req.user.id,
          date: logDate
        }
      }
    });

    if (!dailyLog) {
      return res.status(404).json({ error: 'No log for this date' });
    }

    res.json({ log: dailyLog });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/logs/daily
 * Get daily logs for date range (default: last 7 days)
 */
router.get('/daily', authenticate, async (req, res, next) => {
  try {
    const { startDate, endDate, limit = 7 } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - (parseInt(limit) - 1) * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);

    const logs = await req.prisma.dailyLog.findMany({
      where: {
        userId: req.user.id,
        date: {
          gte: start,
          lte: end
        }
      },
      orderBy: { date: 'desc' },
      take: parseInt(limit)
    });

    res.json({ logs });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/logs/stats
 * Get aggregated statistics
 */
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const { period = '7d' } = req.query;

    let startDate = new Date();
    switch (period) {
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '7d':
      default:
        startDate.setDate(startDate.getDate() - 7);
    }
    startDate.setHours(0, 0, 0, 0);

    const logs = await req.prisma.dailyLog.findMany({
      where: {
        userId: req.user.id,
        date: { gte: startDate }
      },
      orderBy: { date: 'asc' }
    });

    if (logs.length === 0) {
      return res.json({
        stats: {
          daysLogged: 0,
          avgRatio: 0,
          avgCloseness: 0,
          avgMood: 0,
          totalPositives: 0,
          totalNegatives: 0,
          trend: 'neutral'
        }
      });
    }

    const totalPositives = logs.reduce((sum, l) => sum + l.positiveCount, 0);
    const totalNegatives = logs.reduce((sum, l) => sum + l.negativeCount, 0);
    const avgRatio = calculateRatio(totalPositives, totalNegatives);

    const closenessLogs = logs.filter(l => l.closenessScore !== null);
    const avgCloseness = closenessLogs.length > 0
      ? closenessLogs.reduce((sum, l) => sum + l.closenessScore, 0) / closenessLogs.length
      : null;

    const moodLogs = logs.filter(l => l.mood !== null);
    const avgMood = moodLogs.length > 0
      ? moodLogs.reduce((sum, l) => sum + l.mood, 0) / moodLogs.length
      : null;

    // Calculate trend (compare first half to second half)
    let trend = 'neutral';
    if (logs.length >= 4) {
      const midpoint = Math.floor(logs.length / 2);
      const firstHalf = logs.slice(0, midpoint);
      const secondHalf = logs.slice(midpoint);

      const firstAvg = firstHalf.reduce((sum, l) => sum + (l.ratio || 0), 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, l) => sum + (l.ratio || 0), 0) / secondHalf.length;

      if (secondAvg > firstAvg * 1.1) trend = 'improving';
      else if (secondAvg < firstAvg * 0.9) trend = 'declining';
    }

    res.json({
      stats: {
        daysLogged: logs.length,
        avgRatio: avgRatio === Infinity ? 999 : Math.round(avgRatio * 100) / 100,
        avgCloseness: avgCloseness !== null ? Math.round(avgCloseness) : null,
        avgMood: avgMood !== null ? Math.round(avgMood * 10) / 10 : null,
        totalPositives,
        totalNegatives,
        trend
      },
      chartData: logs.map(l => ({
        date: l.date,
        ratio: l.ratio === 999 ? null : l.ratio,
        closeness: l.closenessScore,
        mood: l.mood
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/logs/prompt
 * Get today's daily prompt
 */
router.get('/prompt', authenticate, async (req, res, next) => {
  try {
    // Check if user has logged today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayLog = await req.prisma.dailyLog.findUnique({
      where: {
        userId_date: {
          userId: req.user.id,
          date: today
        }
      }
    });

    // Get prompts based on day of week or randomized
    const prompts = [
      {
        id: 1,
        title: 'Daily Appreciation',
        prompt: 'What are 3 things you appreciated about your partner today?',
        type: 'appreciation'
      },
      {
        id: 2,
        title: 'Connection Check',
        prompt: 'Did you turn towards any bids for connection from your partner today?',
        type: 'bids'
      },
      {
        id: 3,
        title: 'Open Question',
        prompt: 'What is one thing you would like to know more about regarding your partner\'s day?',
        type: 'curiosity'
      },
      {
        id: 4,
        title: 'Positive Ratio',
        prompt: 'How many positive interactions did you have today? How many negative ones?',
        type: 'ratio'
      },
      {
        id: 5,
        title: 'Closeness Check',
        prompt: 'On a scale of 1-10, how emotionally close did you feel to your partner today?',
        type: 'closeness'
      }
    ];

    const dayOfWeek = new Date().getDay();
    const todayPrompt = prompts[dayOfWeek % prompts.length];

    res.json({
      prompt: todayPrompt,
      hasLoggedToday: !!todayLog,
      todayLog: todayLog ? {
        positiveCount: todayLog.positiveCount,
        negativeCount: todayLog.negativeCount,
        ratio: todayLog.ratio,
        journalEntry: todayLog.journalEntry,
        closenessScore: todayLog.closenessScore,
        mood: todayLog.mood
      } : null
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
