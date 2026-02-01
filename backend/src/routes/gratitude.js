const express = require('express');
const { authenticate, requireSubscription } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * POST /api/gratitude
 * Save today's gratitude entry (upsert)
 */
router.post('/', authenticate, requireSubscription, async (req, res, next) => {
  try {
    const { text, category, date } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Gratitude text is required' });
    }

    let logDate;
    if (date) {
      const [year, month, day] = date.split('-').map(Number);
      logDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    } else {
      logDate = new Date();
      logDate.setHours(0, 0, 0, 0);
    }

    const entry = await req.prisma.gratitudeEntry.upsert({
      where: {
        userId_date: {
          userId: req.user.id,
          date: logDate
        }
      },
      update: {
        text: text.trim(),
        category: category || null,
      },
      create: {
        userId: req.user.id,
        date: logDate,
        text: text.trim(),
        category: category || null,
      }
    });

    logger.info('Gratitude entry saved', { userId: req.user.id, date: logDate });

    res.json({
      message: 'Gratitude entry saved',
      entry
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/gratitude/today
 * Get today's gratitude entry
 */
router.get('/today', authenticate, async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const entry = await req.prisma.gratitudeEntry.findUnique({
      where: {
        userId_date: {
          userId: req.user.id,
          date: today
        }
      }
    });

    res.json({ entry: entry || null });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/gratitude/history
 * Get gratitude history
 */
router.get('/history', authenticate, async (req, res, next) => {
  try {
    const { limit = 30, startDate, endDate } = req.query;

    const where = { userId: req.user.id };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        const [year, month, day] = startDate.split('-').map(Number);
        where.date.gte = new Date(year, month - 1, day, 0, 0, 0, 0);
      }
      if (endDate) {
        const [year, month, day] = endDate.split('-').map(Number);
        where.date.lte = new Date(year, month - 1, day, 23, 59, 59, 999);
      }
    }

    const entries = await req.prisma.gratitudeEntry.findMany({
      where,
      orderBy: { date: 'desc' },
      take: parseInt(limit)
    });

    res.json({ entries });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/gratitude/streak
 * Get current and longest streak
 */
router.get('/streak', authenticate, async (req, res, next) => {
  try {
    const entries = await req.prisma.gratitudeEntry.findMany({
      where: { userId: req.user.id },
      orderBy: { date: 'desc' },
      select: { date: true }
    });

    const totalEntries = entries.length;

    if (totalEntries === 0) {
      return res.json({ currentStreak: 0, longestStreak: 0, totalEntries: 0 });
    }

    // Normalize dates to YYYY-MM-DD strings for comparison
    const dateStrings = entries.map(e => {
      const d = new Date(e.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });

    // Deduplicate (shouldn't be needed with unique constraint, but safe)
    const uniqueDates = [...new Set(dateStrings)].sort().reverse();

    // Calculate current streak (must include today or yesterday)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    let currentStreak = 0;
    if (uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr) {
      currentStreak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = new Date(uniqueDates[i - 1]);
        const currDate = new Date(uniqueDates[i]);
        const diffDays = Math.round((prevDate - currDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    let longestStreak = 1;
    let streak = 1;
    const sortedAsc = [...uniqueDates].reverse();
    for (let i = 1; i < sortedAsc.length; i++) {
      const prevDate = new Date(sortedAsc[i - 1]);
      const currDate = new Date(sortedAsc[i]);
      const diffDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streak++;
        longestStreak = Math.max(longestStreak, streak);
      } else {
        streak = 1;
      }
    }

    res.json({ currentStreak, longestStreak, totalEntries });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/gratitude/stats
 * Get gratitude statistics
 */
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    // Get streak data
    const entries = await req.prisma.gratitudeEntry.findMany({
      where: { userId: req.user.id },
      orderBy: { date: 'desc' },
      select: { date: true, category: true }
    });

    const totalEntries = entries.length;

    // Calculate streaks (reuse logic)
    const dateStrings = entries.map(e => {
      const d = new Date(e.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const uniqueDates = [...new Set(dateStrings)].sort().reverse();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    let currentStreak = 0;
    if (uniqueDates.length > 0 && (uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr)) {
      currentStreak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = new Date(uniqueDates[i - 1]);
        const currDate = new Date(uniqueDates[i]);
        const diffDays = Math.round((prevDate - currDate) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    let longestStreak = uniqueDates.length > 0 ? 1 : 0;
    let streak = 1;
    const sortedAsc = [...uniqueDates].reverse();
    for (let i = 1; i < sortedAsc.length; i++) {
      const prevDate = new Date(sortedAsc[i - 1]);
      const currDate = new Date(sortedAsc[i]);
      const diffDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streak++;
        longestStreak = Math.max(longestStreak, streak);
      } else {
        streak = 1;
      }
    }

    // Top categories
    const categoryCounts = {};
    entries.forEach(e => {
      if (e.category) {
        categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
      }
    });
    const topCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // This week count
    const startOfWeek = new Date(today);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const thisWeekCount = await req.prisma.gratitudeEntry.count({
      where: {
        userId: req.user.id,
        date: { gte: startOfWeek }
      }
    });

    // This month count
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthCount = await req.prisma.gratitudeEntry.count({
      where: {
        userId: req.user.id,
        date: { gte: startOfMonth }
      }
    });

    res.json({
      totalEntries,
      currentStreak,
      longestStreak,
      topCategories,
      thisWeekCount,
      thisMonthCount
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/gratitude/shared
 * Get partner's shared gratitude entries
 */
router.get('/shared', authenticate, async (req, res, next) => {
  try {
    // Find relationship to get partner ID
    const relationship = await req.prisma.relationship.findFirst({
      where: {
        OR: [
          { user1Id: req.user.id },
          { user2Id: req.user.id }
        ],
        status: 'active'
      }
    });

    if (!relationship || (!relationship.user2Id)) {
      return res.json({ entries: [], hasPartner: false });
    }

    const partnerId = relationship.user1Id === req.user.id
      ? relationship.user2Id
      : relationship.user1Id;

    const entries = await req.prisma.gratitudeEntry.findMany({
      where: {
        userId: partnerId,
        isShared: true
      },
      orderBy: { date: 'desc' },
      take: 30
    });

    res.json({ entries, hasPartner: true });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/gratitude/love-note
 * Get the weekly love note (partner's shared gratitudes from past 7 days)
 */
router.get('/love-note', authenticate, async (req, res, next) => {
  try {
    // Find relationship to get partner ID
    const relationship = await req.prisma.relationship.findFirst({
      where: {
        OR: [
          { user1Id: req.user.id },
          { user2Id: req.user.id }
        ],
        status: 'active'
      }
    });

    if (!relationship || !relationship.user2Id) {
      return res.json({ loveNote: null, hasPartner: false, message: 'Connect with your partner to receive weekly love notes' });
    }

    const partnerId = relationship.user1Id === req.user.id
      ? relationship.user2Id
      : relationship.user1Id;

    // Get partner's name
    const partner = await req.prisma.user.findUnique({
      where: { id: partnerId },
      select: { firstName: true }
    });

    const partnerName = partner?.firstName || 'Your Partner';

    // Get shared entries from past 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const entries = await req.prisma.gratitudeEntry.findMany({
      where: {
        userId: partnerId,
        isShared: true,
        date: {
          gte: sevenDaysAgo,
          lte: today
        }
      },
      orderBy: { date: 'desc' },
      select: { date: true, text: true, category: true }
    });

    if (entries.length === 0) {
      return res.json({ loveNote: null, hasPartner: true, message: 'No shared gratitudes from your partner this week' });
    }

    // Format week range
    const formatShortDate = (d) => {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    const weekOf = `${formatShortDate(sevenDaysAgo)} - ${formatShortDate(today)}`;

    // Find top categories
    const categoryCounts = {};
    entries.forEach(e => {
      if (e.category) {
        categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
      }
    });
    const sortedCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat);
    const topCategory = sortedCategories[0] || null;

    // Build summary
    let summary = `This week, ${partnerName} appreciated ${entries.length} thing${entries.length !== 1 ? 's' : ''} about you`;
    if (sortedCategories.length >= 2) {
      summary += `, especially your ${sortedCategories[0]} and ${sortedCategories[1]}.`;
    } else if (sortedCategories.length === 1) {
      summary += `, especially your ${sortedCategories[0]}.`;
    } else {
      summary += '.';
    }

    res.json({
      loveNote: {
        fromName: partnerName,
        weekOf,
        entries,
        entryCount: entries.length,
        topCategory,
        summary
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/gratitude/:id/share
 * Toggle sharing a gratitude entry with partner
 */
router.patch('/:id/share', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify entry belongs to user
    const entry = await req.prisma.gratitudeEntry.findUnique({
      where: { id }
    });

    if (!entry) {
      return res.status(404).json({ error: 'Gratitude entry not found' });
    }

    if (entry.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not your gratitude entry' });
    }

    const updated = await req.prisma.gratitudeEntry.update({
      where: { id },
      data: { isShared: !entry.isShared }
    });

    logger.info('Gratitude sharing toggled', { userId: req.user.id, entryId: id, isShared: updated.isShared });

    res.json({ entry: updated });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
