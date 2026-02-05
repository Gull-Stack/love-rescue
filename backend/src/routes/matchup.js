const express = require('express');
const { authenticate, requireSubscription } = require('../middleware/auth');
const { calculateMatchupScore } = require('../utils/scoring');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/matchup/generate
 * Generate matchup score for a relationship (requires both users to complete assessments)
 */
router.post('/generate', authenticate, requireSubscription, async (req, res, next) => {
  try {
    // Find user's relationship
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

    if (!relationship.user2Id) {
      return res.status(400).json({
        error: 'Partner has not joined yet',
        code: 'PARTNER_REQUIRED'
      });
    }

    // Get assessments for both users
    const user1Assessments = await req.prisma.assessment.findMany({
      where: { userId: relationship.user1Id }
    });

    const user2Assessments = await req.prisma.assessment.findMany({
      where: { userId: relationship.user2Id }
    });

    // Check if both have completed all core assessments
    // CRIT-01: Updated to match frontend's 10 modern assessment types
    const requiredTypes = [
      'attachment',
      'personality', 
      'love_language',
      'human_needs',
      'gottman_checkup',
      'emotional_intelligence',
      'conflict_style',
      'differentiation',
      'hormonal_health',
      'physical_vitality'
    ];

    const user1Types = new Set(user1Assessments.map(a => a.type));
    const user2Types = new Set(user2Assessments.map(a => a.type));

    const user1Missing = requiredTypes.filter(t => !user1Types.has(t));
    const user2Missing = requiredTypes.filter(t => !user2Types.has(t));

    if (user1Missing.length > 0 || user2Missing.length > 0) {
      return res.status(400).json({
        error: 'Both partners must complete all assessments',
        code: 'ASSESSMENTS_INCOMPLETE',
        user1Missing,
        user2Missing
      });
    }

    // Calculate matchup score
    const matchupResult = calculateMatchupScore(user1Assessments, user2Assessments);

    // Save matchup
    const matchup = await req.prisma.matchup.create({
      data: {
        relationshipId: relationship.id,
        score: matchupResult.score,
        alignments: {
          compatible: matchupResult.alignments,
          misses: matchupResult.misses
        },
        details: matchupResult.details
      }
    });

    logger.info('Matchup generated', {
      relationshipId: relationship.id,
      score: matchupResult.score
    });

    res.json({
      message: 'Matchup score generated',
      matchup: {
        id: matchup.id,
        score: matchup.score,
        alignments: matchupResult.alignments,
        misses: matchupResult.misses,
        details: matchupResult.details,
        generatedAt: matchup.generatedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/matchup/current
 * Get the current matchup score for the relationship
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

    const matchup = await req.prisma.matchup.findFirst({
      where: { relationshipId: relationship.id },
      orderBy: { generatedAt: 'desc' }
    });

    if (!matchup) {
      return res.status(404).json({
        error: 'No matchup score yet',
        code: 'NO_MATCHUP'
      });
    }

    res.json({
      matchup: {
        id: matchup.id,
        score: matchup.score,
        alignments: matchup.alignments.compatible || matchup.alignments,
        misses: matchup.alignments.misses || [],
        details: matchup.details,
        generatedAt: matchup.generatedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/matchup/history
 * Get matchup score history
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

    const matchups = await req.prisma.matchup.findMany({
      where: { relationshipId: relationship.id },
      orderBy: { generatedAt: 'desc' },
      take: 10
    });

    res.json({
      matchups: matchups.map(m => ({
        id: m.id,
        score: m.score,
        generatedAt: m.generatedAt
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/matchup/status
 * Check if matchup can be generated (both partners completed assessments)
 */
router.get('/status', authenticate, async (req, res, next) => {
  try {
    const relationship = await req.prisma.relationship.findFirst({
      where: {
        OR: [
          { user1Id: req.user.id },
          { user2Id: req.user.id }
        ]
      },
      include: {
        user1: { select: { id: true, firstName: true } },
        user2: { select: { id: true, firstName: true } }
      }
    });

    if (!relationship) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    // CRIT-01: Updated to match frontend's 10 modern assessment types
    const requiredTypes = [
      'attachment',
      'personality', 
      'love_language',
      'human_needs',
      'gottman_checkup',
      'emotional_intelligence',
      'conflict_style',
      'differentiation',
      'hormonal_health',
      'physical_vitality'
    ];

    // User 1 progress
    const user1Assessments = await req.prisma.assessment.findMany({
      where: { userId: relationship.user1Id },
      select: { type: true }
    });
    const user1Completed = new Set(user1Assessments.map(a => a.type));

    // User 2 progress (if exists)
    let user2Completed = new Set();
    if (relationship.user2Id) {
      const user2Assessments = await req.prisma.assessment.findMany({
        where: { userId: relationship.user2Id },
        select: { type: true }
      });
      user2Completed = new Set(user2Assessments.map(a => a.type));
    }

    const status = {
      hasPartner: !!relationship.user2Id,
      user1: {
        id: relationship.user1Id,
        name: relationship.user1?.firstName || 'Partner 1',
        completed: requiredTypes.filter(t => user1Completed.has(t)),
        pending: requiredTypes.filter(t => !user1Completed.has(t))
      },
      user2: relationship.user2Id ? {
        id: relationship.user2Id,
        name: relationship.user2?.firstName || 'Partner 2',
        completed: requiredTypes.filter(t => user2Completed.has(t)),
        pending: requiredTypes.filter(t => !user2Completed.has(t))
      } : null,
      canGenerateMatchup: relationship.user2Id &&
        requiredTypes.every(t => user1Completed.has(t)) &&
        requiredTypes.every(t => user2Completed.has(t))
    };

    res.json(status);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
