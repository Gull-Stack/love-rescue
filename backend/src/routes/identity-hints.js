/**
 * Identity Hints API (Improvement 10)
 * Returns "You might be someone who..." messages based on user activity
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Identity hint templates keyed by trigger
const IDENTITY_HINTS = {
  after_appreciation_3x: {
    category: 'appreciation',
    identity: 'notices the good in others — even when it\'s easy to overlook',
    attribution: 'Based on your 3+ appreciation entries',
    framework: 'Gottman\'s 5:1 ratio research',
    cta: '/gratitude',
  },
  after_pause_in_conflict: {
    category: 'regulation',
    identity: 'can hold space between a feeling and a reaction',
    attribution: 'Based on your conflict-pause pattern',
    framework: 'Gottman\'s self-soothing principle',
    cta: '/daily',
  },
  after_vulnerability_share: {
    category: 'vulnerability',
    identity: 'chooses connection over self-protection',
    attribution: 'Based on your journal vulnerability',
    framework: 'Brené Brown\'s vulnerability research',
    cta: '/gratitude',
  },
  after_gentle_startup: {
    category: 'communication',
    identity: 'leads with curiosity instead of criticism',
    attribution: 'Based on your soft-startup usage',
    framework: 'Gottman\'s gentle startup principle',
    cta: '/strategies',
  },
  after_bid_response: {
    category: 'appreciation',
    identity: 'turns toward their partner when it matters most',
    attribution: 'Based on your bid-turning pattern',
    framework: 'Gottman\'s bids for connection',
    cta: '/daily',
  },
};

/**
 * GET /api/identity-hints/check
 * Check user's recent completions and return an applicable hint
 */
router.get('/check', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Check what hints user has already seen (stored on user JSON field or separate table)
    const user = await req.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, metadata: true },
    });

    const metadata = user?.metadata || {};
    const hintsShown = metadata.identityHintsShown || [];
    const lastHintDate = metadata.lastIdentityHintDate || null;

    // Max 2 per week — check if already hit limit
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const recentHints = hintsShown.filter(
      (h) => new Date(h.date) > oneWeekAgo
    );
    if (recentHints.length >= 2) {
      return res.json({ hint: null, reason: 'weekly_limit_reached' });
    }

    // Don't show another if one was shown today
    if (lastHintDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastDate = new Date(lastHintDate);
      lastDate.setHours(0, 0, 0, 0);
      if (lastDate.getTime() === today.getTime()) {
        return res.json({ hint: null, reason: 'already_shown_today' });
      }
    }

    // Gather user activity signals from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [gratitudeCount, recentLogs, recentStrategies] = await Promise.all([
      req.prisma.gratitudeEntry.count({
        where: { userId, createdAt: { gte: sevenDaysAgo } },
      }),
      req.prisma.dailyLog.findMany({
        where: { userId, date: { gte: sevenDaysAgo } },
        select: {
          positiveCount: true,
          negativeCount: true,
          journalEntry: true,
          bidsTurned: true,
          mood: true,
        },
      }),
      req.prisma.strategyProgress
        ? req.prisma.strategyProgress
            .findMany({
              where: { userId, updatedAt: { gte: sevenDaysAgo } },
            })
            .catch(() => [])
        : Promise.resolve([]),
    ]);

    // Determine which trigger applies
    let triggerKey = null;

    // 3+ appreciation entries this week
    if (gratitudeCount >= 3) {
      triggerKey = 'after_appreciation_3x';
    }

    // Bid turning pattern (logged bids turned toward)
    if (
      !triggerKey &&
      recentLogs.some((l) => l.bidsTurned && l.bidsTurned > 0)
    ) {
      triggerKey = 'after_bid_response';
    }

    // Vulnerability share (journal entries with substantial text)
    if (
      !triggerKey &&
      recentLogs.some(
        (l) => l.journalEntry && l.journalEntry.length > 50
      )
    ) {
      triggerKey = 'after_vulnerability_share';
    }

    // Conflict pause pattern (negative logged but ratio still decent)
    if (
      !triggerKey &&
      recentLogs.some(
        (l) =>
          l.negativeCount > 0 &&
          l.positiveCount > 0 &&
          l.positiveCount / Math.max(l.negativeCount, 1) >= 3
      )
    ) {
      triggerKey = 'after_pause_in_conflict';
    }

    // Gentle startup (active strategies)
    if (!triggerKey && recentStrategies.length > 0) {
      triggerKey = 'after_gentle_startup';
    }

    // Skip if no trigger or already shown this specific hint recently
    if (!triggerKey) {
      return res.json({ hint: null, reason: 'no_trigger' });
    }

    const alreadyShownRecently = recentHints.some(
      (h) => h.trigger === triggerKey
    );
    if (alreadyShownRecently) {
      return res.json({ hint: null, reason: 'hint_already_shown' });
    }

    const hint = {
      ...IDENTITY_HINTS[triggerKey],
      trigger: triggerKey,
    };

    res.json({ hint });
  } catch (error) {
    logger.error('Identity hint check error:', { error: error.message });
    next(error);
  }
});

/**
 * POST /api/identity-hints/shown
 * Record that a hint was shown to the user
 */
router.post('/shown', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { trigger } = req.body;

    if (!trigger || !IDENTITY_HINTS[trigger]) {
      return res.status(400).json({ error: 'Invalid trigger' });
    }

    const user = await req.prisma.user.findUnique({
      where: { id: userId },
      select: { metadata: true },
    });

    const metadata = user?.metadata || {};
    const hintsShown = metadata.identityHintsShown || [];

    hintsShown.push({ trigger, date: new Date().toISOString() });

    await req.prisma.user.update({
      where: { id: userId },
      data: {
        metadata: {
          ...metadata,
          identityHintsShown: hintsShown,
          lastIdentityHintDate: new Date().toISOString(),
        },
      },
    });

    res.json({ message: 'Hint recorded' });
  } catch (error) {
    logger.error('Identity hint shown error:', { error: error.message });
    next(error);
  }
});

module.exports = router;
