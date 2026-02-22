/**
 * Progress Rings API — 3-ring Apple Watch style
 * Calculates CONNECTION, COMMUNICATION, and CONFLICT_SKILL dimension scores
 * from user activity over the last 7 days.
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/progress-rings
 * Returns 3 dimension scores from recent activity:
 *   - connection: appreciations + quality time logs + bid responses
 *   - communication: mirroring uses + I-feel statements + gentle startups
 *   - conflict_skill: pauses + repairs + flooding recognitions
 *
 * Since the schema tracks aggregated daily log fields (positiveCount,
 * negativeCount, bidsTurned, closenessScore, mood) and gratitude entries,
 * we derive dimension scores from these available signals.
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Fetch last 7 days of daily logs and gratitude entries in parallel
    const [dailyLogs, gratitudeEntries] = await Promise.all([
      prisma.dailyLog.findMany({
        where: {
          userId,
          date: { gte: sevenDaysAgo },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.gratitudeEntry.findMany({
        where: {
          userId,
          date: { gte: sevenDaysAgo },
        },
      }),
    ]);

    // ── CONNECTION dimension ──
    // Appreciations: gratitude entries (max 7 = one per day)
    // Quality time: days with closenessScore >= 6 (max 7)
    // Bid responses: sum of bidsTurned across logs (max 7, capped at 1/day)
    const appreciations = Math.min(gratitudeEntries.length, 7);
    const qualityTimeDays = dailyLogs.filter(l => l.closenessScore && l.closenessScore >= 6).length;
    const bidResponseDays = dailyLogs.filter(l => l.bidsTurned && l.bidsTurned > 0).length;
    const connectionEarned = appreciations + qualityTimeDays + bidResponseDays;
    const connectionTotal = 21; // 7 + 7 + 7

    // ── COMMUNICATION dimension ──
    // Mirroring uses: days with a journal entry (reflects introspection, max 7)
    // I-feel statements: days where mood is logged (self-awareness, max 7)
    // Gentle startups: days with positiveCount >= 3 (constructive interactions, max 7)
    const mirroringDays = dailyLogs.filter(l => l.journalEntry && l.journalEntry.trim().length > 0).length;
    const iFeelDays = dailyLogs.filter(l => l.mood != null).length;
    const gentleStartupDays = dailyLogs.filter(l => l.positiveCount >= 3).length;
    const communicationEarned = mirroringDays + iFeelDays + gentleStartupDays;
    const communicationTotal = 21;

    // ── CONFLICT SKILL dimension ──
    // Pauses: days where ratio > 1 despite having negativeCount > 0 (managed conflict, max 7)
    // Repairs: days with positiveCount > negativeCount && negativeCount > 0 (repair attempts, max 7)
    // Flooding recognition: days where mood was logged AND negativeCount > 0 (awareness during conflict, max 7)
    const pauseDays = dailyLogs.filter(l => l.negativeCount > 0 && l.ratio && l.ratio > 1).length;
    const repairDays = dailyLogs.filter(l => l.negativeCount > 0 && l.positiveCount > l.negativeCount).length;
    const floodingRecognitionDays = dailyLogs.filter(l => l.negativeCount > 0 && l.mood != null).length;
    const conflictEarned = pauseDays + repairDays + floodingRecognitionDays;
    const conflictTotal = 21;

    const safePercent = (earned, total) => total > 0 ? Math.round((earned / total) * 100) : 0;

    res.json({
      connection: {
        earned: connectionEarned,
        total: connectionTotal,
        percent: safePercent(connectionEarned, connectionTotal),
      },
      communication: {
        earned: communicationEarned,
        total: communicationTotal,
        percent: safePercent(communicationEarned, communicationTotal),
      },
      conflict_skill: {
        earned: conflictEarned,
        total: conflictTotal,
        percent: safePercent(conflictEarned, conflictTotal),
      },
    });
  } catch (error) {
    console.error('Progress rings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch progress rings' });
  }
});

module.exports = router;
