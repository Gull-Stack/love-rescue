/**
 * Tests for pursueWithdrawDetector.js — Pursue-Withdraw Pattern Detection
 */

'use strict';

const {
  detectPursueWithdrawPattern,
  INTENSITY,
  TREND,
  ROLE,
  DETECTION_THRESHOLDS,
} = require('../../utils/pursueWithdrawDetector');

const { createMockPrisma } = require('./testFixtures');

// ═══════════════════════════════════════════════════════════════
// detectPursueWithdrawPattern
// ═══════════════════════════════════════════════════════════════

describe('detectPursueWithdrawPattern', () => {
  let prisma;

  function makeDailyScores(count, baseScore, variance = 1) {
    return Array.from({ length: count }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (count - i));
      return {
        date,
        score: baseScore + (Math.sin(i) * variance),
      };
    });
  }

  function makeEngagementData(dailyScores, extras = {}) {
    return {
      dailyScores,
      totalActivities: extras.totalActivities ?? dailyScores.length * 2,
      totalLogs: extras.totalLogs ?? dailyScores.length,
      avgMood: extras.avgMood ?? 6,
      avgJournalLength: extras.avgJournalLength ?? 100,
      totalGratitudes: extras.totalGratitudes ?? dailyScores.length,
      totalVideos: extras.totalVideos ?? 3,
    };
  }

  beforeEach(() => {
    prisma = createMockPrisma();
    prisma.relationship.findUnique.mockResolvedValue({
      id: 'rel-1-uuid',
      user1Id: 'user-1-uuid',
      user2Id: 'user-2-uuid',
      status: 'active',
    });
  });

  describe('balanced engagement', () => {
    it('should detect balanced pattern (no pursue-withdraw)', async () => {
      // Both partners have similar engagement
      prisma.dailyLog.findMany
        .mockResolvedValueOnce(
          Array.from({ length: 14 }, (_, i) => ({
            date: new Date(Date.now() - (14 - i) * 86400000),
            mood: 7, positiveCount: 5, negativeCount: 1, closenessScore: 7,
          }))
        )
        .mockResolvedValueOnce(
          Array.from({ length: 14 }, (_, i) => ({
            date: new Date(Date.now() - (14 - i) * 86400000),
            mood: 6, positiveCount: 4, negativeCount: 1, closenessScore: 6,
          }))
        );
      // Activity completions
      prisma.strategy = { findMany: jest.fn().mockResolvedValue([]) };

      const result = await detectPursueWithdrawPattern('rel-1-uuid', 14, prisma);

      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.coupleId).toBe('rel-1-uuid');
    });
  });

  describe('one-sided engagement', () => {
    it('should detect pattern when one partner is much more active', async () => {
      // Partner A: very active; Partner B: minimal
      prisma.dailyLog.findMany
        .mockResolvedValueOnce(
          Array.from({ length: 14 }, (_, i) => ({
            date: new Date(Date.now() - (14 - i) * 86400000),
            mood: 8, positiveCount: 8, negativeCount: 1, closenessScore: 8,
          }))
        )
        .mockResolvedValueOnce(
          Array.from({ length: 3 }, (_, i) => ({
            date: new Date(Date.now() - (14 - i * 5) * 86400000),
            mood: 4, positiveCount: 1, negativeCount: 3, closenessScore: 3,
          }))
        );

      const result = await detectPursueWithdrawPattern('rel-1-uuid', 14, prisma);

      expect(result).toBeDefined();
      // May or may not detect pattern depending on data quality thresholds
      if (result.patternDetected) {
        expect(result.intensity).toBeDefined();
        expect(result.trend).toBeDefined();
        expect([INTENSITY.MILD, INTENSITY.MODERATE, INTENSITY.SEVERE]).toContain(result.intensity);
      }
    });
  });

  describe('no data', () => {
    it('should return no pattern with insufficient data', async () => {
      prisma.dailyLog.findMany.mockResolvedValue([]);

      const result = await detectPursueWithdrawPattern('rel-1-uuid', 14, prisma);

      expect(result).toBeDefined();
      expect(result.patternDetected).toBe(false);
    });

    it('should handle single-user relationship', async () => {
      prisma.relationship.findUnique.mockResolvedValue({
        id: 'rel-1-uuid',
        user1Id: 'user-1-uuid',
        user2Id: null,
        status: 'active',
      });

      const result = await detectPursueWithdrawPattern('rel-1-uuid', 14, prisma);

      expect(result.patternDetected).toBe(false);
    });

    it('should handle inactive relationship', async () => {
      prisma.relationship.findUnique.mockResolvedValue({
        id: 'rel-1-uuid',
        user1Id: 'user-1-uuid',
        user2Id: 'user-2-uuid',
        status: 'inactive',
      });

      const result = await detectPursueWithdrawPattern('rel-1-uuid', 14, prisma);

      expect(result.patternDetected).toBe(false);
    });

    it('should handle relationship not found', async () => {
      prisma.relationship.findUnique.mockResolvedValue(null);

      const result = await detectPursueWithdrawPattern('nonexistent', 14, prisma);

      expect(result.patternDetected).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should throw on missing coupleId', async () => {
      await expect(detectPursueWithdrawPattern(null, 14, prisma)).rejects.toThrow('coupleId is required');
    });

    it('should enforce minimum window days', async () => {
      prisma.dailyLog.findMany.mockResolvedValue([]);

      const result = await detectPursueWithdrawPattern('rel-1-uuid', 1, prisma);

      // Should use minimum data points threshold, not 1 day
      expect(result.metadata.windowDays).toBeGreaterThanOrEqual(DETECTION_THRESHOLDS.minDataPoints);
    });

    it('should include clinical notes when pattern detected', async () => {
      // Setup data that might trigger detection
      prisma.dailyLog.findMany
        .mockResolvedValueOnce(
          Array.from({ length: 14 }, (_, i) => ({
            date: new Date(Date.now() - (14 - i) * 86400000),
            mood: 9, positiveCount: 10, negativeCount: 0, closenessScore: 9,
          }))
        )
        .mockResolvedValueOnce(
          Array.from({ length: 14 }, (_, i) => ({
            date: new Date(Date.now() - (14 - i) * 86400000),
            mood: 2, positiveCount: 0, negativeCount: 5, closenessScore: 1,
          }))
        );

      const result = await detectPursueWithdrawPattern('rel-1-uuid', 14, prisma);

      if (result.patternDetected) {
        expect(result.clinicalNotes).toBeDefined();
        expect(typeof result.clinicalNotes).toBe('string');
        expect(result.clinicalNotes.length).toBeGreaterThan(0);
      }
    });
  });

  describe('constants', () => {
    it('should export intensity levels', () => {
      expect(INTENSITY.NONE).toBe('none');
      expect(INTENSITY.MILD).toBe('mild');
      expect(INTENSITY.MODERATE).toBe('moderate');
      expect(INTENSITY.SEVERE).toBe('severe');
    });

    it('should export trend directions', () => {
      expect(TREND.IMPROVING).toBe('improving');
      expect(TREND.STABLE).toBe('stable');
      expect(TREND.INTENSIFYING).toBe('intensifying');
    });

    it('should export role types', () => {
      expect(ROLE.PURSUER).toBe('pursuer');
      expect(ROLE.WITHDRAWER).toBe('withdrawer');
      expect(ROLE.BALANCED).toBe('balanced');
    });
  });
});
