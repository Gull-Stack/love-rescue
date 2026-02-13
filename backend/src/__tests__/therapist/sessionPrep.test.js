/**
 * Tests for sessionPrep.js — Session Prep Report Generator
 */

'use strict';

const { generateSessionPrepReport, EXPERT_INSIGHTS } = require('../../utils/sessionPrep');
const { createMockPrisma, mockUser1, makeDailyLogs } = require('./testFixtures');

// ═══════════════════════════════════════════════════════════════
// generateSessionPrepReport
// ═══════════════════════════════════════════════════════════════

describe('generateSessionPrepReport', () => {
  let prisma;

  beforeEach(() => {
    prisma = createMockPrisma();

    // Default mock setup: client exists, has some activity
    prisma.user.findUnique.mockResolvedValue(mockUser1);
    prisma.dailyLog.findMany
      .mockResolvedValueOnce(makeDailyLogs('user-1-uuid', 10, 'improving')) // recent logs
      .mockResolvedValueOnce(makeDailyLogs('user-1-uuid', 10, 'stable')); // previous period
    prisma.assessment.findMany
      .mockResolvedValueOnce([
        { type: 'gottman_checkup', score: { total: 65 }, completedAt: new Date() },
      ]) // recent assessments
      .mockResolvedValueOnce([
        { type: 'gottman_checkup', score: { total: 55 }, completedAt: new Date(Date.now() - 30 * 86400000) },
      ]); // previous assessments
    prisma.therapistTask.findMany
      .mockResolvedValueOnce([{ id: 't1', completed: true, completedAt: new Date(), taskDescription: 'Practice gentle startup' }]) // completed
      .mockResolvedValueOnce([{ id: 't2', completed: false, taskDescription: 'Journal daily', dueDate: new Date() }]); // pending
    prisma.therapistAlert.findMany.mockResolvedValue([]);
    prisma.courseProgress.findFirst.mockResolvedValue({
      currentWeek: 3, isActive: true, completedWeeks: [1, 2],
    });
    prisma.relationship.findFirst.mockResolvedValue({
      id: 'rel-1-uuid', user1Id: 'user-1-uuid', user2Id: 'user-2-uuid', status: 'active',
    });
    // gratitude entries (if queried)
    if (prisma.gratitudeEntry) {
      prisma.gratitudeEntry = { findMany: jest.fn().mockResolvedValue([]) };
    }
  });

  it('should generate a session prep report', async () => {
    const report = await generateSessionPrepReport(
      prisma,
      'therapist-1-uuid',
      'user-1-uuid',
      new Date(Date.now() - 14 * 86400000).toISOString()
    );

    expect(report).toBeDefined();
    // Should contain key sections
    expect(report).toHaveProperty('client');
    expect(report).toHaveProperty('lastSessionDate');
  });

  it('should handle null lastSessionDate (defaults to 14 days ago)', async () => {
    const report = await generateSessionPrepReport(
      prisma,
      'therapist-1-uuid',
      'user-1-uuid',
      null
    );

    expect(report).toBeDefined();
  });

  it('should handle client with no activity', async () => {
    prisma.dailyLog.findMany.mockResolvedValue([]);
    prisma.assessment.findMany.mockResolvedValue([]);
    prisma.therapistTask.findMany.mockResolvedValue([]);
    prisma.therapistAlert.findMany.mockResolvedValue([]);
    prisma.courseProgress.findFirst.mockResolvedValue(null);

    const report = await generateSessionPrepReport(
      prisma,
      'therapist-1-uuid',
      'user-1-uuid',
      null
    );

    expect(report).toBeDefined();
  });

  it('should throw or reject for missing client', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      generateSessionPrepReport(prisma, 'therapist-1-uuid', 'nonexistent-user', null)
    ).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════
// EXPERT_INSIGHTS templates
// ═══════════════════════════════════════════════════════════════

describe('EXPERT_INSIGHTS', () => {
  it('should generate ratio change insight', () => {
    const insight = EXPERT_INSIGHTS.ratioChange(3.2, 5.5);
    expect(insight).toContain('improved');
    expect(insight).toContain('5:1');
  });

  it('should generate declining ratio insight', () => {
    const insight = EXPERT_INSIGHTS.ratioChange(6.0, 3.0);
    expect(insight).toContain('declined');
  });

  it('should generate stable mood insight', () => {
    const insight = EXPERT_INSIGHTS.moodTrend(7.0, 7.2);
    expect(insight).toContain('stable');
  });

  it('should generate improving mood insight', () => {
    const insight = EXPERT_INSIGHTS.moodTrend(5.0, 7.5);
    expect(insight).toContain('upward');
  });

  it('should generate declining mood insight', () => {
    const insight = EXPERT_INSIGHTS.moodTrend(8.0, 5.0);
    expect(insight).toContain('declining');
  });

  it('should generate engagement insight for high engagement', () => {
    const insight = EXPERT_INSIGHTS.engagement(90, 14);
    expect(insight).toContain('excellent');
  });

  it('should generate engagement insight for low engagement', () => {
    const insight = EXPERT_INSIGHTS.engagement(20, 0);
    expect(insight).toContain('Low');
  });

  it('should generate crisis context with no flags', () => {
    const insight = EXPERT_INSIGHTS.crisisContext([]);
    expect(insight).toContain('No crisis flags');
  });

  it('should generate crisis context with flags', () => {
    const insight = EXPERT_INSIGHTS.crisisContext([{ type: 'AFFAIR_DISCOVERY' }]);
    expect(insight).toContain('1 crisis flag');
  });

  it('should generate attachment progress insight for anxious style', () => {
    const insight = EXPERT_INSIGHTS.attachmentProgress('anxious', { closenessImproved: true });
    expect(insight).toContain('anxious');
  });

  it('should generate attachment progress for avoidant style', () => {
    const insight = EXPERT_INSIGHTS.attachmentProgress('avoidant', { journalFrequencyUp: false });
    expect(insight).toContain('avoidant');
  });
});
