const express = require('express');
const { authenticate, requireSubscription } = require('../middleware/auth');
const { getCoursePosition } = require('../utils/coursePosition');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/videos/daily
 * Get today's video based on user's course position
 */
router.get('/daily', authenticate, requireSubscription, async (req, res, next) => {
  try {
    const position = getCoursePosition(req.user.createdAt || new Date());

    const video = await req.prisma.dailyVideo.findUnique({
      where: { week_day: { week: position.week, day: position.day } },
    });

    if (!video) {
      return res.json({
        video: null,
        position,
        completed: false,
        fallbackText: 'No video available for today. Check back tomorrow!',
      });
    }

    // Check if user has completed this video
    const completion = await req.prisma.videoCompletion.findUnique({
      where: { userId_videoId: { userId: req.user.id, videoId: video.id } },
    });

    res.json({
      video: {
        id: video.id,
        week: video.week,
        day: video.day,
        youtubeId: video.youtubeId,
        title: video.title,
        description: video.description,
      },
      position,
      completed: !!completion,
    });
  } catch (error) {
    logger.error('Failed to fetch daily video', { error: error.message, userId: req.user.id });
    next(error);
  }
});

/**
 * POST /api/videos/complete
 * Mark today's video as completed (idempotent)
 */
router.post('/complete', authenticate, requireSubscription, async (req, res, next) => {
  try {
    const { videoId } = req.body;

    if (!videoId) {
      return res.status(400).json({ error: 'videoId is required' });
    }

    // Verify video exists
    const video = await req.prisma.dailyVideo.findUnique({ where: { id: videoId } });
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Upsert completion (idempotent)
    const completion = await req.prisma.videoCompletion.upsert({
      where: { userId_videoId: { userId: req.user.id, videoId } },
      update: {},
      create: {
        userId: req.user.id,
        videoId,
      },
    });

    logger.info('Video marked as complete', { userId: req.user.id, videoId });

    res.json({ completed: true, watchedAt: completion.watchedAt });
  } catch (error) {
    logger.error('Failed to mark video complete', { error: error.message, userId: req.user.id });
    next(error);
  }
});

/**
 * GET /api/videos/streak
 * Calculate consecutive days of video completion
 */
router.get('/streak', authenticate, async (req, res, next) => {
  try {
    const completions = await req.prisma.videoCompletion.findMany({
      where: { userId: req.user.id },
      orderBy: { watchedAt: 'desc' },
      include: { video: { select: { week: true, day: true } } },
    });

    if (completions.length === 0) {
      return res.json({ streak: 0, totalCompleted: 0 });
    }

    // Calculate streak based on consecutive course days
    const position = getCoursePosition(req.user.createdAt || new Date());
    const completedDays = new Set(
      completions.map((c) => `${c.video.week}-${c.video.day}`)
    );

    let streak = 0;
    let checkWeek = position.week;
    let checkDay = position.day;

    while (checkWeek >= 1) {
      if (completedDays.has(`${checkWeek}-${checkDay}`)) {
        streak++;
        checkDay--;
        if (checkDay < 1) {
          checkDay = 7;
          checkWeek--;
        }
      } else {
        break;
      }
    }

    res.json({
      streak,
      totalCompleted: completions.length,
    });
  } catch (error) {
    logger.error('Failed to calculate video streak', { error: error.message, userId: req.user.id });
    next(error);
  }
});

module.exports = router;
