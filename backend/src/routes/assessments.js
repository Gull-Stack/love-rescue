const express = require('express');
const { authenticate, requireSubscription } = require('../middleware/auth');
const logger = require('../utils/logger');
const {
  scoreAttachment,
  scorePersonality,
  scoreWellnessBehavior,
  scoreNegativePatterns
} = require('../utils/scoring');

const router = express.Router();

/**
 * GET /api/assessments/questions/:type
 * Get quiz questions for an assessment type
 */
router.get('/questions/:type', authenticate, async (req, res, next) => {
  try {
    const { type } = req.params;
    const questions = getQuestions(type);

    if (!questions) {
      return res.status(400).json({ error: 'Invalid assessment type' });
    }

    res.json({ type, questions });
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

    const validTypes = ['attachment', 'personality', 'wellness_behavior', 'negative_patterns_closeness'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid assessment type' });
    }

    // Calculate score based on type
    let score;
    switch (type) {
      case 'attachment':
        score = scoreAttachment(responses);
        break;
      case 'personality':
        score = scorePersonality(responses);
        break;
      case 'wellness_behavior':
        score = scoreWellnessBehavior(responses);
        break;
      case 'negative_patterns_closeness':
        score = scoreNegativePatterns(responses);
        break;
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

    logger.info('Assessment submitted', { userId: req.user.id, type });

    res.json({
      message: 'Assessment completed',
      assessment: {
        id: assessment.id,
        type: assessment.type,
        score: assessment.score,
        completedAt: assessment.completedAt
      }
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

    const allTypes = ['attachment', 'personality', 'wellness_behavior', 'negative_patterns_closeness'];
    const completed = Object.keys(latestByType);
    const pending = allTypes.filter(t => !completed.includes(t));

    res.json({
      completed: Object.values(latestByType),
      pending,
      allCompleted: pending.length === 0
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/assessments/results/:type
 * Get specific assessment result with details
 */
router.get('/results/:type', authenticate, async (req, res, next) => {
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

    // Get interpretation
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

// Helper function to get questions by type
function getQuestions(type) {
  const questionBank = {
    attachment: [
      { id: 1, text: "I often worry my partner doesn't really love me.", category: 'anxious' },
      { id: 2, text: "I prefer not to depend on others or have them depend on me.", category: 'avoidant' },
      { id: 3, text: "I feel comfortable sharing my innermost thoughts with my partner.", category: 'secure' },
      { id: 4, text: "Relationships make me feel trapped.", category: 'dismissive' },
      { id: 5, text: "I fear being abandoned.", category: 'fearful' },
      { id: 6, text: "I am okay with emotional closeness.", category: 'secure' },
      { id: 7, text: "I pull away when things get too intimate.", category: 'avoidant' },
      { id: 8, text: "I need constant reassurance from my partner.", category: 'anxious' },
      { id: 9, text: "I value independence over emotional bonds.", category: 'dismissive' },
      { id: 10, text: "I have trouble trusting partners fully.", category: 'fearful' },
      { id: 11, text: "I enjoy deep emotional connections without fear.", category: 'secure' },
      { id: 12, text: "I avoid conflict to prevent rejection.", category: 'anxious' }
    ],
    personality: [
      { id: 1, text: "You enjoy large social gatherings.", dimension: 'EI', direction: 'E' },
      { id: 2, text: "You focus on facts more than ideas.", dimension: 'SN', direction: 'S' },
      { id: 3, text: "Decisions are based on logic over feelings.", dimension: 'TF', direction: 'T' },
      { id: 4, text: "You prefer structured plans.", dimension: 'JP', direction: 'J' },
      { id: 5, text: "You make new friends easily.", dimension: 'EI', direction: 'E' },
      { id: 6, text: "You daydream about possibilities.", dimension: 'SN', direction: 'N' },
      { id: 7, text: "You prioritize harmony in groups.", dimension: 'TF', direction: 'F' },
      { id: 8, text: "You adapt to changes flexibly.", dimension: 'JP', direction: 'P' },
      { id: 9, text: "You recharge alone.", dimension: 'EI', direction: 'I' },
      { id: 10, text: "You trust intuition over data.", dimension: 'SN', direction: 'N' },
      { id: 11, text: "You confront issues directly.", dimension: 'TF', direction: 'T' },
      { id: 12, text: "You organize your space meticulously.", dimension: 'JP', direction: 'J' },
      { id: 13, text: "You avoid crowds.", dimension: 'EI', direction: 'I' },
      { id: 14, text: "You see patterns in abstract concepts.", dimension: 'SN', direction: 'N' },
      { id: 15, text: "Empathy guides your choices.", dimension: 'TF', direction: 'F' },
      { id: 16, text: "Spontaneity excites you.", dimension: 'JP', direction: 'P' },
      { id: 17, text: "You network at events.", dimension: 'EI', direction: 'E' },
      { id: 18, text: "You question established facts.", dimension: 'SN', direction: 'N' },
      { id: 19, text: "You value fairness over kindness.", dimension: 'TF', direction: 'T' },
      { id: 20, text: "Deadlines motivate you.", dimension: 'JP', direction: 'J' }
    ],
    wellness_behavior: [
      { id: 1, text: "When disappointed, I communicate my needs calmly.", positive: true },
      { id: 2, text: "I withdraw and sulk when things don't go my way.", positive: false },
      { id: 3, text: "I blame others for my frustrations.", positive: false },
      { id: 4, text: "I reflect and adjust my expectations.", positive: true },
      { id: 5, text: "I become overly critical of myself or partner.", positive: false },
      { id: 6, text: "I seek compromise solutions.", positive: true },
      { id: 7, text: "I ignore the issue to avoid conflict.", positive: false },
      { id: 8, text: "I express anger constructively.", positive: true },
      { id: 9, text: "I ruminate on negatives.", positive: false },
      { id: 10, text: "I practice self-care to regain balance.", positive: true }
    ],
    negative_patterns_closeness: [
      { id: 1, text: "I often point out my partner's flaws.", pattern: 'criticism' },
      { id: 2, text: "When blamed, I counter with my own complaints.", pattern: 'defensiveness' },
      { id: 3, text: "I use sarcasm or mockery during arguments.", pattern: 'disrespect' },
      { id: 4, text: "I shut down during tough talks.", pattern: 'withdrawal' },
      { id: 5, text: "I feel emotionally close to my partner daily.", pattern: 'closeness' },
      { id: 6, text: "We express appreciation regularly.", pattern: 'closeness' },
      { id: 7, text: "Conflicts escalate to insults.", pattern: 'disrespect' },
      { id: 8, text: "I avoid responsibility in disputes.", pattern: 'defensiveness' },
      { id: 9, text: "Complaints turn into character attacks.", pattern: 'criticism' },
      { id: 10, text: "I tune out when overwhelmed.", pattern: 'withdrawal' },
      { id: 11, text: "We share dreams and values openly.", pattern: 'closeness' },
      { id: 12, text: "Our interactions are mostly positive.", pattern: 'closeness' },
      { id: 13, text: "I feel superior in arguments.", pattern: 'disrespect' },
      { id: 14, text: "I whine to defend myself.", pattern: 'defensiveness' },
      { id: 15, text: "We repair after fights quickly.", pattern: 'closeness' }
    ]
  };

  return questionBank[type] || null;
}

// Helper function to get interpretation
function getInterpretation(type, score) {
  const interpretations = {
    attachment: {
      secure: {
        title: 'Secure Attachment',
        description: 'You feel comfortable with intimacy and independence. You tend to have trusting, lasting relationships.',
        tips: ['Continue nurturing open communication', 'Support your partner\'s independence while maintaining closeness']
      },
      anxious: {
        title: 'Anxious Attachment',
        description: 'You may seek more reassurance and closeness. Fear of abandonment can sometimes affect your relationships.',
        tips: ['Practice self-soothing techniques', 'Communicate needs directly instead of seeking validation', 'Build self-confidence independent of relationships']
      },
      avoidant: {
        title: 'Avoidant Attachment',
        description: 'You value independence highly and may find too much closeness uncomfortable.',
        tips: ['Practice gradual emotional opening', 'Recognize when you\'re pulling away', 'Challenge beliefs about needing to be self-reliant']
      },
      'dismissive-fearful': {
        title: 'Dismissive-Fearful Attachment',
        description: 'You may experience conflicting desires for closeness and independence, sometimes leading to relationship difficulties.',
        tips: ['Work on building trust gradually', 'Consider professional support to explore attachment patterns', 'Practice vulnerability in safe contexts']
      }
    },
    personality: {
      title: `Personality Type: ${score.type}`,
      description: score.description || 'Your unique personality type influences how you interact in relationships.',
      tips: ['Learn your partner\'s type for better understanding', 'Recognize your strengths in communication', 'Adapt your approach to complement your partner']
    },
    wellness_behavior: {
      high: {
        title: 'Strong Coping Skills',
        description: 'You generally handle disappointment and frustration in healthy ways.',
        tips: ['Continue practicing healthy communication', 'Share your coping strategies with your partner']
      },
      medium: {
        title: 'Mixed Coping Patterns',
        description: 'You have some healthy coping strategies but may fall into unhelpful patterns under stress.',
        tips: ['Identify your triggers', 'Develop a plan for high-stress moments', 'Practice pause-and-reflect before reacting']
      },
      low: {
        title: 'Areas for Growth',
        description: 'You may benefit from developing healthier ways to handle not getting what you want.',
        tips: ['Practice "I feel" statements', 'Learn about emotional regulation', 'Consider couples counseling for communication skills']
      }
    }
  };

  if (type === 'attachment') {
    return interpretations.attachment[score.style] || interpretations.attachment.secure;
  } else if (type === 'personality') {
    return interpretations.personality;
  } else if (type === 'wellness_behavior') {
    if (score.score >= 70) return interpretations.wellness_behavior.high;
    if (score.score >= 40) return interpretations.wellness_behavior.medium;
    return interpretations.wellness_behavior.low;
  } else if (type === 'negative_patterns_closeness') {
    return {
      title: 'Relationship Patterns Analysis',
      patterns: score.patterns,
      closeness: score.closeness,
      tips: generatePatternTips(score)
    };
  }

  return null;
}

function generatePatternTips(score) {
  const tips = [];
  if (score.patterns.criticism > 10) tips.push('Try expressing complaints without criticizing character');
  if (score.patterns.defensiveness > 10) tips.push('Practice taking responsibility for your part');
  if (score.patterns.disrespect > 10) tips.push('Replace contempt with appreciation exercises');
  if (score.patterns.withdrawal > 10) tips.push('Learn to take breaks and return to discussions');
  if (score.closeness < 60) tips.push('Increase daily expressions of affection and appreciation');
  return tips;
}

module.exports = router;
