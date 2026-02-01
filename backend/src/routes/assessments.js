const express = require('express');
const { authenticate, requireSubscription } = require('../middleware/auth');
const logger = require('../utils/logger');
const { scoreAssessment, calculateMatchupScore, calculateRatio } = require('../utils/scoring');
const { getQuestions, getAvailableAssessments, validateResponses } = require('../utils/questionBank');
const { getInterpretation } = require('../utils/interpretations');

const router = express.Router();

// All supported assessment types
const VALID_TYPES = [
  'attachment', 'personality', 'love_language', 'human_needs',
  'gottman_checkup', 'emotional_intelligence', 'conflict_style', 'differentiation',
  // Legacy types
  'wellness_behavior', 'negative_patterns_closeness'
];

/**
 * GET /api/assessments/catalog
 * Get list of all available assessments with metadata
 */
router.get('/catalog', authenticate, async (req, res, next) => {
  try {
    const catalog = getAvailableAssessments();

    // Get user's completed assessments
    const completed = await req.prisma.assessment.findMany({
      where: { userId: req.user.id },
      orderBy: { completedAt: 'desc' },
      select: { type: true, completedAt: true }
    });

    const completedTypes = {};
    for (const a of completed) {
      if (!completedTypes[a.type]) {
        completedTypes[a.type] = a.completedAt;
      }
    }

    // Merge completion status into catalog
    const enriched = catalog.map(a => ({
      ...a,
      completed: !!completedTypes[a.type],
      completedAt: completedTypes[a.type] || null
    }));

    res.json({ assessments: enriched });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/assessments/questions/:type
 * Get quiz questions for an assessment type
 */
router.get('/questions/:type', authenticate, async (req, res, next) => {
  try {
    const { type } = req.params;

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid assessment type' });
    }

    const result = getQuestions(type);

    if (!result || !result.questions) {
      return res.status(400).json({ error: 'Questions not available for this type' });
    }

    res.json({ type, questions: result.questions, count: result.questions.length });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/assessments/submit
 * Submit assessment responses and calculate scores
 */
router.post('/submit', authenticate, requireSubscription, async (req, res, next) => {
  try {
    const { type, responses } = req.body;

    if (!type || !responses) {
      return res.status(400).json({ error: 'Type and responses are required' });
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid assessment type' });
    }

    // Validate responses if validator is available
    if (validateResponses) {
      const validation = validateResponses(type, responses);
      if (validation && !validation.valid) {
        return res.status(400).json({ error: validation.error || 'Invalid responses' });
      }
    }

    // Calculate score
    const score = scoreAssessment(type, responses);

    if (!score) {
      return res.status(500).json({ error: 'Failed to calculate score' });
    }

    // Check if assessment already exists (update) or create new
    const existing = await req.prisma.assessment.findFirst({
      where: {
        userId: req.user.id,
        type
      },
      orderBy: { completedAt: 'desc' }
    });

    let assessment;
    if (existing) {
      assessment = await req.prisma.assessment.update({
        where: { id: existing.id },
        data: {
          responses,
          score,
          completedAt: new Date()
        }
      });
    } else {
      assessment = await req.prisma.assessment.create({
        data: {
          userId: req.user.id,
          type,
          responses,
          score
        }
      });
    }

    // Get interpretation
    const interpretation = getInterpretation(type, score);

    logger.info('Assessment submitted', { userId: req.user.id, type });

    res.json({
      message: 'Assessment completed',
      assessment: {
        id: assessment.id,
        type: assessment.type,
        score: assessment.score,
        completedAt: assessment.completedAt
      },
      interpretation
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/assessments/results
 * Get all assessment results for current user
 */
router.get('/results', authenticate, async (req, res, next) => {
  try {
    const assessments = await req.prisma.assessment.findMany({
      where: { userId: req.user.id },
      orderBy: { completedAt: 'desc' }
    });

    // Group by type, keeping most recent
    const latestByType = {};
    for (const a of assessments) {
      if (!latestByType[a.type]) {
        latestByType[a.type] = {
          id: a.id,
          type: a.type,
          score: a.score,
          completedAt: a.completedAt
        };
      }
    }

    const completed = Object.values(latestByType);
    const completedTypes = Object.keys(latestByType);
    const pending = VALID_TYPES.filter(t => !completedTypes.includes(t));
    // Exclude legacy types from "required" count
    const coreTypes = VALID_TYPES.filter(t => !['wellness_behavior', 'negative_patterns_closeness'].includes(t));
    const coreCompleted = coreTypes.filter(t => completedTypes.includes(t));

    res.json({
      completed,
      pending,
      allCompleted: coreCompleted.length >= coreTypes.length,
      progress: {
        completed: coreCompleted.length,
        total: coreTypes.length,
        percentage: Math.round((coreCompleted.length / coreTypes.length) * 100)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/assessments/results/:type
 * Get specific assessment result with rich interpretation
 */
router.get('/results/:type', authenticate, async (req, res, next) => {
  try {
    const { type } = req.params;

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid assessment type' });
    }

    const assessment = await req.prisma.assessment.findFirst({
      where: {
        userId: req.user.id,
        type
      },
      orderBy: { completedAt: 'desc' }
    });

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Get rich interpretation
    const interpretation = getInterpretation(type, assessment.score);

    res.json({
      assessment: {
        id: assessment.id,
        type: assessment.type,
        score: assessment.score,
        completedAt: assessment.completedAt
      },
      interpretation
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/assessments/results/:type/detailed
 * Get detailed assessment result with full interpretation, action steps, frameworks
 */
router.get('/results/:type/detailed', authenticate, async (req, res, next) => {
  try {
    const { type } = req.params;

    const assessment = await req.prisma.assessment.findFirst({
      where: {
        userId: req.user.id,
        type
      },
      orderBy: { completedAt: 'desc' }
    });

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const interpretation = getInterpretation(type, assessment.score);

    // Get previous attempts for comparison
    const history = await req.prisma.assessment.findMany({
      where: {
        userId: req.user.id,
        type
      },
      orderBy: { completedAt: 'desc' },
      take: 5,
      select: { score: true, completedAt: true }
    });

    res.json({
      assessment: {
        id: assessment.id,
        type: assessment.type,
        score: assessment.score,
        completedAt: assessment.completedAt
      },
      interpretation,
      history: history.map(h => ({
        score: h.score,
        completedAt: h.completedAt
      })),
      philosophy: 'This assessment is a mirror showing YOUR patterns. Use these insights to understand yourself — not to diagnose or blame your partner. You are the creator of your relationship experience.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/assessments/profile
 * Unified self-portrait combining ALL completed assessments
 */
router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const assessments = await req.prisma.assessment.findMany({
      where: { userId: req.user.id },
      orderBy: { completedAt: 'desc' }
    });

    // Get latest of each type
    const latest = {};
    for (const a of assessments) {
      if (!latest[a.type]) {
        latest[a.type] = a;
      }
    }

    // Build unified profile
    const profile = {
      completedAssessments: Object.keys(latest).length,
      totalAssessments: 8,

      // Know Yourself
      knowYourself: {},

      // Own Yourself
      ownYourself: {},

      // Grow Yourself
      growYourself: {},

      // Unified insights
      unifiedInsights: [],

      // Growth edges
      primaryGrowthEdges: [],

      // Connected action plan
      actionPlan: []
    };

    // Attachment
    if (latest.attachment) {
      const interp = getInterpretation('attachment', latest.attachment.score);
      profile.knowYourself.attachment = {
        style: latest.attachment.score.style,
        title: interp.title,
        summary: interp.description,
        scores: interp.scores
      };
    }

    // Personality
    if (latest.personality) {
      const interp = getInterpretation('personality', latest.personality.score);
      profile.knowYourself.personality = {
        type: latest.personality.score.type,
        description: latest.personality.score.description,
        dimensions: interp.dimensions
      };
    }

    // Love Language
    if (latest.love_language) {
      const interp = getInterpretation('love_language', latest.love_language.score);
      profile.knowYourself.loveLanguage = {
        primary: interp.primary?.title,
        secondary: interp.secondary?.title,
        allScores: interp.allScores
      };
    }

    // Human Needs
    if (latest.human_needs) {
      const interp = getInterpretation('human_needs', latest.human_needs.score);
      profile.knowYourself.humanNeeds = {
        topTwo: latest.human_needs.score.topTwo,
        profile: latest.human_needs.score.profile,
        summary: interp.overallInsight
      };
    }

    // Gottman
    if (latest.gottman_checkup) {
      const interp = getInterpretation('gottman_checkup', latest.gottman_checkup.score);
      profile.ownYourself.gottman = {
        overallHealth: interp.overallHealth,
        horsemen: Object.entries(interp.horsemen || {}).map(([name, data]) => ({
          name, level: data.level, score: data.score
        })),
        strengths: Object.entries(interp.strengths || {}).map(([name, data]) => ({
          name: data.title, score: data.score
        }))
      };
    }

    // EQ
    if (latest.emotional_intelligence) {
      const interp = getInterpretation('emotional_intelligence', latest.emotional_intelligence.score);
      profile.ownYourself.emotionalIntelligence = {
        overall: interp.overall,
        domains: Object.entries(interp.domains || {}).map(([name, data]) => ({
          name: data.title, score: data.score, level: data.level
        }))
      };
    }

    // Conflict Style
    if (latest.conflict_style) {
      const interp = getInterpretation('conflict_style', latest.conflict_style.score);
      profile.growYourself.conflictStyle = {
        primary: interp.primary?.title,
        secondary: interp.secondary?.title,
        growthPath: interp.primary?.growthPath
      };
    }

    // Differentiation
    if (latest.differentiation) {
      const interp = getInterpretation('differentiation', latest.differentiation.score);
      profile.growYourself.differentiation = {
        level: interp.title,
        score: interp.score,
        growthEdge: interp.growthEdge,
        insight: interp.finlaysonFifeInsight
      };
    }

    // Generate unified insights
    profile.unifiedInsights = generateUnifiedInsights(profile);
    profile.primaryGrowthEdges = generateGrowthEdges(profile);
    profile.actionPlan = generateActionPlan(profile);

    profile.philosophy = 'This is YOUR self-portrait in love. Every insight here is about understanding and growing YOURSELF. The relationship transforms as a byproduct of your individual transformation.';

    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/assessments/compare/:type
 * Compare your results with partner (if both completed)
 */
router.get('/compare/:type', authenticate, async (req, res, next) => {
  try {
    const { type } = req.params;

    // Find user's relationship
    const relationship = await req.prisma.relationship.findFirst({
      where: {
        OR: [
          { user1Id: req.user.id },
          { user2Id: req.user.id }
        ],
        status: 'active',
        sharedConsent: true
      }
    });

    if (!relationship) {
      return res.status(404).json({ error: 'No active relationship with shared consent found' });
    }

    const partnerId = relationship.user1Id === req.user.id
      ? relationship.user2Id
      : relationship.user1Id;

    if (!partnerId) {
      return res.status(404).json({ error: 'Partner has not joined yet' });
    }

    // Get both assessments
    const [myAssessment, partnerAssessment] = await Promise.all([
      req.prisma.assessment.findFirst({
        where: { userId: req.user.id, type },
        orderBy: { completedAt: 'desc' }
      }),
      req.prisma.assessment.findFirst({
        where: { userId: partnerId, type },
        orderBy: { completedAt: 'desc' }
      })
    ]);

    if (!myAssessment || !partnerAssessment) {
      return res.status(404).json({
        error: 'Both partners must complete this assessment',
        myCompleted: !!myAssessment,
        partnerCompleted: !!partnerAssessment
      });
    }

    res.json({
      myResult: {
        score: myAssessment.score,
        interpretation: getInterpretation(type, myAssessment.score)
      },
      partnerResult: {
        score: partnerAssessment.score,
        // Only share interpretation, not raw responses (privacy)
        interpretation: getInterpretation(type, partnerAssessment.score)
      },
      insight: 'Understanding your differences is not about who needs to change — it\'s about how you can each grow individually to create a stronger connection together.'
    });
  } catch (error) {
    next(error);
  }
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function generateUnifiedInsights(profile) {
  const insights = [];

  // Attachment + Conflict Style connection
  if (profile.knowYourself.attachment && profile.growYourself.conflictStyle) {
    const style = profile.knowYourself.attachment.style;
    const conflict = profile.growYourself.conflictStyle.primary;

    if (style === 'anxious' && conflict === 'Competing') {
      insights.push('Your anxious attachment combined with a competing conflict style means you may escalate during disagreements out of fear of disconnection. Practice pausing before engaging.');
    } else if (style === 'avoidant' && conflict === 'Avoiding') {
      insights.push('Your avoidant attachment aligns with an avoiding conflict style — you may withdraw from important conversations. Practice staying present even when uncomfortable.');
    }
  }

  // Human Needs + Attachment connection
  if (profile.knowYourself.humanNeeds && profile.knowYourself.attachment) {
    const topNeeds = profile.knowYourself.humanNeeds.topTwo || [];
    const style = profile.knowYourself.attachment.style;

    if (topNeeds.includes('certainty') && style === 'anxious') {
      insights.push('Your high need for certainty combined with anxious attachment means you may seek constant reassurance. Build internal certainty through self-trust practices.');
    }
    if (topNeeds.includes('significance') && style === 'avoidant') {
      insights.push('Your need for significance combined with avoidant attachment may make you prioritize achievement over connection. Remember: being deeply known is the highest form of significance.');
    }
  }

  // Generic insight if no specific patterns
  if (insights.length === 0) {
    insights.push('Complete more assessments to unlock deeper cross-framework insights about your unique patterns.');
  }

  return insights;
}

function generateGrowthEdges(profile) {
  const edges = [];

  if (profile.growYourself.differentiation) {
    const score = profile.growYourself.differentiation.score;
    if (score < 50) {
      edges.push({ area: 'Differentiation', priority: 'high', description: 'Building your solid sense of self is your primary growth area. This improves everything else.' });
    }
  }

  if (profile.ownYourself.gottman) {
    const horsemen = profile.ownYourself.gottman.horsemen || [];
    const worst = horsemen.sort((a, b) => (b.score || 0) - (a.score || 0))[0];
    if (worst && worst.score > 50) {
      edges.push({ area: `Gottman: ${worst.name}`, priority: 'high', description: `Your strongest horseman is ${worst.name}. Focus on its antidote.` });
    }
  }

  if (profile.ownYourself.emotionalIntelligence) {
    const domains = profile.ownYourself.emotionalIntelligence.domains || [];
    const lowest = domains.sort((a, b) => (a.score || 0) - (b.score || 0))[0];
    if (lowest && lowest.score < 40) {
      edges.push({ area: `EQ: ${lowest.name}`, priority: 'medium', description: `Strengthening your ${lowest.name} will improve your overall emotional intelligence.` });
    }
  }

  return edges;
}

function generateActionPlan(profile) {
  const plan = [];

  plan.push({
    timeframe: 'Daily',
    actions: [
      'A.R.E. check-in: Am I Accessible, Responsive, Engaged? (Johnson)',
      'Notice and respond to one bid for connection (Gottman)',
      'Practice one moment of tactical empathy (Voss)'
    ]
  });

  plan.push({
    timeframe: 'Weekly',
    actions: [
      'Self-confrontation journal: Where did I blame this week? Where did I grow? (Finlayson-Fife)',
      'Love Map update: Learn one new thing about your partner\'s inner world (Gottman)',
      'State management practice: Set your emotional intention before difficult conversations (Belfort)'
    ]
  });

  plan.push({
    timeframe: 'Monthly',
    actions: [
      'Retake one assessment to track growth',
      'Review your growth edges and adjust your practice',
      'Have a "Hold Me Tight" conversation with your partner (Johnson)'
    ]
  });

  return plan;
}

module.exports = router;
