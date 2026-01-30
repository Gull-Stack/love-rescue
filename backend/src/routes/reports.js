const express = require('express');
const { authenticate, requireSubscription } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/reports/weekly
 * Get weekly summary report
 */
router.get('/weekly', authenticate, async (req, res, next) => {
  try {
    const { weekOffset = 0 } = req.query;

    // Calculate week boundaries
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek - (parseInt(weekOffset) * 7));
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Get daily logs for the week
    const logs = await req.prisma.dailyLog.findMany({
      where: {
        userId: req.user.id,
        date: {
          gte: weekStart,
          lte: weekEnd
        }
      },
      orderBy: { date: 'asc' }
    });

    // Get relationship and strategy
    const relationship = await req.prisma.relationship.findFirst({
      where: {
        OR: [
          { user1Id: req.user.id },
          { user2Id: req.user.id }
        ]
      }
    });

    let strategy = null;
    if (relationship) {
      strategy = await req.prisma.strategy.findFirst({
        where: {
          relationshipId: relationship.id,
          isActive: true,
          startDate: { lte: weekEnd },
          endDate: { gte: weekStart }
        }
      });
    }

    // Calculate statistics
    const totalPositives = logs.reduce((sum, l) => sum + l.positiveCount, 0);
    const totalNegatives = logs.reduce((sum, l) => sum + l.negativeCount, 0);
    const avgRatio = totalNegatives > 0
      ? Math.round((totalPositives / totalNegatives) * 100) / 100
      : totalPositives > 0 ? 999 : 0;

    const closenessLogs = logs.filter(l => l.closenessScore !== null);
    const avgCloseness = closenessLogs.length > 0
      ? Math.round(closenessLogs.reduce((sum, l) => sum + l.closenessScore, 0) / closenessLogs.length)
      : null;

    const moodLogs = logs.filter(l => l.mood !== null);
    const avgMood = moodLogs.length > 0
      ? Math.round(moodLogs.reduce((sum, l) => sum + l.mood, 0) / moodLogs.length * 10) / 10
      : null;

    // Determine highlights and areas for improvement
    const highlights = [];
    const improvements = [];

    if (avgRatio >= 5) {
      highlights.push('Excellent positive interaction ratio!');
    } else if (avgRatio < 5 && avgRatio > 0) {
      improvements.push('Work on increasing positive interactions');
    }

    if (logs.length >= 5) {
      highlights.push('Great consistency with daily logging');
    } else if (logs.length < 3) {
      improvements.push('Try to log more consistently');
    }

    if (avgCloseness && avgCloseness >= 7) {
      highlights.push('Strong emotional connection this week');
    } else if (avgCloseness && avgCloseness < 5) {
      improvements.push('Focus on building emotional closeness');
    }

    // Generate recommendations
    const recommendations = generateRecommendations(logs, strategy);

    res.json({
      report: {
        weekStart,
        weekEnd,
        daysLogged: logs.length,
        statistics: {
          totalPositives,
          totalNegatives,
          avgRatio,
          avgCloseness,
          avgMood
        },
        highlights,
        improvements,
        recommendations,
        strategyProgress: strategy ? {
          week: strategy.week,
          progress: strategy.progress,
          weeklyGoals: strategy.weeklyGoals
        } : null,
        dailyBreakdown: logs.map(l => ({
          date: l.date,
          positiveCount: l.positiveCount,
          negativeCount: l.negativeCount,
          ratio: l.ratio,
          closenessScore: l.closenessScore,
          mood: l.mood
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/monthly
 * Get monthly summary report
 */
router.get('/monthly', authenticate, async (req, res, next) => {
  try {
    const { monthOffset = 0 } = req.query;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth() - parseInt(monthOffset), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - parseInt(monthOffset) + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    const logs = await req.prisma.dailyLog.findMany({
      where: {
        userId: req.user.id,
        date: {
          gte: monthStart,
          lte: monthEnd
        }
      },
      orderBy: { date: 'asc' }
    });

    // Group by week
    const weeklyData = [];
    let currentWeek = [];
    let weekNumber = 1;

    for (const log of logs) {
      currentWeek.push(log);
      if (currentWeek.length === 7 || log === logs[logs.length - 1]) {
        const weekPositives = currentWeek.reduce((s, l) => s + l.positiveCount, 0);
        const weekNegatives = currentWeek.reduce((s, l) => s + l.negativeCount, 0);

        weeklyData.push({
          week: weekNumber,
          daysLogged: currentWeek.length,
          positives: weekPositives,
          negatives: weekNegatives,
          ratio: weekNegatives > 0 ? Math.round((weekPositives / weekNegatives) * 100) / 100 : weekPositives
        });

        currentWeek = [];
        weekNumber++;
      }
    }

    // Monthly totals
    const totalPositives = logs.reduce((sum, l) => sum + l.positiveCount, 0);
    const totalNegatives = logs.reduce((sum, l) => sum + l.negativeCount, 0);

    res.json({
      report: {
        monthStart,
        monthEnd,
        daysLogged: logs.length,
        daysInMonth: monthEnd.getDate(),
        statistics: {
          totalPositives,
          totalNegatives,
          avgRatio: totalNegatives > 0
            ? Math.round((totalPositives / totalNegatives) * 100) / 100
            : totalPositives
        },
        weeklyBreakdown: weeklyData
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/progress
 * Get overall progress report (across cycles)
 */
router.get('/progress', authenticate, async (req, res, next) => {
  try {
    const relationship = await req.prisma.relationship.findFirst({
      where: {
        OR: [
          { user1Id: req.user.id },
          { user2Id: req.user.id }
        ]
      }
    });

    if (!relationship) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    // Get all matchups
    const matchups = await req.prisma.matchup.findMany({
      where: { relationshipId: relationship.id },
      orderBy: { generatedAt: 'asc' }
    });

    // Get strategy completion
    const strategies = await req.prisma.strategy.findMany({
      where: { relationshipId: relationship.id },
      orderBy: [{ cycleNumber: 'asc' }, { week: 'asc' }]
    });

    // Calculate progress over time
    const matchupProgress = matchups.map(m => ({
      date: m.generatedAt,
      score: m.score
    }));

    // Group strategies by cycle
    const cycleProgress = {};
    for (const s of strategies) {
      if (!cycleProgress[s.cycleNumber]) {
        cycleProgress[s.cycleNumber] = {
          weeks: [],
          avgProgress: 0
        };
      }
      cycleProgress[s.cycleNumber].weeks.push({
        week: s.week,
        progress: s.progress
      });
    }

    // Calculate average progress per cycle
    for (const cycle of Object.keys(cycleProgress)) {
      const weeks = cycleProgress[cycle].weeks;
      cycleProgress[cycle].avgProgress = Math.round(
        weeks.reduce((sum, w) => sum + w.progress, 0) / weeks.length
      );
    }

    res.json({
      report: {
        matchupProgress,
        cycleProgress,
        currentCycle: Object.keys(cycleProgress).length,
        overallImprovement: matchups.length >= 2
          ? matchups[matchups.length - 1].score - matchups[0].score
          : 0
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/couple-dashboard
 * Combined couple metrics dashboard
 */
router.get('/couple-dashboard', authenticate, async (req, res, next) => {
  try {
    const relationship = await req.prisma.relationship.findFirst({
      where: {
        OR: [{ user1Id: req.user.id }, { user2Id: req.user.id }],
        status: 'active'
      }
    });

    if (!relationship || !relationship.user2Id) {
      return res.status(400).json({ error: 'No active paired relationship' });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Fetch both partners' logs (aggregated — no raw journals)
    const [user1Logs, user2Logs] = await Promise.all([
      req.prisma.dailyLog.findMany({
        where: { userId: relationship.user1Id, date: { gte: thirtyDaysAgo } },
        select: { date: true, mood: true, closenessScore: true, positiveCount: true, negativeCount: true }
      }),
      req.prisma.dailyLog.findMany({
        where: { userId: relationship.user2Id, date: { gte: thirtyDaysAgo } },
        select: { date: true, mood: true, closenessScore: true, positiveCount: true, negativeCount: true }
      })
    ]);

    const avgMetric = (logs, field) => {
      const valid = logs.filter(l => l[field] !== null && l[field] !== undefined);
      if (valid.length === 0) return null;
      return Math.round(valid.reduce((sum, l) => sum + l[field], 0) / valid.length * 10) / 10;
    };

    const user1AvgMood = avgMetric(user1Logs, 'mood');
    const user2AvgMood = avgMetric(user2Logs, 'mood');
    const user1AvgCloseness = avgMetric(user1Logs, 'closenessScore');
    const user2AvgCloseness = avgMetric(user2Logs, 'closenessScore');

    // Couple Happiness Score: average of both partners' mood + closeness
    const scores = [user1AvgMood, user2AvgMood, user1AvgCloseness, user2AvgCloseness].filter(s => s !== null);
    const coupleHappinessScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10
      : null;

    // Shared goals
    const sharedGoals = await req.prisma.sharedGoal.findMany({
      where: { relationshipId: relationship.id, status: 'active' },
      orderBy: { createdAt: 'desc' }
    });

    // Latest matchup
    const latestMatchup = await req.prisma.matchup.findFirst({
      where: { relationshipId: relationship.id },
      orderBy: { generatedAt: 'desc' }
    });

    // Active strategy
    const activeStrategy = await req.prisma.strategy.findFirst({
      where: { relationshipId: relationship.id, isActive: true },
      orderBy: { week: 'desc' }
    });

    // Log access
    await req.prisma.accessLog.create({
      data: {
        accessorId: req.user.id,
        accessorRole: 'user',
        resourceType: 'couple_dashboard',
        resourceOwnerId: relationship.id,
        action: 'read',
        accessGranted: true,
        ipAddress: req.ip
      }
    });

    res.json({
      coupleHappinessScore,
      user1: { avgMood: user1AvgMood, avgCloseness: user1AvgCloseness, logCount: user1Logs.length },
      user2: { avgMood: user2AvgMood, avgCloseness: user2AvgCloseness, logCount: user2Logs.length },
      matchupScore: latestMatchup?.score || null,
      sharedGoals,
      activeStrategy: activeStrategy ? {
        week: activeStrategy.week,
        progress: activeStrategy.progress,
        weeklyGoals: activeStrategy.weeklyGoals
      } : null,
      daysTracked: Math.max(user1Logs.length, user2Logs.length)
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to generate recommendations
function generateRecommendations(logs, strategy) {
  const recommendations = [];

  if (logs.length < 3) {
    recommendations.push({
      priority: 'high',
      text: 'Try to log your interactions daily for better insights'
    });
  }

  const avgRatio = logs.length > 0
    ? logs.reduce((s, l) => s + (l.ratio || 0), 0) / logs.length
    : 0;

  if (avgRatio < 5 && avgRatio > 0) {
    recommendations.push({
      priority: 'high',
      text: 'Focus on increasing positive interactions - aim for 5:1 ratio'
    });
  }

  if (strategy && strategy.progress < 50) {
    recommendations.push({
      priority: 'medium',
      text: `Complete more activities from Week ${strategy.week} strategy`
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'low',
      text: 'Keep up the great work! Consistency is key'
    });
  }

  return recommendations;
}

module.exports = router;
