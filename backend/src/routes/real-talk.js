const express = require('express');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// --- Gentle Startup Generator (pure logic, no external AI) ---

const COLLABORATIVE_CLOSERS = [
  'Can we work on this together?',
  'Would you be open to trying this?',
  'What do you think?',
  'Could we talk about this?',
  'Would you be willing to try?',
];

// Abuse keywords trigger safety response instead of gentle startup
const ABUSE_KEYWORDS = [
  'hit', 'punch', 'slap', 'choke', 'force', 'threaten',
  'assault', 'rape', 'abuse', 'strangle', 'shove', 'kick',
];

// Attack-like language patterns (character attacks vs behavior descriptions)
const ATTACK_PATTERNS = [
  /\byou always\b/i,
  /\byou never\b/i,
  /\byou'?re (?:so |such a? ?)?(?:selfish|lazy|stupid|worthless|pathetic|terrible|horrible|useless|disgusting)\b/i,
  /\byou don'?t care\b/i,
  /\byou'?re the (?:worst|problem)\b/i,
];

function containsAbuseKeywords(text) {
  const lower = text.toLowerCase();
  return ABUSE_KEYWORDS.some(keyword => {
    const regex = new RegExp(`\\b${keyword}(?:s|ed|ing|d)?\\b`, 'i');
    return regex.test(lower);
  });
}

function detectAttackLanguage(text) {
  const warnings = [];
  for (const pattern of ATTACK_PATTERNS) {
    if (pattern.test(text)) {
      warnings.push('This sounds like it describes character rather than behavior. Try focusing on a specific action or event.');
      break;
    }
  }
  return warnings;
}

function generateGentleStartup(issue, feeling, need) {
  const closer = COLLABORATIVE_CLOSERS[Math.floor(Math.random() * COLLABORATIVE_CLOSERS.length)];
  return `I feel ${feeling.trim().toLowerCase()} when ${issue.trim().toLowerCase().replace(/\.$/, '')}. I need ${need.trim().toLowerCase().replace(/\.$/, '')}. ${closer}`;
}

// --- Routes ---

/**
 * POST /api/real-talk
 * Create a new Real Talk (validate inputs, generate gentle startup)
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { issue, feeling, need } = req.body;

    if (!issue || !issue.trim()) {
      return res.status(400).json({ error: 'Issue is required' });
    }
    if (!feeling || !feeling.trim()) {
      return res.status(400).json({ error: 'Feeling is required' });
    }
    if (!need || !need.trim()) {
      return res.status(400).json({ error: 'Need is required' });
    }

    // Safety check: abuse detection
    const allText = `${issue} ${feeling} ${need}`;
    if (containsAbuseKeywords(allText)) {
      return res.status(200).json({
        safety: true,
        message: 'It sounds like you may be describing abuse. Your safety matters most.',
        hotline: '1-800-799-7233',
        textLine: 'Text START to 88788',
        url: 'https://www.thehotline.org',
      });
    }

    // Validate for attack language (warnings, not blocking)
    const issueWarnings = detectAttackLanguage(issue);
    const feelingWarnings = detectAttackLanguage(feeling);

    const generatedStartup = generateGentleStartup(issue, feeling, need);

    const realTalk = await req.prisma.realTalk.create({
      data: {
        userId: req.user.id,
        issue: issue.trim(),
        feeling: feeling.trim(),
        need: need.trim(),
        generatedStartup,
      },
    });

    logger.info('Real Talk created', { userId: req.user.id, realTalkId: realTalk.id });

    // Count user's total Real Talks for expert quote selection
    const totalCount = await req.prisma.realTalk.count({
      where: { userId: req.user.id, deletedAt: null },
    });

    res.status(201).json({
      realTalk,
      warnings: [...issueWarnings, ...feelingWarnings],
      totalCount,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/real-talk
 * List user's Real Talks (paginated, newest first)
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const where = {
      userId: req.user.id,
      deletedAt: null,
    };

    const [realTalks, total] = await Promise.all([
      req.prisma.realTalk.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(parseInt(limit), 50),
        skip: parseInt(offset),
      }),
      req.prisma.realTalk.count({ where }),
    ]);

    res.json({
      realTalks,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + realTalks.length < total,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/real-talk/:id
 * Get a single Real Talk
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const realTalk = await req.prisma.realTalk.findUnique({
      where: { id: req.params.id },
    });

    if (!realTalk || realTalk.deletedAt) {
      return res.status(404).json({ error: 'Real Talk not found' });
    }

    if (realTalk.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not your Real Talk' });
    }

    res.json({ realTalk });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/real-talk/:id/effectiveness
 * Rate effectiveness of a Real Talk
 */
router.patch('/:id/effectiveness', authenticate, async (req, res, next) => {
  try {
    const { effectiveness, notes } = req.body;

    const validValues = ['effective', 'somewhat', 'ineffective'];
    if (!effectiveness || !validValues.includes(effectiveness)) {
      return res.status(400).json({ error: 'Invalid effectiveness value. Must be: effective, somewhat, or ineffective' });
    }

    const realTalk = await req.prisma.realTalk.findUnique({
      where: { id: req.params.id },
    });

    if (!realTalk || realTalk.deletedAt) {
      return res.status(404).json({ error: 'Real Talk not found' });
    }

    if (realTalk.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not your Real Talk' });
    }

    const updated = await req.prisma.realTalk.update({
      where: { id: req.params.id },
      data: {
        effectiveness,
        usedAt: new Date(),
        notes: notes || null,
      },
    });

    logger.info('Real Talk effectiveness rated', {
      userId: req.user.id,
      realTalkId: req.params.id,
      effectiveness,
    });

    res.json({ realTalk: updated });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/real-talk/:id
 * Soft-delete a Real Talk
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const realTalk = await req.prisma.realTalk.findUnique({
      where: { id: req.params.id },
    });

    if (!realTalk || realTalk.deletedAt) {
      return res.status(404).json({ error: 'Real Talk not found' });
    }

    if (realTalk.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not your Real Talk' });
    }

    await req.prisma.realTalk.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });

    logger.info('Real Talk deleted', { userId: req.user.id, realTalkId: req.params.id });

    res.json({ message: 'Real Talk deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
