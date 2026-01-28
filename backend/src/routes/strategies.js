const express = require('express');
const { authenticate, requireSubscription } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/strategies/current
 * Get the current active strategy for the relationship
 */
router.get('/current', authenticate, async (req, res, next) => {
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

    const strategy = await req.prisma.strategy.findFirst({
      where: {
        relationshipId: relationship.id,
        isActive: true
      },
      orderBy: { week: 'desc' }
    });

    if (!strategy) {
      return res.status(404).json({
        error: 'No active strategy',
        code: 'NO_STRATEGY'
      });
    }

    res.json({
      strategy: {
        id: strategy.id,
        cycleNumber: strategy.cycleNumber,
        week: strategy.week,
        dailyActivities: strategy.dailyActivities,
        weeklyGoals: strategy.weeklyGoals,
        progress: strategy.progress,
        startDate: strategy.startDate,
        endDate: strategy.endDate
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/strategies/generate
 * Generate a new 6-week strategy based on matchup score
 */
router.post('/generate', authenticate, requireSubscription, async (req, res, next) => {
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

    // Get latest matchup
    const matchup = await req.prisma.matchup.findFirst({
      where: { relationshipId: relationship.id },
      orderBy: { generatedAt: 'desc' }
    });

    if (!matchup) {
      return res.status(400).json({
        error: 'Complete matchup assessment first',
        code: 'NO_MATCHUP'
      });
    }

    // Deactivate old strategies
    await req.prisma.strategy.updateMany({
      where: {
        relationshipId: relationship.id,
        isActive: true
      },
      data: { isActive: false }
    });

    // Get current cycle number
    const lastStrategy = await req.prisma.strategy.findFirst({
      where: { relationshipId: relationship.id },
      orderBy: { cycleNumber: 'desc' }
    });
    const cycleNumber = (lastStrategy?.cycleNumber || 0) + 1;

    // Generate 6 weeks of strategies based on matchup misses
    const strategies = [];
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    for (let week = 1; week <= 6; week++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + (week - 1) * 7);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const weekPlan = generateWeekPlan(week, matchup);

      const strategy = await req.prisma.strategy.create({
        data: {
          relationshipId: relationship.id,
          cycleNumber,
          week,
          dailyActivities: weekPlan.dailyActivities,
          weeklyGoals: weekPlan.weeklyGoals,
          progress: 0,
          isActive: true,
          startDate: weekStart,
          endDate: weekEnd
        }
      });

      strategies.push(strategy);
    }

    logger.info('Strategies generated', {
      relationshipId: relationship.id,
      cycleNumber,
      weeks: 6
    });

    res.json({
      message: '6-week strategy plan generated',
      cycleNumber,
      strategies: strategies.map(s => ({
        id: s.id,
        week: s.week,
        startDate: s.startDate,
        endDate: s.endDate,
        dailyActivities: s.dailyActivities,
        weeklyGoals: s.weeklyGoals
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/strategies/update-progress
 * Update strategy progress
 */
router.post('/update-progress', authenticate, async (req, res, next) => {
  try {
    const { strategyId, completedActivities, progress } = req.body;

    const strategy = await req.prisma.strategy.findUnique({
      where: { id: strategyId },
      include: { relationship: true }
    });

    if (!strategy) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    // Verify user is part of the relationship
    if (strategy.relationship.user1Id !== req.user.id &&
        strategy.relationship.user2Id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Calculate progress if not provided
    let calculatedProgress = progress;
    if (completedActivities !== undefined && !progress) {
      const totalActivities = Object.values(strategy.dailyActivities).flat().length +
                             strategy.weeklyGoals.length;
      calculatedProgress = Math.round((completedActivities / totalActivities) * 100);
    }

    const updated = await req.prisma.strategy.update({
      where: { id: strategyId },
      data: { progress: calculatedProgress || 0 }
    });

    res.json({
      message: 'Progress updated',
      strategy: {
        id: updated.id,
        week: updated.week,
        progress: updated.progress
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/strategies/history
 * Get strategy history
 */
router.get('/history', authenticate, async (req, res, next) => {
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

    const strategies = await req.prisma.strategy.findMany({
      where: { relationshipId: relationship.id },
      orderBy: [
        { cycleNumber: 'desc' },
        { week: 'asc' }
      ]
    });

    // Group by cycle
    const cycles = {};
    for (const s of strategies) {
      if (!cycles[s.cycleNumber]) {
        cycles[s.cycleNumber] = [];
      }
      cycles[s.cycleNumber].push({
        id: s.id,
        week: s.week,
        progress: s.progress,
        isActive: s.isActive,
        startDate: s.startDate,
        endDate: s.endDate
      });
    }

    res.json({ cycles });
  } catch (error) {
    next(error);
  }
});

// Helper function to generate week plan based on matchup
function generateWeekPlan(week, matchup) {
  const misses = matchup.alignments?.misses || [];
  const missAreas = misses.map(m => m.area);

  // Base activities for all weeks
  const baseActivities = {
    monday: ['Log 3 positive interactions you had today'],
    tuesday: ['Ask one open-ended question about your partner\'s day'],
    wednesday: ['Express appreciation for something specific your partner did'],
    thursday: ['Log your interaction ratio for the week so far'],
    friday: ['Plan one meaningful activity together for the weekend'],
    saturday: ['Spend 20 minutes of uninterrupted time together'],
    sunday: ['Reflect on the week and discuss what went well']
  };

  const weeklyGoals = ['Complete daily prompts', 'Maintain 5:1 positive ratio'];

  // Customize based on week number and misses
  switch (week) {
    case 1: // Focus: Building Friendship Foundation
      weeklyGoals.push('Learn 3 new things about your partner');
      baseActivities.tuesday.push('Share a childhood memory');
      break;

    case 2: // Focus: Appreciation and Admiration
      weeklyGoals.push('Express 7 genuine compliments this week');
      baseActivities.wednesday.push('Write a short note of appreciation');
      break;

    case 3: // Focus: Turning Towards Bids
      weeklyGoals.push('Track and respond to 10 bids for connection');
      baseActivities.thursday.push('Notice and turn towards one bid today');
      break;

    case 4: // Focus: Managing Conflict
      weeklyGoals.push('Practice one repair attempt during a disagreement');
      if (missAreas.includes('patterns')) {
        baseActivities.friday.push('Discuss your conflict styles calmly');
      }
      break;

    case 5: // Focus: Supporting Dreams
      weeklyGoals.push('Discuss one personal dream or goal with your partner');
      baseActivities.saturday.push('Ask about your partner\'s hopes for the future');
      break;

    case 6: // Focus: Creating Shared Meaning
      weeklyGoals.push('Establish or reinforce one relationship ritual');
      baseActivities.sunday.push('Discuss what you want your relationship to stand for');
      weeklyGoals.push('Prepare for reassessment next week');
      break;
  }

  // Add targeted activities based on misses
  if (missAreas.includes('attachment')) {
    baseActivities.monday.push('Practice a 6-second hug');
    weeklyGoals.push('Discuss attachment needs openly');
  }

  if (missAreas.includes('wellness')) {
    baseActivities.thursday.push('Practice a calming technique together');
    weeklyGoals.push('Support each other\'s self-care');
  }

  return {
    dailyActivities: baseActivities,
    weeklyGoals
  };
}

module.exports = router;
