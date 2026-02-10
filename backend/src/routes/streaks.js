/**
 * 🔥 Streak Tracking API
 * Tracks daily log streaks for gamification
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/streaks
 * Get user's current streak info
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all daily logs for this user, ordered by date
    const logs = await prisma.dailyLog.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    if (logs.length === 0) {
      return res.json({
        currentStreak: 0,
        longestStreak: 0,
        totalLogs: 0,
        lastLogDate: null,
        streakAlive: false,
        xp: 0,
        level: 1,
        levelName: 'Relationship Rookie',
      });
    }

    // Calculate current streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let currentStreak = 0;
    let checkDate = new Date(today);
    
    // Check if logged today or yesterday to maintain streak
    const dates = logs.map(l => {
      const d = new Date(l.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    });

    const loggedToday = dates.includes(today.getTime());
    const loggedYesterday = dates.includes(yesterday.getTime());
    
    const streakAlive = loggedToday || loggedYesterday;

    // Count streak backwards
    if (streakAlive) {
      // Start from most recent log date
      if (loggedToday) {
        checkDate = new Date(today);
      } else {
        checkDate = new Date(yesterday);
      }

      while (dates.includes(checkDate.getTime())) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    // Calculate longest streak ever
    let longestStreak = 0;
    let tempStreak = 1;
    const sortedDates = [...dates].sort((a, b) => a - b);
    
    for (let i = 1; i < sortedDates.length; i++) {
      const dayDiff = (sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24);
      if (dayDiff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Calculate XP based on activities
    // Daily log: 10 XP each
    const dailyLogXP = logs.length * 10;

    // Get assessment count for XP (50 XP each)
    const assessmentCount = await prisma.assessment.count({ where: { userId } });
    const assessmentXP = assessmentCount * 50;

    // Get gratitude count (5 XP each)
    const gratitudeCount = await prisma.gratitudeEntry.count({ where: { userId } });
    const gratitudeXP = gratitudeCount * 5;

    const totalXP = dailyLogXP + assessmentXP + gratitudeXP;

    // Calculate level
    const levels = [
      { threshold: 0, name: 'Relationship Rookie', level: 1 },
      { threshold: 100, name: 'Love Apprentice', level: 2 },
      { threshold: 500, name: 'Intimacy Expert', level: 3 },
      { threshold: 1500, name: 'Marriage Master', level: 4 },
      { threshold: 5000, name: 'Love Legend', level: 5 },
    ];

    let currentLevel = levels[0];
    for (const l of levels) {
      if (totalXP >= l.threshold) {
        currentLevel = l;
      }
    }

    const nextLevel = levels[currentLevel.level] || null;
    const xpToNextLevel = nextLevel ? nextLevel.threshold - totalXP : 0;
    const levelProgress = nextLevel 
      ? ((totalXP - currentLevel.threshold) / (nextLevel.threshold - currentLevel.threshold)) * 100
      : 100;

    res.json({
      currentStreak,
      longestStreak,
      totalLogs: logs.length,
      lastLogDate: logs[0]?.date,
      streakAlive,
      loggedToday,
      xp: totalXP,
      level: currentLevel.level,
      levelName: currentLevel.name,
      xpToNextLevel,
      levelProgress: Math.min(100, Math.round(levelProgress)),
    });
  } catch (error) {
    console.error('Streak fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch streak' });
  }
});

/**
 * GET /api/streaks/badges
 * Get user's earned badges
 */
router.get('/badges', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get counts for badge calculations
    const [logCount, assessmentCount, gratitudeCount] = await Promise.all([
      prisma.dailyLog.count({ where: { userId } }),
      prisma.assessment.count({ where: { userId } }),
      prisma.gratitudeEntry.count({ where: { userId } }),
    ]);

    // Get current streak
    const logs = await prisma.dailyLog.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      select: { date: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dates = logs.map(l => {
      const d = new Date(l.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    });

    let currentStreak = 0;
    let checkDate = new Date(today);
    while (dates.includes(checkDate.getTime())) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Define all badges
    const allBadges = [
      { id: 'first-step', name: 'First Step', emoji: '🌱', description: 'Complete your first daily log', earned: logCount >= 1 },
      { id: '7-day-warrior', name: '7-Day Warrior', emoji: '⚔️', description: '7-day streak', earned: currentStreak >= 7 },
      { id: 'habit-former', name: 'Habit Former', emoji: '🧠', description: '21-day streak', earned: currentStreak >= 21 },
      { id: 'relationship-warrior', name: 'Relationship Warrior', emoji: '🛡️', description: '30-day streak', earned: currentStreak >= 30 },
      { id: 'love-legend', name: 'Love Legend', emoji: '👑', description: '90-day streak', earned: currentStreak >= 90 },
      { id: 'self-aware', name: 'Self-Aware', emoji: '📊', description: 'Complete 3 assessments', earned: assessmentCount >= 3 },
      { id: 'gratitude-guru', name: 'Gratitude Guru', emoji: '🙏', description: '30 gratitude entries', earned: gratitudeCount >= 30 },
      { id: 'communication-champion', name: 'Communication Champion', emoji: '💬', description: '50 daily logs', earned: logCount >= 50 },
    ];

    res.json({
      badges: allBadges,
      earned: allBadges.filter(b => b.earned).length,
      total: allBadges.length,
    });
  } catch (error) {
    console.error('Badge fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

module.exports = router;
