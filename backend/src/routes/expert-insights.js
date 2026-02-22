/**
 * Expert Insights API (Improvement 11)
 * Context-triggered expert quotes and wisdom
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Expert data with quotes, frameworks, CTAs
const EXPERTS = {
  gottman_appreciation: {
    name: 'Dr. John Gottman',
    credentials: 'Relationship Researcher, 40+ years of study',
    initials: 'JG',
    quote: 'The magic ratio is 5:1. For every negative interaction during conflict, a stable relationship has five positive interactions.',
    framework: 'The Gottman Method',
    cta: { label: 'Practice Appreciation', path: '/gratitude' },
    trigger: 'appreciation_logged',
  },
  gottman_conflict: {
    name: 'Dr. John Gottman',
    credentials: 'Relationship Researcher, 40+ years of study',
    initials: 'JG',
    quote: 'Successful conflict resolution is not about solving the problem, but about how you discuss it. Start softly.',
    framework: 'The Four Horsemen',
    cta: { label: 'Learn Soft Startup', path: '/course' },
    trigger: 'conflict_logged',
  },
  johnson_conflict: {
    name: 'Dr. Sue Johnson',
    credentials: 'Creator of Emotionally Focused Therapy',
    initials: 'SJ',
    quote: 'The core issue in most fights is not about the topic — it\'s about whether your partner is emotionally accessible.',
    framework: 'Emotionally Focused Therapy (EFT)',
    cta: { label: 'Explore Attachment', path: '/assessments' },
    trigger: 'conflict_logged',
  },
  voss_mirroring: {
    name: 'Chris Voss',
    credentials: 'Former FBI Lead Negotiator',
    initials: 'CV',
    quote: 'Mirroring is the art of insinuating similarity. It signals "I understand you" without saying a word.',
    framework: 'Tactical Empathy',
    cta: { label: 'Try Mirroring', path: '/strategies' },
    trigger: 'mirroring_used',
  },
  brown_vulnerability: {
    name: 'Dr. Brené Brown',
    credentials: 'Shame & Vulnerability Researcher',
    initials: 'BB',
    quote: 'Vulnerability is not winning or losing; it\'s having the courage to show up when you can\'t control the outcome.',
    framework: 'Daring Greatly',
    cta: { label: 'Journal Your Feelings', path: '/daily' },
    trigger: 'vulnerability_shared',
  },
  perel_distance: {
    name: 'Esther Perel',
    credentials: 'Psychotherapist & Bestselling Author',
    initials: 'EP',
    quote: 'The quality of your relationships determines the quality of your life. Fire needs air — closeness needs space.',
    framework: 'Mating in Captivity',
    cta: { label: 'Explore Connection', path: '/strategies' },
    trigger: 'distance_detected',
  },
};

/**
 * GET /api/expert-insights/check
 * Returns a relevant expert insight based on recent user activity
 */
router.get('/check', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Check user metadata for last insight shown
    const user = await req.prisma.user.findUnique({
      where: { id: userId },
      select: { metadata: true },
    });

    const metadata = user?.metadata || {};
    const lastInsightDate = metadata.lastExpertInsightDate || null;

    // Max 1 per day
    if (lastInsightDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastDate = new Date(lastInsightDate);
      lastDate.setHours(0, 0, 0, 0);
      if (lastDate.getTime() === today.getTime()) {
        return res.json({ insight: null, reason: 'daily_limit_reached' });
      }
    }

    // Get recent activity (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const [recentLogs, recentGratitude] = await Promise.all([
      req.prisma.dailyLog.findMany({
        where: { userId, date: { gte: oneDayAgo } },
        select: {
          positiveCount: true,
          negativeCount: true,
          journalEntry: true,
          bidsTurned: true,
          mood: true,
        },
      }),
      req.prisma.gratitudeEntry.count({
        where: { userId, createdAt: { gte: oneDayAgo } },
      }),
    ]);

    // Determine trigger based on activity
    let selectedExpert = null;

    // Conflict logged (high negatives)
    const hasConflict = recentLogs.some(
      (l) => l.negativeCount > 0 && l.negativeCount >= l.positiveCount
    );
    if (hasConflict) {
      // Alternate between Johnson and Gottman for conflict
      const conflictExperts = ['johnson_conflict', 'gottman_conflict'];
      const lastConflictExpert = metadata.lastConflictExpert || 0;
      selectedExpert = conflictExperts[lastConflictExpert % conflictExperts.length];
    }

    // Vulnerability shared (long journal entry)
    if (
      !selectedExpert &&
      recentLogs.some((l) => l.journalEntry && l.journalEntry.length > 80)
    ) {
      selectedExpert = 'brown_vulnerability';
    }

    // Appreciation logged
    if (!selectedExpert && recentGratitude > 0) {
      selectedExpert = 'gottman_appreciation';
    }

    // Low mood / distance pattern
    if (
      !selectedExpert &&
      recentLogs.some((l) => l.mood && l.mood <= 2)
    ) {
      selectedExpert = 'perel_distance';
    }

    // Bid response detected
    if (
      !selectedExpert &&
      recentLogs.some((l) => l.bidsTurned && l.bidsTurned > 0)
    ) {
      selectedExpert = 'voss_mirroring';
    }

    if (!selectedExpert) {
      return res.json({ insight: null, reason: 'no_trigger' });
    }

    const expert = EXPERTS[selectedExpert];
    res.json({
      insight: {
        key: selectedExpert,
        name: expert.name,
        credentials: expert.credentials,
        initials: expert.initials,
        quote: expert.quote,
        framework: expert.framework,
        cta: expert.cta,
      },
    });
  } catch (error) {
    logger.error('Expert insight check error:', { error: error.message });
    next(error);
  }
});

/**
 * POST /api/expert-insights/shown
 * Record that an insight was shown to the user
 */
router.post('/shown', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { key } = req.body;

    if (!key || !EXPERTS[key]) {
      return res.status(400).json({ error: 'Invalid insight key' });
    }

    const user = await req.prisma.user.findUnique({
      where: { id: userId },
      select: { metadata: true },
    });

    const metadata = user?.metadata || {};
    const insightsShown = metadata.expertInsightsShown || [];

    insightsShown.push({ key, date: new Date().toISOString() });

    const updateData = {
      ...metadata,
      expertInsightsShown: insightsShown,
      lastExpertInsightDate: new Date().toISOString(),
    };

    // Track conflict expert rotation
    if (key.includes('conflict')) {
      updateData.lastConflictExpert = (metadata.lastConflictExpert || 0) + 1;
    }

    await req.prisma.user.update({
      where: { id: userId },
      data: { metadata: updateData },
    });

    res.json({ message: 'Insight recorded' });
  } catch (error) {
    logger.error('Expert insight shown error:', { error: error.message });
    next(error);
  }
});

module.exports = router;
