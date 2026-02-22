/**
 * Transformation Mirror API (Improvement 13)
 * Side-by-side THEN vs NOW comparison showing personal growth
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// ─── Pattern Detection ───────────────────────────────────────────────────────

// Blame patterns: words/phrases that indicate external attribution
const BLAME_PATTERNS = [
  /\b(never|always|you don'?t|you won'?t|you can'?t|you never|you always)\b/i,
  /\b(your fault|you made me|because of you|you should|you need to)\b/i,
  /\b(why can'?t you|what'?s wrong with you|you'?re the one)\b/i,
];

// Agency patterns: words/phrases that indicate personal ownership
const AGENCY_PATTERNS = [
  /\b(I feel|I need|I chose|I noticed|I realized|I want|I appreciate)\b/i,
  /\b(I can|I will|I'm going to|I've been|I'm learning|I'm working on)\b/i,
  /\b(my part|my role|I contributed|I understand|I'm sorry|I could have)\b/i,
];

// Vague patterns
const VAGUE_PATTERNS = [
  /\b(stuff|things|whatever|kind of|sort of|I guess|I don'?t know)\b/i,
  /\b(fine|okay|nothing|everything|it'?s just)\b/i,
];

// Specific patterns
const SPECIFIC_PATTERNS = [
  /\b(specifically|for example|when you|because I|the moment|I noticed that)\b/i,
  /\b(this morning|yesterday|last night|during dinner|at work|when we)\b/i,
];

// Hopeless patterns
const HOPELESS_PATTERNS = [
  /\b(can'?t|won'?t ever|never going to|no point|give up|hopeless|impossible)\b/i,
  /\b(what'?s the use|nothing works|too late|done trying|beyond repair)\b/i,
];

// Empowered patterns
const EMPOWERED_PATTERNS = [
  /\b(I can|we can|let'?s try|I believe|worth trying|making progress|getting better)\b/i,
  /\b(one step|small win|grateful|proud|hopeful|excited|looking forward)\b/i,
];

// Expert quotes for transformation context
const EXPERT_QUOTES = [
  {
    quote: 'The people who have the most significant transformations are the ones who dare to look at their own patterns with curiosity instead of judgment.',
    expert: 'Dr. Brene Brown',
  },
  {
    quote: 'Every positive change in your relationship starts with a change in how you see yourself and your partner.',
    expert: 'Dr. John Gottman',
  },
  {
    quote: 'The ability to observe yourself without judgment is the highest form of emotional intelligence.',
    expert: 'Dr. Daniel Siegel',
  },
  {
    quote: 'Growth is not about becoming someone new. It is about becoming more fully who you are.',
    expert: 'Dr. Sue Johnson',
  },
  {
    quote: 'Small shifts in how we communicate create massive shifts in how connected we feel.',
    expert: 'Dr. John Gottman',
  },
];

/**
 * Count pattern matches in text
 */
function countPatterns(text, patterns) {
  let count = 0;
  for (const pattern of patterns) {
    const matches = text.match(new RegExp(pattern, 'gi'));
    if (matches) count += matches.length;
  }
  return count;
}

/**
 * Find best example quote from entries matching a pattern set
 */
function findExampleQuote(entries, patterns) {
  for (const entry of entries) {
    const text = entry.journalEntry || '';
    for (const pattern of patterns) {
      if (pattern.test(text) && text.length > 20 && text.length < 200) {
        // Return a clean snippet
        return text.substring(0, 150) + (text.length > 150 ? '...' : '');
      }
    }
  }
  return null;
}

/**
 * GET /api/transformation
 * Compare early vs recent text entries to detect growth
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user's first log date to check 14-day requirement
    const firstLog = await req.prisma.dailyLog.findFirst({
      where: { userId },
      orderBy: { date: 'asc' },
      select: { date: true },
    });

    if (!firstLog) {
      return res.json({ available: false, reason: 'no_logs' });
    }

    const daysSinceFirst = Math.floor(
      (new Date() - new Date(firstLog.date)) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceFirst < 14) {
      return res.json({
        available: false,
        reason: 'not_enough_days',
        daysActive: daysSinceFirst,
        daysRequired: 14,
      });
    }

    // Get early entries (first 7 days)
    const earlyEnd = new Date(firstLog.date);
    earlyEnd.setDate(earlyEnd.getDate() + 7);

    const earlyEntries = await req.prisma.dailyLog.findMany({
      where: {
        userId,
        date: { lte: earlyEnd },
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        journalEntry: true,
        positiveCount: true,
        negativeCount: true,
        mood: true,
      },
    });

    // Get recent entries (last 7 days)
    const recentStart = new Date();
    recentStart.setDate(recentStart.getDate() - 7);

    const recentEntries = await req.prisma.dailyLog.findMany({
      where: {
        userId,
        date: { gte: recentStart },
      },
      orderBy: { date: 'desc' },
      select: {
        date: true,
        journalEntry: true,
        positiveCount: true,
        negativeCount: true,
        mood: true,
      },
    });

    if (earlyEntries.length === 0 || recentEntries.length === 0) {
      return res.json({ available: false, reason: 'insufficient_entries' });
    }

    // Combine all journal text for each period
    const earlyText = earlyEntries
      .map((e) => e.journalEntry || '')
      .filter(Boolean)
      .join(' ');
    const recentText = recentEntries
      .map((e) => e.journalEntry || '')
      .filter(Boolean)
      .join(' ');

    // Count patterns
    const earlyBlame = countPatterns(earlyText, BLAME_PATTERNS);
    const recentBlame = countPatterns(recentText, BLAME_PATTERNS);
    const earlyAgency = countPatterns(earlyText, AGENCY_PATTERNS);
    const recentAgency = countPatterns(recentText, AGENCY_PATTERNS);
    const earlyVague = countPatterns(earlyText, VAGUE_PATTERNS);
    const recentVague = countPatterns(recentText, VAGUE_PATTERNS);
    const earlySpecific = countPatterns(earlyText, SPECIFIC_PATTERNS);
    const recentSpecific = countPatterns(recentText, SPECIFIC_PATTERNS);
    const earlyHopeless = countPatterns(earlyText, HOPELESS_PATTERNS);
    const recentHopeless = countPatterns(recentText, HOPELESS_PATTERNS);
    const earlyEmpowered = countPatterns(earlyText, EMPOWERED_PATTERNS);
    const recentEmpowered = countPatterns(recentText, EMPOWERED_PATTERNS);

    // Detect shifts
    const shifts = [];

    if (earlyBlame > recentBlame && recentAgency > earlyAgency) {
      shifts.push({
        type: 'blame_to_curiosity',
        label: 'Blame → Curiosity',
        description: 'You\'ve shifted from blaming language to taking personal ownership',
        thenMetric: earlyBlame,
        nowMetric: recentBlame,
        improvement: true,
      });
    }

    if (recentAgency > earlyAgency) {
      shifts.push({
        type: 'agency_increase',
        label: 'More Personal Agency',
        description: 'You\'re using more "I feel" and "I need" statements',
        thenMetric: earlyAgency,
        nowMetric: recentAgency,
        improvement: true,
      });
    }

    if (earlyVague > recentVague && recentSpecific > earlySpecific) {
      shifts.push({
        type: 'vague_to_specific',
        label: 'Vague → Specific',
        description: 'Your reflections have become more detailed and specific',
        thenMetric: earlyVague,
        nowMetric: recentVague,
        improvement: true,
      });
    }

    if (earlyHopeless > recentHopeless && recentEmpowered > earlyEmpowered) {
      shifts.push({
        type: 'hopeless_to_empowered',
        label: 'Hopeless → Empowered',
        description: 'You\'ve moved from feeling stuck to seeing possibility',
        thenMetric: earlyHopeless,
        nowMetric: recentHopeless,
        improvement: true,
      });
    }

    // Ratio comparison
    const earlyAvgPositive = earlyEntries.reduce((sum, e) => sum + (e.positiveCount || 0), 0) / earlyEntries.length;
    const earlyAvgNegative = earlyEntries.reduce((sum, e) => sum + (e.negativeCount || 0), 0) / earlyEntries.length;
    const recentAvgPositive = recentEntries.reduce((sum, e) => sum + (e.positiveCount || 0), 0) / recentEntries.length;
    const recentAvgNegative = recentEntries.reduce((sum, e) => sum + (e.negativeCount || 0), 0) / recentEntries.length;

    const earlyRatio = earlyAvgNegative > 0 ? (earlyAvgPositive / earlyAvgNegative).toFixed(1) : null;
    const recentRatio = recentAvgNegative > 0 ? (recentAvgPositive / recentAvgNegative).toFixed(1) : null;

    if (earlyRatio && recentRatio && parseFloat(recentRatio) > parseFloat(earlyRatio)) {
      shifts.push({
        type: 'ratio_improvement',
        label: 'Better Ratio',
        description: `Your positive-to-negative ratio improved from ${earlyRatio}:1 to ${recentRatio}:1`,
        thenMetric: parseFloat(earlyRatio),
        nowMetric: parseFloat(recentRatio),
        improvement: true,
      });
    }

    // Find example quotes
    const thenQuote = findExampleQuote(earlyEntries, BLAME_PATTERNS) ||
                      findExampleQuote(earlyEntries, VAGUE_PATTERNS) ||
                      findExampleQuote(earlyEntries, HOPELESS_PATTERNS) ||
                      (earlyEntries[0]?.journalEntry?.substring(0, 150) || null);

    const nowQuote = findExampleQuote(recentEntries, AGENCY_PATTERNS) ||
                     findExampleQuote(recentEntries, SPECIFIC_PATTERNS) ||
                     findExampleQuote(recentEntries, EMPOWERED_PATTERNS) ||
                     (recentEntries[0]?.journalEntry?.substring(0, 150) || null);

    // Pick a random expert quote
    const expertQuote = EXPERT_QUOTES[Math.floor(Math.random() * EXPERT_QUOTES.length)];

    res.json({
      available: true,
      daysActive: daysSinceFirst,
      earlyPeriod: {
        start: firstLog.date,
        end: earlyEnd,
        entryCount: earlyEntries.length,
      },
      recentPeriod: {
        start: recentStart,
        end: new Date(),
        entryCount: recentEntries.length,
      },
      thenQuote,
      nowQuote,
      shifts,
      ratios: {
        then: earlyRatio ? `${earlyRatio}:1` : null,
        now: recentRatio ? `${recentRatio}:1` : null,
      },
      expertQuote,
    });
  } catch (error) {
    logger.error('Transformation mirror error:', { error: error.message });
    next(error);
  }
});

module.exports = router;
