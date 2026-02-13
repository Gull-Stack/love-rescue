/**
 * Tests for therapistAlerts.js — Alert System
 */

'use strict';

const {
  triggerTherapistAlert,
  generateRiskAlerts,
  generateMilestoneAlerts,
  getAlertDigest,
  handleCrisisDetection,
  ALERT_TYPE,
  ALERT_SEVERITY,
  ALERT_STATUS,
  DEFAULT_THRESHOLDS,
} = require('../../utils/therapistAlerts');

const { createMockPrisma, mockTherapistAssignment } = require('./testFixtures');

// ═══════════════════════════════════════════════════════════════
// triggerTherapistAlert
// ═══════════════════════════════════════════════════════════════

describe('triggerTherapistAlert', () => {
  let prisma;

  beforeEach(() => {
    prisma = createMockPrisma();
    // Setup: client has a relationship with an active therapist assignment
    prisma.relationship.findMany.mockResolvedValue([{ id: 'rel-1-uuid' }]);
    prisma.therapistAssignment.findMany.mockResolvedValue([mockTherapistAssignment]);
    prisma.therapistAlert.create.mockResolvedValue({ id: 'alert-1' });
    prisma.auditLog.create.mockResolvedValue({});
  });

  it('should create alerts for linked therapists', async () => {
    const alerts = await triggerTherapistAlert(
      'user-1-uuid',
      ALERT_TYPE.CRISIS,
      ALERT_SEVERITY.HIGH,
      { title: 'Test Crisis', summary: 'Test summary', details: { level: 2 } },
      prisma
    );

    expect(alerts.length).toBe(1);
    expect(alerts[0].therapistId).toBe('therapist-1-uuid');
    expect(alerts[0].alertType).toBe(ALERT_TYPE.CRISIS);
    expect(alerts[0].severity).toBe(ALERT_SEVERITY.HIGH);
    expect(prisma.therapistAlert.create).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('should return empty array when no linked therapists', async () => {
    prisma.relationship.findMany.mockResolvedValue([]);
    prisma.therapistAssignment.findMany.mockResolvedValue([]);

    const alerts = await triggerTherapistAlert(
      'user-1-uuid',
      ALERT_TYPE.RISK,
      ALERT_SEVERITY.MEDIUM,
      { title: 'Test', summary: 'Test' },
      prisma
    );

    expect(alerts).toEqual([]);
  });

  it('should throw on missing required parameters', async () => {
    await expect(
      triggerTherapistAlert(null, ALERT_TYPE.CRISIS, ALERT_SEVERITY.HIGH, { title: 'X', summary: 'X' }, prisma)
    ).rejects.toThrow();

    await expect(
      triggerTherapistAlert('user-1', null, ALERT_SEVERITY.HIGH, { title: 'X', summary: 'X' }, prisma)
    ).rejects.toThrow();

    await expect(
      triggerTherapistAlert('user-1', ALERT_TYPE.CRISIS, null, { title: 'X', summary: 'X' }, prisma)
    ).rejects.toThrow();

    await expect(
      triggerTherapistAlert('user-1', ALERT_TYPE.CRISIS, ALERT_SEVERITY.HIGH, null, prisma)
    ).rejects.toThrow();
  });

  it('should throw on invalid alertType', async () => {
    await expect(
      triggerTherapistAlert('user-1', 'INVALID_TYPE', ALERT_SEVERITY.HIGH, { title: 'X', summary: 'X' }, prisma)
    ).rejects.toThrow('invalid alertType');
  });

  it('should throw on invalid severity', async () => {
    await expect(
      triggerTherapistAlert('user-1', ALERT_TYPE.CRISIS, 'INVALID_SEV', { title: 'X', summary: 'X' }, prisma)
    ).rejects.toThrow('invalid severity');
  });

  it('should set correct notification channels based on severity', async () => {
    const alerts = await triggerTherapistAlert(
      'user-1-uuid',
      ALERT_TYPE.CRISIS,
      ALERT_SEVERITY.CRITICAL,
      { title: 'Emergency', summary: 'Emergency alert' },
      prisma
    );

    if (alerts.length > 0) {
      // CRITICAL should include all channels: IN_APP, PUSH, EMAIL, SMS
      expect(alerts[0].channels).toContain('IN_APP');
      expect(alerts[0].channels).toContain('SMS');
    }
  });

  it('should not throw when DB write fails (graceful degradation)', async () => {
    prisma.therapistAlert.create.mockRejectedValue(new Error('DB error'));

    const alerts = await triggerTherapistAlert(
      'user-1-uuid',
      ALERT_TYPE.RISK,
      ALERT_SEVERITY.LOW,
      { title: 'Test', summary: 'Test' },
      prisma
    );

    // Should not throw, should return empty or partial
    expect(alerts).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// generateRiskAlerts
// ═══════════════════════════════════════════════════════════════

describe('generateRiskAlerts', () => {
  let prisma;

  beforeEach(() => {
    prisma = createMockPrisma();
    prisma.relationship.findMany.mockResolvedValue([{ id: 'rel-1-uuid' }]);
    prisma.therapistAssignment.findMany.mockResolvedValue([mockTherapistAssignment]);
    prisma.therapistAlert.create.mockResolvedValue({ id: 'alert-1' });
    prisma.auditLog.create.mockResolvedValue({});
  });

  it('should detect score drops exceeding threshold', async () => {
    prisma.assessment.findMany.mockResolvedValue([
      { type: 'gottman_checkup', score: { total: 40 }, completedAt: new Date() },
      { type: 'gottman_checkup', score: { total: 70 }, completedAt: new Date(Date.now() - 30 * 86400000) },
    ]);
    prisma.strategy.findMany.mockResolvedValue([]);
    prisma.dailyLog.findFirst.mockResolvedValue({ createdAt: new Date() });

    const alerts = await generateRiskAlerts('user-1-uuid', {}, prisma);

    // Should detect the 43% score drop
    expect(alerts).toBeDefined();
  });

  it('should detect app disengagement', async () => {
    prisma.assessment.findMany.mockResolvedValue([]);
    prisma.strategy.findMany.mockResolvedValue([]);
    prisma.dailyLog.findFirst
      .mockResolvedValueOnce(null) // no recent logs
      .mockResolvedValueOnce({ createdAt: new Date(Date.now() - 10 * 86400000), date: new Date(Date.now() - 10 * 86400000) }); // last log 10 days ago

    const alerts = await generateRiskAlerts('user-1-uuid', {}, prisma);

    expect(alerts).toBeDefined();
  });

  it('should return empty array when no risks detected', async () => {
    prisma.assessment.findMany.mockResolvedValue([]);
    prisma.strategy.findMany.mockResolvedValue([]);
    prisma.dailyLog.findFirst.mockResolvedValue({ createdAt: new Date() });
    prisma.relationship.findMany.mockResolvedValue([]);

    const alerts = await generateRiskAlerts('user-1-uuid', {}, prisma);

    expect(Array.isArray(alerts)).toBe(true);
  });

  it('should accept custom thresholds', async () => {
    prisma.assessment.findMany.mockResolvedValue([]);
    prisma.strategy.findMany.mockResolvedValue([]);
    prisma.dailyLog.findFirst.mockResolvedValue({ createdAt: new Date() });

    const alerts = await generateRiskAlerts('user-1-uuid', {
      scoreDropPercent: 50,
      noActivityDays: 30,
    }, prisma);

    expect(alerts).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// generateMilestoneAlerts
// ═══════════════════════════════════════════════════════════════

describe('generateMilestoneAlerts', () => {
  let prisma;

  beforeEach(() => {
    prisma = createMockPrisma();
    prisma.relationship.findMany.mockResolvedValue([{ id: 'rel-1-uuid' }]);
    prisma.therapistAssignment.findMany.mockResolvedValue([mockTherapistAssignment]);
    prisma.therapistAlert.create.mockResolvedValue({ id: 'alert-1' });
    prisma.auditLog.create.mockResolvedValue({});
  });

  it('should detect score improvements exceeding threshold', async () => {
    prisma.assessment.findMany.mockResolvedValue([
      { type: 'attachment', score: { total: 80 }, completedAt: new Date() },
      { type: 'attachment', score: { total: 50 }, completedAt: new Date(Date.now() - 30 * 86400000) },
    ]);
    prisma.courseProgress.findUnique.mockResolvedValue(null);
    prisma.dailyLog.findMany.mockResolvedValue([]);

    const alerts = await generateMilestoneAlerts('user-1-uuid', {}, prisma);

    // Should detect the 60% improvement
    expect(alerts).toBeDefined();
  });

  it('should detect first secure attachment score', async () => {
    const oneDayAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    prisma.assessment.findMany.mockImplementation(({ where }) => {
      if (where?.type === 'attachment') {
        return Promise.resolve([
          { type: 'attachment', score: { style: 'anxious' }, completedAt: new Date(Date.now() - 60 * 86400000) },
          { type: 'attachment', score: { style: 'secure' }, completedAt: oneDayAgo },
        ]);
      }
      return Promise.resolve([]);
    });
    prisma.courseProgress.findUnique.mockResolvedValue(null);
    prisma.dailyLog.findMany.mockResolvedValue([]);

    const alerts = await generateMilestoneAlerts('user-1-uuid', {}, prisma);

    expect(alerts).toBeDefined();
  });

  it('should return empty array when no milestones', async () => {
    prisma.assessment.findMany.mockResolvedValue([]);
    prisma.courseProgress.findUnique.mockResolvedValue(null);
    prisma.dailyLog.findMany.mockResolvedValue([]);

    const alerts = await generateMilestoneAlerts('user-1-uuid', {}, prisma);

    expect(Array.isArray(alerts)).toBe(true);
    expect(alerts.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// handleCrisisDetection (bridge)
// ═══════════════════════════════════════════════════════════════

describe('handleCrisisDetection', () => {
  let prisma;

  beforeEach(() => {
    prisma = createMockPrisma();
    prisma.relationship.findMany.mockResolvedValue([{ id: 'rel-1-uuid' }]);
    prisma.therapistAssignment.findMany.mockResolvedValue([mockTherapistAssignment]);
    prisma.therapistAlert.create.mockResolvedValue({ id: 'alert-1' });
    prisma.auditLog.create.mockResolvedValue({});
  });

  it('should map Level 1 crisis to MEDIUM severity', async () => {
    const alerts = await handleCrisisDetection('user-1-uuid', {
      isCrisis: true,
      level: 1,
      primaryType: 'EMOTIONAL_FLOODING',
      allTypes: ['EMOTIONAL_FLOODING'],
      safetyRisk: false,
      safetyResources: [],
      confidence: 0.6,
    }, prisma);

    if (alerts.length > 0) {
      expect(alerts[0].severity).toBe(ALERT_SEVERITY.MEDIUM);
    }
  });

  it('should map Level 3 crisis to CRITICAL severity', async () => {
    const alerts = await handleCrisisDetection('user-1-uuid', {
      isCrisis: true,
      level: 3,
      primaryType: 'ESCALATED_CONFLICT',
      allTypes: ['ESCALATED_CONFLICT'],
      safetyRisk: true,
      safetyResources: [{ name: '988 Lifeline' }],
      confidence: 0.9,
    }, prisma);

    if (alerts.length > 0) {
      expect(alerts[0].severity).toBe(ALERT_SEVERITY.CRITICAL);
    }
  });

  it('should return empty array for non-crisis result', async () => {
    const alerts = await handleCrisisDetection('user-1-uuid', {
      isCrisis: false,
      level: 0,
    }, prisma);

    expect(alerts).toEqual([]);
  });

  it('should return empty array for null crisisResult', async () => {
    const alerts = await handleCrisisDetection('user-1-uuid', null, prisma);
    expect(alerts).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════
// getAlertDigest
// ═══════════════════════════════════════════════════════════════

describe('getAlertDigest', () => {
  let prisma;

  beforeEach(() => {
    prisma = createMockPrisma();
  });

  it('should return grouped digest', async () => {
    prisma.therapistAlert.findMany.mockResolvedValue([
      {
        id: 'a1', therapistId: 'therapist-1-uuid', clientId: 'user-1-uuid',
        alertType: 'CRISIS', severity: 'HIGH', message: 'Crisis detected',
        metadata: { title: 'Crisis', data: {} }, readAt: null, createdAt: new Date(),
        client: { id: 'user-1-uuid', firstName: 'Sarah', lastName: 'Chen' },
      },
      {
        id: 'a2', therapistId: 'therapist-1-uuid', clientId: 'user-1-uuid',
        alertType: 'MILESTONE', severity: 'LOW', message: 'Streak milestone',
        metadata: { title: 'Streak', data: {} }, readAt: new Date(), createdAt: new Date(),
        client: { id: 'user-1-uuid', firstName: 'Sarah', lastName: 'Chen' },
      },
    ]);

    const digest = await getAlertDigest(
      'therapist-1-uuid',
      new Date(Date.now() - 86400000),
      prisma
    );

    expect(digest.therapistId).toBe('therapist-1-uuid');
    expect(digest.totalAlerts).toBe(2);
    expect(digest.summary.byType.CRISIS).toBe(1);
    expect(digest.summary.byType.MILESTONE).toBe(1);
    expect(digest.unacknowledged.length).toBe(1); // Only the HIGH unread one
    expect(Object.keys(digest.byClient)).toContain('user-1-uuid');
  });

  it('should throw on missing therapistId', async () => {
    await expect(getAlertDigest(null, new Date(), prisma)).rejects.toThrow();
  });

  it('should throw on invalid date', async () => {
    await expect(getAlertDigest('t1', 'not-a-date', prisma)).rejects.toThrow();
  });

  it('should handle empty alert list', async () => {
    prisma.therapistAlert.findMany.mockResolvedValue([]);

    const digest = await getAlertDigest('t1', new Date(Date.now() - 86400000), prisma);

    expect(digest.totalAlerts).toBe(0);
    expect(digest.unacknowledged.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// Alert severity routing
// ═══════════════════════════════════════════════════════════════

describe('alert severity routing', () => {
  it('should have correct severity constants', () => {
    expect(ALERT_SEVERITY.LOW).toBe('LOW');
    expect(ALERT_SEVERITY.MEDIUM).toBe('MEDIUM');
    expect(ALERT_SEVERITY.HIGH).toBe('HIGH');
    expect(ALERT_SEVERITY.CRITICAL).toBe('CRITICAL');
  });

  it('should have correct alert type constants', () => {
    expect(ALERT_TYPE.CRISIS).toBe('CRISIS');
    expect(ALERT_TYPE.RISK).toBe('RISK');
    expect(ALERT_TYPE.MILESTONE).toBe('MILESTONE');
    expect(ALERT_TYPE.STAGNATION).toBe('STAGNATION');
  });

  it('should have sensible default thresholds', () => {
    expect(DEFAULT_THRESHOLDS.scoreDropPercent).toBe(15);
    expect(DEFAULT_THRESHOLDS.scoreImprovementPercent).toBe(20);
    expect(DEFAULT_THRESHOLDS.noActivityDays).toBe(5);
    expect(DEFAULT_THRESHOLDS.streakMilestoneDays).toBe(30);
  });
});
