const express = require('express');
const { authenticate } = require('../middleware/auth');
const { CURRICULUM, getWeek, getAllWeeks, getPersonalizedInsight, getFocusAreas } = require('../data/curriculum');

const router = express.Router();

/**
 * GET /api/course/curriculum
 * Get full 16-week curriculum overview
 */
router.get('/curriculum', authenticate, async (req, res, next) => {
  try {
    const weeks = getAllWeeks().map(week => ({
      week: week.week,
      phase: week.phase,
      phaseName: week.phaseName,
      title: week.title,
      expert: week.expert,
      theme: week.theme
    }));

    res.json({ weeks });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/course/week/:weekNumber
 * Get detailed info for a specific week
 */
router.get('/week/:weekNumber', authenticate, async (req, res, next) => {
  try {
    const weekNumber = parseInt(req.params.weekNumber);
    
    if (weekNumber < 1 || weekNumber > 16) {
      return res.status(400).json({ error: 'Week must be between 1 and 16' });
    }

    const week = getWeek(weekNumber);
    if (!week) {
      return res.status(404).json({ error: 'Week not found' });
    }

    // Get user's assessment results for personalization
    const assessments = await req.prisma.assessment.findMany({
      where: { userId: req.user.id },
      orderBy: { completedAt: 'desc' }
    });

    // Build assessment results object
    const assessmentResults = {};
    for (const a of assessments) {
      if (!assessmentResults[a.type]) {
        assessmentResults[a.type] = a.score?.result || a.score?.primary || a.score;
      }
    }

    // Get personalized insight
    const personalizedInsight = getPersonalizedInsight(weekNumber, assessmentResults);
    const focusAreas = getFocusAreas(assessmentResults);

    res.json({
      ...week,
      personalizedInsight,
      focusAreas: focusAreas.length > 0 ? focusAreas : week.skills.slice(0, 3)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/course/progress
 * Get user's course progress
 */
router.get('/progress', authenticate, async (req, res, next) => {
  try {
    let progress = await req.prisma.courseProgress.findUnique({
      where: { userId: req.user.id },
      include: {
        weeklyStrategies: {
          orderBy: { weekNumber: 'asc' }
        }
      }
    });

    // Create progress if doesn't exist
    if (!progress) {
      progress = await req.prisma.courseProgress.create({
        data: {
          userId: req.user.id,
          currentWeek: 1,
          startedAt: new Date(),
          weekStartedAt: new Date()
        },
        include: {
          weeklyStrategies: true
        }
      });
    }

    // Calculate overall progress
    const completedWeeksCount = progress.completedWeeks?.length || 0;
    const progressPercent = Math.round((completedWeeksCount / 16) * 100);

    // Get current week info
    const currentWeekData = getWeek(progress.currentWeek);

    res.json({
      ...progress,
      progressPercent,
      currentWeekData: currentWeekData ? {
        title: currentWeekData.title,
        expert: currentWeekData.expert,
        theme: currentWeekData.theme,
        phaseName: currentWeekData.phaseName
      } : null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/course/start
 * Start the course (or restart from week 1)
 */
router.post('/start', authenticate, async (req, res, next) => {
  try {
    const progress = await req.prisma.courseProgress.upsert({
      where: { userId: req.user.id },
      create: {
        userId: req.user.id,
        currentWeek: 1,
        startedAt: new Date(),
        weekStartedAt: new Date(),
        isActive: true
      },
      update: {
        currentWeek: 1,
        startedAt: new Date(),
        weekStartedAt: new Date(),
        completedWeeks: [],
        isActive: true,
        pausedAt: null,
        completedAt: null
      }
    });

    // Create first week's strategy
    await createWeeklyStrategy(req.prisma, req.user.id, progress.id, 1);

    res.json({ message: 'Course started', progress });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/course/advance
 * Advance to next week (mark current as complete)
 */
router.post('/advance', authenticate, async (req, res, next) => {
  try {
    const progress = await req.prisma.courseProgress.findUnique({
      where: { userId: req.user.id }
    });

    if (!progress) {
      return res.status(400).json({ error: 'Course not started. Call /start first.' });
    }

    if (progress.currentWeek >= 16) {
      // Course complete!
      await req.prisma.courseProgress.update({
        where: { userId: req.user.id },
        data: {
          completedWeeks: { push: 16 },
          completedAt: new Date(),
          isActive: false
        }
      });
      return res.json({ message: 'Congratulations! You completed the 16-week course!', completed: true });
    }

    const nextWeek = progress.currentWeek + 1;

    // Mark current week complete and advance
    const updatedProgress = await req.prisma.courseProgress.update({
      where: { userId: req.user.id },
      data: {
        completedWeeks: { push: progress.currentWeek },
        currentWeek: nextWeek,
        weekStartedAt: new Date()
      }
    });

    // Create strategy for new week
    await createWeeklyStrategy(req.prisma, req.user.id, progress.id, nextWeek);

    const nextWeekData = getWeek(nextWeek);

    res.json({
      message: `Advanced to Week ${nextWeek}`,
      progress: updatedProgress,
      nextWeek: nextWeekData ? {
        title: nextWeekData.title,
        expert: nextWeekData.expert,
        theme: nextWeekData.theme
      } : null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/course/strategy
 * Get current week's personalized strategy
 */
router.get('/strategy', authenticate, async (req, res, next) => {
  try {
    const progress = await req.prisma.courseProgress.findUnique({
      where: { userId: req.user.id }
    });

    if (!progress) {
      return res.status(400).json({ error: 'Course not started' });
    }

    let strategy = await req.prisma.weeklyStrategy.findUnique({
      where: {
        courseProgressId_weekNumber: {
          courseProgressId: progress.id,
          weekNumber: progress.currentWeek
        }
      }
    });

    // Create if doesn't exist
    if (!strategy) {
      strategy = await createWeeklyStrategy(req.prisma, req.user.id, progress.id, progress.currentWeek);
    }

    // Get week data for full context
    const weekData = getWeek(progress.currentWeek);

    res.json({
      strategy,
      weekData: {
        week: weekData.week,
        title: weekData.title,
        expert: weekData.expert,
        theme: weekData.theme,
        description: weekData.description,
        skills: weekData.skills
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/course/practice
 * Log daily practice completion
 */
router.post('/practice', authenticate, async (req, res, next) => {
  try {
    const { completed, notes } = req.body;
    const today = new Date().toISOString().split('T')[0];

    const progress = await req.prisma.courseProgress.findUnique({
      where: { userId: req.user.id }
    });

    if (!progress) {
      return res.status(400).json({ error: 'Course not started' });
    }

    const strategy = await req.prisma.weeklyStrategy.findUnique({
      where: {
        courseProgressId_weekNumber: {
          courseProgressId: progress.id,
          weekNumber: progress.currentWeek
        }
      }
    });

    if (!strategy) {
      return res.status(400).json({ error: 'Weekly strategy not found' });
    }

    // Update practice log
    const practiceLog = strategy.practiceLog || {};
    practiceLog[today] = { completed, notes, timestamp: new Date().toISOString() };

    const completedDays = Object.values(practiceLog).filter(p => p.completed).length;

    await req.prisma.weeklyStrategy.update({
      where: { id: strategy.id },
      data: {
        practiceLog,
        completedDays
      }
    });

    res.json({ 
      message: 'Practice logged', 
      completedDays,
      totalDays: Object.keys(practiceLog).length 
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/course/reflection
 * Save weekly reflection
 */
router.post('/reflection', authenticate, async (req, res, next) => {
  try {
    const { reflection } = req.body;

    if (!reflection || reflection.trim().length === 0) {
      return res.status(400).json({ error: 'Reflection text required' });
    }

    const progress = await req.prisma.courseProgress.findUnique({
      where: { userId: req.user.id }
    });

    if (!progress) {
      return res.status(400).json({ error: 'Course not started' });
    }

    await req.prisma.weeklyStrategy.update({
      where: {
        courseProgressId_weekNumber: {
          courseProgressId: progress.id,
          weekNumber: progress.currentWeek
        }
      },
      data: { reflection }
    });

    res.json({ message: 'Reflection saved' });
  } catch (error) {
    next(error);
  }
});

/**
 * Helper: Create weekly strategy with personalization
 */
async function createWeeklyStrategy(prisma, userId, courseProgressId, weekNumber) {
  const weekData = getWeek(weekNumber);
  if (!weekData) return null;

  // Get user's assessment results
  const assessments = await prisma.assessment.findMany({
    where: { userId },
    orderBy: { completedAt: 'desc' }
  });

  const assessmentResults = {};
  for (const a of assessments) {
    if (!assessmentResults[a.type]) {
      assessmentResults[a.type] = a.score?.result || a.score?.primary || a.score;
    }
  }

  const personalizedInsight = getPersonalizedInsight(weekNumber, assessmentResults);
  const focusAreas = getFocusAreas(assessmentResults);

  const customInsights = personalizedInsight ? [personalizedInsight] : [];

  // Add week-specific custom insight if available
  if (weekData.customInsights?.default && !personalizedInsight) {
    customInsights.push(weekData.customInsights.default);
  }

  return prisma.weeklyStrategy.create({
    data: {
      courseProgressId,
      weekNumber,
      expertName: weekData.expert,
      theme: weekData.theme,
      focusAreas: focusAreas.length > 0 ? focusAreas : weekData.skills.slice(0, 3),
      customInsights,
      dailyPractice: weekData.dailyPractice,
      skillsToLearn: weekData.skills
    }
  });
}

module.exports = router;
