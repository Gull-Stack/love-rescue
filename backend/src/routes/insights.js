const express = require('express');
const { authenticate, requireSubscription } = require('../middleware/auth');
const { getCoursePosition } = require('../utils/coursePosition');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/insights/daily
 * Get today's personalized insight based on user's course position
 */
router.get('/daily', authenticate, requireSubscription, async (req, res, next) => {
  try {
    const position = getCoursePosition(req.user.createdAt || new Date());

    const insight = await req.prisma.dailyInsight.findUnique({
      where: { week_day: { week: position.week, day: position.day } },
    });

    if (!insight) {
      return res.json({
        insight: null,
        position,
      });
    }

    // Personalize the insight based on user's assessment scores
    let text = insight.baseText;
    let isPersonalized = false;

    if (insight.personalizationTags) {
      const assessments = await req.prisma.assessment.findMany({
        where: { userId: req.user.id },
        orderBy: { completedAt: 'desc' },
      });

      const tags = insight.personalizationTags;

      // Check attachment style
      const attachmentAssessment = assessments.find((a) => a.type === 'attachment');
      if (attachmentAssessment && tags.attachment) {
        const score = attachmentAssessment.score;
        const style = score?.style || score?.primaryStyle;
        if (style && tags.attachment[style]) {
          text += '\n\n' + tags.attachment[style];
          isPersonalized = true;
        }
      }

      // Check personality type
      const personalityAssessment = assessments.find((a) => a.type === 'personality');
      if (personalityAssessment && tags.personality) {
        const score = personalityAssessment.score;
        const type = score?.dominantTrait || score?.type;
        if (type && tags.personality[type]) {
          text += '\n\n' + tags.personality[type];
          isPersonalized = true;
        }
      }
    }

    res.json({
      insight: {
        id: insight.id,
        week: insight.week,
        day: insight.day,
        text,
        isPersonalized,
      },
      position,
    });
  } catch (error) {
    logger.error('Failed to fetch daily insight', { error: error.message, userId: req.user.id });
    next(error);
  }
});

module.exports = router;
