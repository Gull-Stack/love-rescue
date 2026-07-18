const express = require('express');
const { authenticate } = require('../middleware/auth');
const { detectCrisisAndNotify } = require('../utils/therapistAlerts');
const { containsAbuseKeywords, analyzeUtterance, CONVERSATION_PATTERNS } = require('../utils/conversationAnalysis');
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

// Attack-like language patterns (character attacks vs behavior descriptions)
const ATTACK_PATTERNS = [
  /\byou always\b/i,
  /\byou never\b/i,
  /\byou'?re (?:so |such a? ?)?(?:selfish|lazy|stupid|worthless|pathetic|terrible|horrible|useless|disgusting)\b/i,
  /\byou don'?t care\b/i,
  /\byou'?re the (?:worst|problem)\b/i,
];

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

    // Crisis detection on the free-text fields, AFTER the save succeeded.
    // (The abuse-keyword early return above catches explicit violence words;
    // this catches suicidal ideation / self-harm / escalation language that
    // slips past it.) Therapist alerting runs fire-and-forget inside the hook
    // and can never break this save.
    const crisis = detectCrisisAndNotify(req.user.id, allText, {
      prisma: req.prisma,
      source: 'real_talk',
    });

    const responseBody = {
      realTalk,
      warnings: [...issueWarnings, ...feelingWarnings],
      totalCount,
    };

    if (crisis) {
      responseBody.crisis = crisis;
      // Mirror the abuse safety-response shape (safety/hotline/textLine/url)
      // so the existing Real Talk safety dialog triggers immediately on
      // res.data.safety. Resources never include the client's own text.
      const primaryResource = crisis.resources[0] || {};
      const secondaryResource = crisis.resources[1] || {};
      responseBody.safety = true;
      responseBody.message = crisis.message;
      responseBody.hotline = primaryResource.contact || 'Call or text 988';
      responseBody.textLine = secondaryResource.contact || 'Text HOME to 741741';
      responseBody.url = primaryResource.url || 'https://988lifeline.org';
    }

    res.status(201).json(responseBody);
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

// ─── Live Session: in-session listener for fallacies & manipulation ─────────
// The client records speech in-browser (Web Speech API — audio never reaches
// the server), sends each finalized utterance here as text, and renders the
// returned flags in real time. NOTE: these routes are registered BEFORE
// GET /:id so "live" is never captured as a Real Talk id.

/**
 * GET /api/real-talk/live/patterns
 * The pattern library (metadata only) so the client can render a legend.
 */
router.get('/live/patterns', authenticate, (req, res) => {
  res.json({
    patterns: CONVERSATION_PATTERNS.map(({ id, category, label, explanation, reframe }) => ({
      id, category, label, explanation, reframe,
    })),
  });
});

/**
 * POST /api/real-talk/live/analyze
 * Analyze one utterance. Returns flags; abuse language returns the same
 * safety-response shape the rest of Real Talk uses instead of coaching.
 */
router.post('/live/analyze', authenticate, async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }
    const utterance = String(text).slice(0, 2000);

    if (containsAbuseKeywords(utterance)) {
      // Fire-and-forget crisis pathway (may alert a consented therapist).
      detectCrisisAndNotify(req.user.id, utterance, {
        prisma: req.prisma,
        source: 'live_session',
      });
      return res.status(200).json({
        flags: [],
        safety: true,
        message: 'It sounds like this conversation may involve abuse or violence. Your safety matters most.',
        hotline: '1-800-799-7233',
        textLine: 'Text START to 88788',
        url: 'https://www.thehotline.org',
      });
    }

    const flags = analyzeUtterance(utterance);

    // Crisis language (self-harm etc.) can appear without abuse keywords.
    const crisis = detectCrisisAndNotify(req.user.id, utterance, {
      prisma: req.prisma,
      source: 'live_session',
    });

    const body = { flags };
    if (crisis) {
      const primary = crisis.resources[0] || {};
      const secondary = crisis.resources[1] || {};
      body.safety = true;
      body.message = crisis.message;
      body.hotline = primary.contact || 'Call or text 988';
      body.textLine = secondary.contact || 'Text HOME to 741741';
      body.url = primary.url || 'https://988lifeline.org';
    }
    res.json(body);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/real-talk/live/sessions
 * Save a finished session summary. Privacy-first: counts + flagged excerpts
 * only (capped), never the full transcript.
 */
router.post('/live/sessions', authenticate, async (req, res, next) => {
  try {
    const { startedAt, endedAt, utteranceCount, flagCounts, flaggedExcerpts } = req.body;

    const started = startedAt ? new Date(startedAt) : null;
    if (!started || Number.isNaN(started.getTime())) {
      return res.status(400).json({ error: 'startedAt is required' });
    }
    const ended = endedAt ? new Date(endedAt) : new Date();

    const counts = {};
    const validIds = new Set(CONVERSATION_PATTERNS.map((p) => p.id));
    if (flagCounts && typeof flagCounts === 'object' && !Array.isArray(flagCounts)) {
      for (const [key, val] of Object.entries(flagCounts)) {
        if (validIds.has(key) && Number.isInteger(val) && val > 0) counts[key] = Math.min(val, 999);
      }
    }

    const excerpts = (Array.isArray(flaggedExcerpts) ? flaggedExcerpts : [])
      .slice(0, 50)
      .map((e) => ({
        text: String(e?.text || '').slice(0, 300),
        flagIds: (Array.isArray(e?.flagIds) ? e.flagIds : []).filter((id) => validIds.has(id)).slice(0, 10),
      }))
      .filter((e) => e.text && e.flagIds.length > 0);

    const session = await req.prisma.liveTalkSession.create({
      data: {
        userId: req.user.id,
        startedAt: started,
        endedAt: ended,
        utteranceCount: Math.max(0, Math.min(parseInt(utteranceCount, 10) || 0, 100000)),
        flagCounts: counts,
        flaggedExcerpts: excerpts,
      },
    });

    logger.info('Live Talk session saved', { userId: req.user.id, sessionId: session.id });
    res.status(201).json({ session });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/real-talk/live/sessions
 * List the user's saved live sessions (newest first).
 */
router.get('/live/sessions', authenticate, async (req, res, next) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const where = { userId: req.user.id, deletedAt: null };
    const [sessions, total] = await Promise.all([
      req.prisma.liveTalkSession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(parseInt(limit), 50),
        skip: parseInt(offset),
      }),
      req.prisma.liveTalkSession.count({ where }),
    ]);
    res.json({
      sessions,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + sessions.length < total,
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
