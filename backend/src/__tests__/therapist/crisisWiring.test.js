/**
 * Tests for the crisis-detection wiring:
 * - write-path hooks in routes/logs.js and routes/real-talk.js
 * - detectCrisisAndNotify (therapistAlerts write-path hook)
 * - _findLinkedTherapists routing via the live TherapistClient model
 * - alert dedupe and email notification delivery
 * - runDailyAlertScan (scheduler entry point)
 */

'use strict';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../utils/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  isEmailConfigured: jest.fn(() => true),
}));

const { errorHandler } = require('../../middleware/errorHandler');
const { sendEmail } = require('../../utils/email');
const {
  triggerTherapistAlert,
  detectCrisisAndNotify,
  runDailyAlertScan,
  ALERT_TYPE,
  ALERT_SEVERITY,
} = require('../../utils/therapistAlerts');
const { createMockPrisma } = require('./testFixtures');

const JWT_SECRET = 'test-jwt-secret-key-for-testing';
const CLIENT_ID = 'user-1-uuid';

const CRISIS_JOURNAL = 'I had a huge fight with my partner and now I want to die';
const BENIGN_JOURNAL = 'We had a nice dinner and talked about our vacation plans';

/** Drain the fire-and-forget alert pipeline (all mocks resolve on microtasks). */
async function flushAsync(times = 25) {
  for (let i = 0; i < times; i++) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}

/** GRANTED TherapistClient link, shaped like the select in _findLinkedTherapists. */
function grantedLink(overrides = {}) {
  return {
    therapistId: 'therapist-1-uuid',
    coupleId: 'rel-1-uuid',
    therapist: {
      email: 'dr.smith@therapy.com',
      firstName: 'Emily',
      lastName: 'Smith',
      isActive: true,
    },
    ...overrides,
  };
}

function makeRoutePrisma() {
  const authUser = {
    id: CLIENT_ID,
    email: 'client@example.com',
    firstName: 'Sarah',
    lastName: 'Chen',
    role: 'user',
    subscriptionStatus: 'trial',
    trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    stripeCustomerId: null,
    isPlatformAdmin: false,
    tokenVersion: 0,
    createdAt: new Date(),
  };

  return {
    user: { findUnique: jest.fn().mockResolvedValue(authUser) },
    dailyLog: {
      upsert: jest.fn().mockResolvedValue({
        id: 'log-1',
        userId: CLIENT_ID,
        date: new Date(),
        positiveCount: 1,
        negativeCount: 0,
        ratio: 999,
        journalEntry: CRISIS_JOURNAL,
        bidsTurned: null,
        closenessScore: null,
        mood: 3,
      }),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    realTalk: {
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: 'rt-1', ...data, createdAt: new Date() })
      ),
      count: jest.fn().mockResolvedValue(1),
    },
    therapistClient: {
      findMany: jest.fn().mockResolvedValue([grantedLink()]),
    },
    relationship: { findMany: jest.fn().mockResolvedValue([]) },
    therapistAssignment: { findMany: jest.fn().mockResolvedValue([]) },
    therapistAlert: {
      create: jest.fn().mockResolvedValue({ id: 'alert-1' }),
      count: jest.fn().mockResolvedValue(0),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
}

function makeApp(mockPrisma) {
  process.env.JWT_SECRET = JWT_SECRET;
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.prisma = mockPrisma;
    next();
  });
  app.use('/api/logs', require('../../routes/logs'));
  app.use('/api/real-talk', require('../../routes/real-talk'));
  app.use(errorHandler);
  return app;
}

function token() {
  return jwt.sign({ userId: CLIENT_ID }, JWT_SECRET, { expiresIn: '1h' });
}

// ═══════════════════════════════════════════════════════════════
// Daily log write path (POST /api/logs/daily)
// ═══════════════════════════════════════════════════════════════

describe('POST /api/logs/daily crisis detection', () => {
  let prisma;
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = makeRoutePrisma();
    app = makeApp(prisma);
  });

  it('creates a CRISIS TherapistAlert for the GRANTED-consent therapist on crisis journal text', async () => {
    const res = await request(app)
      .post('/api/logs/daily')
      .set('Authorization', `Bearer ${token()}`)
      .send({ positiveCount: 1, negativeCount: 0, journalEntry: CRISIS_JOURNAL, mood: 3 });

    expect(res.status).toBe(201);
    await flushAsync();

    // Therapist lookup uses the live TherapistClient model with GRANTED consent
    expect(prisma.therapistClient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clientId: CLIENT_ID, consentStatus: 'GRANTED' }),
      })
    );

    expect(prisma.therapistAlert.create).toHaveBeenCalledTimes(1);
    const createArg = prisma.therapistAlert.create.mock.calls[0][0];
    expect(createArg.data.therapistId).toBe('therapist-1-uuid');
    expect(createArg.data.clientId).toBe(CLIENT_ID);
    expect(createArg.data.alertType).toBe(ALERT_TYPE.CRISIS);
    // "want to die" is a safety escalator → level 3 → CRITICAL
    expect(createArg.data.severity).toBe(ALERT_SEVERITY.CRITICAL);
  });

  it('never includes the journal text in the alert row or audit log', async () => {
    const res = await request(app)
      .post('/api/logs/daily')
      .set('Authorization', `Bearer ${token()}`)
      .send({ journalEntry: CRISIS_JOURNAL });

    expect(res.status).toBe(201);
    await flushAsync();

    expect(prisma.therapistAlert.create).toHaveBeenCalled();
    for (const call of prisma.therapistAlert.create.mock.calls) {
      expect(JSON.stringify(call[0])).not.toContain(CRISIS_JOURNAL);
      expect(JSON.stringify(call[0]).toLowerCase()).not.toContain('want to die');
    }
    for (const call of prisma.auditLog.create.mock.calls) {
      expect(JSON.stringify(call[0])).not.toContain(CRISIS_JOURNAL);
      expect(JSON.stringify(call[0]).toLowerCase()).not.toContain('want to die');
    }
  });

  it('writes a CRISIS_DETECTED audit log entry', async () => {
    await request(app)
      .post('/api/logs/daily')
      .set('Authorization', `Bearer ${token()}`)
      .send({ journalEntry: CRISIS_JOURNAL });
    await flushAsync();

    const auditActions = prisma.auditLog.create.mock.calls.map((c) => c[0].data.action);
    expect(auditActions).toContain('CRISIS_DETECTED');
  });

  it('includes crisis resources in the API response so the app can show 988/DV help', async () => {
    const res = await request(app)
      .post('/api/logs/daily')
      .set('Authorization', `Bearer ${token()}`)
      .send({ journalEntry: CRISIS_JOURNAL });

    expect(res.status).toBe(201);
    expect(res.body.crisis).toBeDefined();
    expect(res.body.crisis.detected).toBe(true);
    expect(res.body.crisis.safetyRisk).toBe(true);
    expect(res.body.crisis.resources.length).toBeGreaterThan(0);
    const allResources = JSON.stringify(res.body.crisis.resources);
    expect(allResources).toContain('988');
    // The client's own text is never echoed in the crisis payload
    expect(JSON.stringify(res.body.crisis)).not.toContain(CRISIS_JOURNAL);
  });

  it('creates no alert and no crisis payload for benign journal text', async () => {
    const res = await request(app)
      .post('/api/logs/daily')
      .set('Authorization', `Bearer ${token()}`)
      .send({ positiveCount: 5, negativeCount: 1, journalEntry: BENIGN_JOURNAL, mood: 8 });

    expect(res.status).toBe(201);
    await flushAsync();

    expect(res.body.crisis).toBeUndefined();
    expect(prisma.therapistAlert.create).not.toHaveBeenCalled();
  });

  it('still saves the log when the alert pipeline fails (fire-and-forget)', async () => {
    prisma.therapistClient.findMany.mockRejectedValue(new Error('DB down'));
    prisma.relationship.findMany.mockRejectedValue(new Error('DB down'));
    prisma.auditLog.create.mockRejectedValue(new Error('DB down'));

    const res = await request(app)
      .post('/api/logs/daily')
      .set('Authorization', `Bearer ${token()}`)
      .send({ journalEntry: CRISIS_JOURNAL });

    expect(res.status).toBe(201);
    expect(res.body.log).toBeDefined();
    // Client still gets the resources even though therapist alerting failed
    expect(res.body.crisis).toBeDefined();
    await flushAsync();
  });
});

// ═══════════════════════════════════════════════════════════════
// Real Talk write path (POST /api/real-talk)
// ═══════════════════════════════════════════════════════════════

describe('POST /api/real-talk crisis detection', () => {
  let prisma;
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = makeRoutePrisma();
    app = makeApp(prisma);
  });

  it('detects crisis language, saves the Real Talk, and returns the safety-dialog shape', async () => {
    const res = await request(app)
      .post('/api/real-talk')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        issue: 'everything is falling apart and I want to die',
        feeling: 'hopeless',
        need: 'some support',
      });

    expect(res.status).toBe(201);
    // The Real Talk itself was still saved
    expect(prisma.realTalk.create).toHaveBeenCalled();
    expect(res.body.realTalk).toBeDefined();

    // Safety-dialog contract used by frontend RealTalk.js (res.data.safety)
    expect(res.body.safety).toBe(true);
    expect(res.body.hotline).toContain('988');
    expect(res.body.textLine).toBeDefined();
    expect(res.body.url).toBeDefined();

    // Structured crisis payload with resources
    expect(res.body.crisis.detected).toBe(true);
    expect(res.body.crisis.resources.length).toBeGreaterThan(0);

    await flushAsync();
    expect(prisma.therapistAlert.create).toHaveBeenCalledTimes(1);
    expect(prisma.therapistAlert.create.mock.calls[0][0].data.alertType).toBe(ALERT_TYPE.CRISIS);
    // No Real Talk text in the alert
    expect(JSON.stringify(prisma.therapistAlert.create.mock.calls[0][0]))
      .not.toContain('falling apart');
  });

  it('creates no alert for a normal Real Talk', async () => {
    const res = await request(app)
      .post('/api/real-talk')
      .set('Authorization', `Bearer ${token()}`)
      .send({
        issue: 'the dishes pile up in the sink every evening',
        feeling: 'frustrated',
        need: 'us to share the cleanup',
      });

    expect(res.status).toBe(201);
    await flushAsync();

    expect(res.body.safety).toBeUndefined();
    expect(res.body.crisis).toBeUndefined();
    expect(prisma.therapistAlert.create).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════
// _findLinkedTherapists (via triggerTherapistAlert)
// ═══════════════════════════════════════════════════════════════

describe('therapist routing via TherapistClient', () => {
  let prisma;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createMockPrisma();
    prisma.therapistAlert.create.mockResolvedValue({ id: 'alert-1' });
    prisma.auditLog.create.mockResolvedValue({});
  });

  it('routes alerts via GRANTED TherapistClient links (live model)', async () => {
    prisma.therapistClient.findMany.mockResolvedValue([grantedLink()]);
    prisma.relationship.findMany.mockResolvedValue([]);

    const alerts = await triggerTherapistAlert(
      CLIENT_ID,
      ALERT_TYPE.CRISIS,
      ALERT_SEVERITY.HIGH,
      { title: 'Crisis', summary: 'Level 2 crisis detected.' },
      prisma
    );

    expect(prisma.therapistClient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clientId: CLIENT_ID, consentStatus: 'GRANTED' }),
      })
    );
    expect(alerts.length).toBe(1);
    expect(alerts[0].therapistId).toBe('therapist-1-uuid');
    expect(alerts[0].relationshipId).toBe('rel-1-uuid');
  });

  it('skips inactive therapists on TherapistClient links', async () => {
    prisma.therapistClient.findMany.mockResolvedValue([
      grantedLink({ therapist: { email: 'x@y.com', firstName: 'A', lastName: 'B', isActive: false } }),
    ]);
    prisma.relationship.findMany.mockResolvedValue([]);

    const alerts = await triggerTherapistAlert(
      CLIENT_ID, ALERT_TYPE.RISK, ALERT_SEVERITY.MEDIUM,
      { title: 'Risk', summary: 'x' }, prisma
    );

    expect(alerts).toEqual([]);
    expect(prisma.therapistAlert.create).not.toHaveBeenCalled();
  });

  it('falls back to legacy TherapistAssignment rows when no TherapistClient links exist', async () => {
    prisma.therapistClient.findMany.mockResolvedValue([]);
    prisma.relationship.findMany.mockResolvedValue([{ id: 'rel-1-uuid' }]);
    prisma.therapistAssignment.findMany.mockResolvedValue([
      { therapistId: 'legacy-therapist-uuid', relationshipId: 'rel-1-uuid', therapist: null },
    ]);

    const alerts = await triggerTherapistAlert(
      CLIENT_ID, ALERT_TYPE.CRISIS, ALERT_SEVERITY.HIGH,
      { title: 'Crisis', summary: 'x' }, prisma
    );

    expect(alerts.length).toBe(1);
    expect(alerts[0].therapistId).toBe('legacy-therapist-uuid');
  });

  it('unions live + legacy links and dedupes by therapistId', async () => {
    prisma.therapistClient.findMany.mockResolvedValue([grantedLink()]);
    prisma.relationship.findMany.mockResolvedValue([{ id: 'rel-1-uuid' }]);
    prisma.therapistAssignment.findMany.mockResolvedValue([
      { therapistId: 'therapist-1-uuid', relationshipId: 'rel-1-uuid', therapist: null }, // duplicate
      { therapistId: 'therapist-2-uuid', relationshipId: 'rel-1-uuid', therapist: null }, // legacy-only
    ]);

    const alerts = await triggerTherapistAlert(
      CLIENT_ID, ALERT_TYPE.CRISIS, ALERT_SEVERITY.HIGH,
      { title: 'Crisis', summary: 'x' }, prisma
    );

    expect(alerts.length).toBe(2);
    expect(alerts.map((a) => a.therapistId).sort()).toEqual([
      'therapist-1-uuid', 'therapist-2-uuid',
    ]);
  });

  // ── Permission-tier gating (consent matrix) ──
  // mood_trends / crisis_alerts require STANDARD, so non-crisis alerts must NOT
  // route to a BASIC-tier link — but CRISIS always routes (safety override).

  it('does NOT route a MILESTONE alert to a BASIC-tier link', async () => {
    prisma.therapistClient.findMany.mockResolvedValue([grantedLink({ permissionLevel: 'BASIC' })]);
    prisma.relationship.findMany.mockResolvedValue([]);

    const alerts = await triggerTherapistAlert(
      CLIENT_ID, ALERT_TYPE.MILESTONE, ALERT_SEVERITY.LOW,
      { title: 'Streak', summary: '30-day streak' }, prisma
    );

    expect(alerts).toEqual([]);
    expect(prisma.therapistAlert.create).not.toHaveBeenCalled();
  });

  it('does NOT route a RISK alert to a BASIC-tier link', async () => {
    prisma.therapistClient.findMany.mockResolvedValue([grantedLink({ permissionLevel: 'BASIC' })]);
    prisma.relationship.findMany.mockResolvedValue([]);

    const alerts = await triggerTherapistAlert(
      CLIENT_ID, ALERT_TYPE.RISK, ALERT_SEVERITY.MEDIUM,
      { title: 'Score drop', summary: 'x' }, prisma
    );

    expect(alerts).toEqual([]);
  });

  it('STILL routes a CRISIS alert to a BASIC-tier link (safety override)', async () => {
    prisma.therapistClient.findMany.mockResolvedValue([grantedLink({ permissionLevel: 'BASIC' })]);
    prisma.relationship.findMany.mockResolvedValue([]);

    const alerts = await triggerTherapistAlert(
      CLIENT_ID, ALERT_TYPE.CRISIS, ALERT_SEVERITY.CRITICAL,
      { title: 'Crisis', summary: 'Level 3 crisis detected.' }, prisma
    );

    expect(alerts.length).toBe(1);
    expect(alerts[0].therapistId).toBe('therapist-1-uuid');
    expect(prisma.therapistAlert.create).toHaveBeenCalledTimes(1);
  });

  it('routes a MILESTONE alert to a STANDARD-tier link', async () => {
    prisma.therapistClient.findMany.mockResolvedValue([grantedLink({ permissionLevel: 'STANDARD' })]);
    prisma.relationship.findMany.mockResolvedValue([]);

    const alerts = await triggerTherapistAlert(
      CLIENT_ID, ALERT_TYPE.MILESTONE, ALERT_SEVERITY.LOW,
      { title: 'Streak', summary: '30-day streak' }, prisma
    );

    expect(alerts.length).toBe(1);
    expect(alerts[0].alertType).toBe(ALERT_TYPE.MILESTONE);
  });
});

// ═══════════════════════════════════════════════════════════════
// Dedupe + email notification
// ═══════════════════════════════════════════════════════════════

describe('alert dedupe and email delivery', () => {
  let prisma;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createMockPrisma();
    prisma.therapistClient.findMany.mockResolvedValue([grantedLink()]);
    prisma.relationship.findMany.mockResolvedValue([]);
    prisma.therapistAlert.create.mockResolvedValue({ id: 'alert-1' });
    prisma.auditLog.create.mockResolvedValue({});
  });

  it('skips creating a duplicate unread alert of the same type within 24h', async () => {
    prisma.therapistAlert.count.mockResolvedValue(1); // existing unread alert

    const alerts = await triggerTherapistAlert(
      CLIENT_ID, ALERT_TYPE.CRISIS, ALERT_SEVERITY.HIGH,
      { title: 'Crisis', summary: 'x' }, prisma
    );

    expect(alerts).toEqual([]);
    expect(prisma.therapistAlert.create).not.toHaveBeenCalled();
    expect(prisma.therapistAlert.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          therapistId: 'therapist-1-uuid',
          clientId: CLIENT_ID,
          alertType: ALERT_TYPE.CRISIS,
          readAt: null,
        }),
      })
    );
  });

  it('creates the alert when the dedupe check errors (fails open)', async () => {
    prisma.therapistAlert.count.mockRejectedValue(new Error('DB error'));

    const alerts = await triggerTherapistAlert(
      CLIENT_ID, ALERT_TYPE.CRISIS, ALERT_SEVERITY.CRITICAL,
      { title: 'Crisis', summary: 'x' }, prisma
    );

    expect(alerts.length).toBe(1);
    expect(prisma.therapistAlert.create).toHaveBeenCalled();
  });

  it('sends an email to the linked therapist for CRISIS alerts, without client text', async () => {
    await triggerTherapistAlert(
      CLIENT_ID, ALERT_TYPE.CRISIS, ALERT_SEVERITY.CRITICAL,
      { title: 'SAFETY RISK — Level 3 Crisis Detected', summary: 'Level 3 crisis detected.' },
      prisma
    );

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const emailArg = sendEmail.mock.calls[0][0];
    expect(emailArg.to).toBe('dr.smith@therapy.com');
    expect(emailArg.subject).toContain('URGENT');
    expect(emailArg.text).toContain('Level 3 crisis detected.');
  });

  it('does not send email for LOW severity (IN_APP only channel)', async () => {
    await triggerTherapistAlert(
      CLIENT_ID, ALERT_TYPE.MILESTONE, ALERT_SEVERITY.LOW,
      { title: 'Milestone', summary: 'Streak' }, prisma
    );

    expect(sendEmail).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════
// detectCrisisAndNotify (unit)
// ═══════════════════════════════════════════════════════════════

describe('detectCrisisAndNotify', () => {
  let prisma;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createMockPrisma();
    prisma.therapistClient.findMany.mockResolvedValue([grantedLink()]);
    prisma.relationship.findMany.mockResolvedValue([]);
    prisma.therapistAlert.create.mockResolvedValue({ id: 'alert-1' });
    prisma.auditLog.create.mockResolvedValue({});
  });

  it('returns null for benign text and for empty/undefined text', async () => {
    expect(detectCrisisAndNotify(CLIENT_ID, BENIGN_JOURNAL, { prisma })).toBeNull();
    expect(detectCrisisAndNotify(CLIENT_ID, '', { prisma })).toBeNull();
    expect(detectCrisisAndNotify(CLIENT_ID, undefined, { prisma })).toBeNull();
    await flushAsync();
    expect(prisma.therapistAlert.create).not.toHaveBeenCalled();
  });

  it('returns null for a level-1 (elevated) crisis — below alerting threshold', async () => {
    // Single flooding indicator with no escalators/amplifiers → level 1
    const payload = detectCrisisAndNotify(CLIENT_ID, 'I had a panic attack this morning', { prisma });
    expect(payload).toBeNull();
    await flushAsync();
    expect(prisma.therapistAlert.create).not.toHaveBeenCalled();
  });

  it('returns a resources payload and fires alerts for emergency text', async () => {
    const payload = detectCrisisAndNotify(CLIENT_ID, CRISIS_JOURNAL, {
      prisma, source: 'daily_log',
    });

    expect(payload).not.toBeNull();
    expect(payload.detected).toBe(true);
    expect(payload.level).toBe(3);
    expect(payload.safetyRisk).toBe(true);
    expect(payload.resources.length).toBeGreaterThan(0);
    expect(JSON.stringify(payload.resources)).toContain('988');

    await flushAsync();
    expect(prisma.therapistAlert.create).toHaveBeenCalledTimes(1);
    expect(prisma.therapistAlert.create.mock.calls[0][0].data.severity).toBe(ALERT_SEVERITY.CRITICAL);

    const audit = prisma.auditLog.create.mock.calls.find(
      (c) => c[0].data.action === 'CRISIS_DETECTED'
    );
    expect(audit).toBeDefined();
    expect(audit[0].data.resource).toBe('daily_log');
    expect(audit[0].data.metadata.crisisLevel).toBe(3);
    expect(JSON.stringify(audit[0])).not.toContain(CRISIS_JOURNAL);
  });

  it('always includes core lifelines for acute (level 2) crises without safety risk', async () => {
    // Acute affair-discovery language, no self-harm indicators
    const payload = detectCrisisAndNotify(
      CLIENT_ID,
      'I found messages proving my wife is cheating, this affair is destroying me',
      { prisma, source: 'daily_log' }
    );

    expect(payload).not.toBeNull();
    expect(payload.level).toBeGreaterThanOrEqual(2);
    expect(payload.safetyRisk).toBe(false);
    expect(payload.resources.length).toBeGreaterThan(0);
    expect(JSON.stringify(payload.resources)).toContain('988');
    await flushAsync();
  });
});

// ═══════════════════════════════════════════════════════════════
// runDailyAlertScan (scheduler entry point)
// ═══════════════════════════════════════════════════════════════

describe('runDailyAlertScan', () => {
  let prisma;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createMockPrisma();
    // Quiet data: nothing to alert on
    prisma.relationship.findMany.mockResolvedValue([]);
    prisma.dailyLog.findFirst.mockResolvedValue({ createdAt: new Date(), date: new Date() });
    prisma.dailyLog.findMany.mockResolvedValue([]);
    prisma.courseProgress.findUnique.mockResolvedValue(null);
    prisma.therapistAlert.create.mockResolvedValue({ id: 'alert-1' });
    prisma.auditLog.create.mockResolvedValue({});
  });

  it('scans every client with a GRANTED link to an active therapist', async () => {
    prisma.therapistClient.findMany.mockResolvedValue([
      { clientId: 'user-1-uuid' },
      { clientId: 'user-2-uuid' },
    ]);
    prisma.therapistAssignment.findMany.mockResolvedValue([]);

    const summary = await runDailyAlertScan(prisma);

    expect(summary.clientsScanned).toBe(2);
    expect(summary.failures).toBe(0);
    // Risk + milestone generation ran per client (assessment history queried)
    expect(prisma.assessment.findMany).toHaveBeenCalled();
  });

  it('includes legacy assignment clients and dedupes across sources', async () => {
    prisma.therapistClient.findMany.mockResolvedValue([{ clientId: 'user-1-uuid' }]);
    prisma.therapistAssignment.findMany.mockResolvedValue([
      { relationship: { user1Id: 'user-1-uuid', user2Id: 'user-2-uuid', status: 'active' } },
      { relationship: { user1Id: 'user-3-uuid', user2Id: null, status: 'ended' } }, // inactive rel excluded
    ]);

    const summary = await runDailyAlertScan(prisma);

    expect(summary.clientsScanned).toBe(2); // user-1 deduped, user-3 excluded
  });

  it('survives roster query failures and still returns a summary', async () => {
    prisma.therapistClient.findMany.mockRejectedValue(new Error('DB down'));
    prisma.therapistAssignment.findMany.mockRejectedValue(new Error('DB down'));

    const summary = await runDailyAlertScan(prisma);

    expect(summary).toEqual({
      clientsScanned: 0, riskAlerts: 0, milestoneAlerts: 0, failures: 0,
    });
  });

  it('isolates per-client failures so one bad client does not kill the run', async () => {
    prisma.therapistClient.findMany
      .mockResolvedValueOnce([{ clientId: 'user-1-uuid' }, { clientId: 'user-2-uuid' }]);
    // Deep failure inside risk generation is swallowed per-check; scan completes
    prisma.assessment.findMany.mockRejectedValue(new Error('corrupt data'));

    const summary = await runDailyAlertScan(prisma);

    expect(summary.clientsScanned).toBe(2);
    // No throw — the run completed for both clients
    expect(summary.riskAlerts).toBe(0);
  });
});
