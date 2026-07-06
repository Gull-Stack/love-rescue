/**
 * Therapist dashboard consent enforcement:
 *  - REVOKED/missing consent behaves as no access on detail endpoints
 *  - treatment plans persist (upsert) instead of being echoed and discarded
 *  - couple-level data requires BOTH partners' GRANTED consent
 *  - invite permission ceilings are honest (no silent clamping)
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

const { errorHandler } = require('../../middleware/errorHandler');
const { createMockPrisma } = require('../helpers/mockPrisma');

const JWT_SECRET = process.env.JWT_SECRET;
const THERAPIST_API_KEY = process.env.THERAPIST_API_KEY;

const THERAPIST_ID = 'therapist-1';
const CLIENT_A = 'client-a';
const CLIENT_B = 'client-b';
const COUPLE_ID = 'rel-1';

const THERAPIST = {
  id: THERAPIST_ID,
  email: 'dr@example.com',
  firstName: 'Dana',
  lastName: 'Therapist',
  practiceName: 'Dana Family Therapy',
  approach: 'gottman',
  isActive: true
};

const RELATIONSHIP = {
  id: COUPLE_ID,
  user1Id: CLIENT_A,
  user2Id: CLIENT_B,
  status: 'active',
  user1TherapistConsent: false,
  user2TherapistConsent: false,
  user1: { id: CLIENT_A, firstName: 'Alex', lastName: 'A', email: 'a@example.com' },
  user2: { id: CLIENT_B, firstName: 'Blair', lastName: 'B', email: 'b@example.com' }
};

function grantedLink(clientId, overrides = {}) {
  return {
    id: `link-${clientId}`,
    therapistId: THERAPIST_ID,
    clientId,
    coupleId: COUPLE_ID,
    consentStatus: 'GRANTED',
    consentGrantedAt: new Date(),
    permissionLevel: 'STANDARD',
    ...overrides
  };
}

function createApp(mockPrisma) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.prisma = mockPrisma;
    next();
  });
  app.use('/api/therapist', require('../../routes/therapist'));
  app.use(errorHandler);
  return app;
}

describe('Therapist consent enforcement', () => {
  let mockPrisma;
  let app;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();
    app = createApp(mockPrisma);

    const hashedApiKey = await bcrypt.hash(THERAPIST_API_KEY, 10);
    mockPrisma.therapist.findMany.mockResolvedValue([
      { ...THERAPIST, apiKeyHash: hashedApiKey }
    ]);
    mockPrisma.accessLog.create.mockResolvedValue({});
  });

  const asTherapist = (req) => req.set('x-therapist-api-key', THERAPIST_API_KEY);

  // ── Consent enforcement on detail endpoints ───────────────────────────────

  describe('detail endpoints require GRANTED consent', () => {
    test('GET /clients/:id → 403 CONSENT_REQUIRED when the link is revoked', async () => {
      // requireClientAccess filters on consentStatus: GRANTED, so a revoked
      // link means findFirst returns null
      mockPrisma.therapistClient.findFirst.mockResolvedValue(null);

      const res = await asTherapist(request(app).get(`/api/therapist/clients/${CLIENT_A}`));

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CONSENT_REQUIRED');
      expect(mockPrisma.therapistClient.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ consentStatus: 'GRANTED' })
        })
      );
      // Denied access is still audit-logged
      expect(mockPrisma.accessLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ accessGranted: false })
        })
      );
    });

    test('GET /clients/:id → 200 + audit log when consent is GRANTED', async () => {
      // requireClientAccess attaches the GRANTED link; the handler reuses it and
      // resolves the client user (+ optional couple) directly.
      mockPrisma.therapistClient.findFirst.mockResolvedValue(grantedLink(CLIENT_A));
      mockPrisma.user.findUnique.mockResolvedValue({
        id: CLIENT_A, firstName: 'Alex', lastName: 'A', email: 'a@example.com', createdAt: new Date(),
      });
      mockPrisma.relationship.findUnique.mockResolvedValue(null);

      const res = await asTherapist(request(app).get(`/api/therapist/clients/${CLIENT_A}`));

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(CLIENT_A);
      expect(mockPrisma.accessLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accessorId: THERAPIST_ID,
            resourceOwnerId: CLIENT_A,
            accessGranted: true
          })
        })
      );
    });

    test('GET /clients/:id/assessments → 403 without GRANTED consent', async () => {
      mockPrisma.therapistClient.findFirst.mockResolvedValue(null);

      const res = await asTherapist(
        request(app).get(`/api/therapist/clients/${CLIENT_A}/assessments`)
      );

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CONSENT_REQUIRED');
      expect(mockPrisma.assessment.findMany).not.toHaveBeenCalled();
    });

    test('GET /clients/:id/treatment-plan → 403 without GRANTED consent', async () => {
      mockPrisma.therapistClient.findFirst.mockResolvedValue(null);

      const res = await asTherapist(
        request(app).get(`/api/therapist/clients/${CLIENT_A}/treatment-plan`)
      );

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CONSENT_REQUIRED');
    });

    test('PUT /clients/:id/treatment-plan → 403 and no write without consent', async () => {
      mockPrisma.therapistClient.findFirst.mockResolvedValue(null);

      const res = await asTherapist(
        request(app)
          .put(`/api/therapist/clients/${CLIENT_A}/treatment-plan`)
          .send({ modules: [{ id: 'week-1-self-awareness' }], approach: 'gottman' })
      );

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CONSENT_REQUIRED');
      expect(mockPrisma.treatmentPlan.upsert).not.toHaveBeenCalled();
    });
  });

  // ── Treatment plan persistence ────────────────────────────────────────────

  describe('treatment plan persistence', () => {
    beforeEach(() => {
      mockPrisma.therapistClient.findFirst.mockResolvedValue(grantedLink(CLIENT_A));
    });

    test('PUT upserts the plan and audit-logs the write', async () => {
      const payload = {
        modules: [{ id: 'week-1-self-awareness' }],
        approach: 'gottman',
        pace: 1,
        notes: { 'week-1-self-awareness': 'Start slow' }
      };
      mockPrisma.treatmentPlan.upsert.mockImplementation(async ({ create }) => ({
        id: 'plan-1',
        ...create,
        updatedAt: new Date()
      }));

      const res = await asTherapist(
        request(app).put(`/api/therapist/clients/${CLIENT_A}/treatment-plan`).send(payload)
      );

      expect(res.status).toBe(200);
      expect(mockPrisma.treatmentPlan.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            therapistId_clientId: { therapistId: THERAPIST_ID, clientId: CLIENT_A }
          },
          create: expect.objectContaining({
            therapistId: THERAPIST_ID,
            clientId: CLIENT_A,
            plan: expect.objectContaining({ modules: payload.modules, pace: 1 }),
            approach: 'gottman'
          }),
          update: expect.objectContaining({ approach: 'gottman' })
        })
      );
      // Round-trips the saved plan back to the caller
      expect(res.body.plan.modules).toEqual(payload.modules);
      expect(res.body.approach).toBe('gottman');
      // Write is audit-logged
      expect(mockPrisma.accessLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resourceType: 'treatment_plan',
            action: 'write',
            accessGranted: true
          })
        })
      );
    });

    test('GET returns the persisted plan', async () => {
      mockPrisma.treatmentPlan.findUnique.mockResolvedValue({
        id: 'plan-1',
        therapistId: THERAPIST_ID,
        clientId: CLIENT_A,
        plan: { modules: [{ id: 'week-2-communication' }], pace: 1.5, goals: ['reconnect'] },
        approach: 'eft',
        updatedAt: new Date()
      });

      const res = await asTherapist(
        request(app).get(`/api/therapist/clients/${CLIENT_A}/treatment-plan`)
      );

      expect(res.status).toBe(200);
      expect(res.body.plan.modules).toEqual([{ id: 'week-2-communication' }]);
      expect(res.body.approach).toBe('eft');
      expect(res.body.goals).toEqual(['reconnect']);
    });

    test('GET returns null plan when none saved yet', async () => {
      mockPrisma.treatmentPlan.findUnique.mockResolvedValue(null);

      const res = await asTherapist(
        request(app).get(`/api/therapist/clients/${CLIENT_A}/treatment-plan`)
      );

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ plan: null, goals: [] });
    });
  });

  // ── Module library wiring ─────────────────────────────────────────────────

  describe('module library', () => {
    test('GET /modules returns the real MODULE_LIBRARY', async () => {
      const res = await asTherapist(request(app).get('/api/therapist/modules'));

      expect(res.status).toBe(200);
      expect(res.body.modules.length).toBeGreaterThan(5);
      expect(res.body.modules.map(m => m.id)).toContain('week-1-self-awareness');
    });

    test('GET /modules/recommend returns approach-based recommendations', async () => {
      const res = await asTherapist(
        request(app).get('/api/therapist/modules/recommend?approach=eft')
      );

      expect(res.status).toBe(200);
      expect(res.body.modules.length).toBeGreaterThan(0);
      expect(res.body.recommendations.therapistApproach).toMatch(/Emotionally Focused/i);
    });
  });

  // ── Both-partner couple gating ────────────────────────────────────────────

  describe('couple-level access requires BOTH partners\' consent', () => {
    beforeEach(() => {
      mockPrisma.relationship.findUnique.mockResolvedValue(RELATIONSHIP);
    });

    test('dynamics → 403 PARTNER_CONSENT_REQUIRED with only one granted link', async () => {
      mockPrisma.therapistClient.findMany.mockResolvedValue([grantedLink(CLIENT_A)]);

      const res = await asTherapist(
        request(app).get(`/api/therapist/couples/${COUPLE_ID}/dynamics`)
      );

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PARTNER_CONSENT_REQUIRED');
    });

    test('comparison → 403 PARTNER_CONSENT_REQUIRED with only one granted link', async () => {
      mockPrisma.therapistClient.findMany.mockResolvedValue([grantedLink(CLIENT_B)]);

      const res = await asTherapist(
        request(app).get(`/api/therapist/couples/${COUPLE_ID}/comparison`)
      );

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PARTNER_CONSENT_REQUIRED');
      expect(mockPrisma.assessment.findMany).not.toHaveBeenCalled();
    });

    test('comparison → 403 CONSENT_REQUIRED with no granted links', async () => {
      mockPrisma.therapistClient.findMany.mockResolvedValue([]);

      const res = await asTherapist(
        request(app).get(`/api/therapist/couples/${COUPLE_ID}/comparison`)
      );

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CONSENT_REQUIRED');
    });

    test('comparison → 200 when both partners granted', async () => {
      mockPrisma.therapistClient.findMany.mockResolvedValue([
        grantedLink(CLIENT_A),
        grantedLink(CLIENT_B)
      ]);
      mockPrisma.assessment.findMany.mockResolvedValue([]);

      const res = await asTherapist(
        request(app).get(`/api/therapist/couples/${COUPLE_ID}/comparison`)
      );

      expect(res.status).toBe(200);
      expect(res.body.partners.user1.id).toBe(CLIENT_A);
    });

    test('GET /couples/:id redacts the non-consented partner', async () => {
      mockPrisma.therapistClient.findMany.mockResolvedValue([grantedLink(CLIENT_A)]);

      const res = await asTherapist(request(app).get(`/api/therapist/couples/${COUPLE_ID}`));

      expect(res.status).toBe(200);
      expect(res.body.couple.user1).toMatchObject({ id: CLIENT_A });
      expect(res.body.couple.user2).toBeNull();
      expect(res.body.partnerConsentRequired).toBe(true);
    });

    test('POST /tasks/add couple-level task → 403 with only one granted link', async () => {
      mockPrisma.relationship.findUnique.mockResolvedValue({
        ...RELATIONSHIP,
        user1TherapistConsent: false,
        user2TherapistConsent: false
      });
      mockPrisma.therapistClient.findMany.mockResolvedValue([grantedLink(CLIENT_A)]);

      const res = await asTherapist(
        request(app)
          .post('/api/therapist/tasks/add')
          .send({ relationshipId: COUPLE_ID, taskDescription: 'Weekly check-in' })
      );

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PARTNER_CONSENT_REQUIRED');
      expect(mockPrisma.therapistTask.create).not.toHaveBeenCalled();
    });

    test('POST /tasks/add individual task for the consented partner → 201', async () => {
      mockPrisma.therapistClient.findMany.mockResolvedValue([grantedLink(CLIENT_A)]);
      mockPrisma.therapistTask.create.mockResolvedValue({
        id: 'task-1',
        taskDescription: 'Journal',
        priority: 'medium',
        dueDate: null,
        createdAt: new Date()
      });

      const res = await asTherapist(
        request(app)
          .post('/api/therapist/tasks/add')
          .send({
            relationshipId: COUPLE_ID,
            taskDescription: 'Journal',
            assignToUserId: CLIENT_A
          })
      );

      expect(res.status).toBe(201);
    });

    test('POST /tasks/add individual task for the NON-consented partner → 403', async () => {
      mockPrisma.therapistClient.findMany.mockResolvedValue([grantedLink(CLIENT_A)]);

      const res = await asTherapist(
        request(app)
          .post('/api/therapist/tasks/add')
          .send({
            relationshipId: COUPLE_ID,
            taskDescription: 'Journal',
            assignToUserId: CLIENT_B
          })
      );

      expect(res.status).toBe(403);
      expect(mockPrisma.therapistTask.create).not.toHaveBeenCalled();
    });
  });

  // ── Invite ceiling honesty ────────────────────────────────────────────────

  describe('invite permission ceiling', () => {
    test('invite generation defaults the ceiling to STANDARD and embeds it in the JWT', async () => {
      const res = await asTherapist(
        request(app).post('/api/therapist/clients/invite').send({})
      );

      expect(res.status).toBe(200);
      expect(res.body.permissionLevel).toBe('STANDARD');
      const token = res.body.inviteLink.split('/').pop();
      const payload = jwt.verify(token, JWT_SECRET);
      expect(payload.permissionLevel).toBe('STANDARD');
      expect(payload.therapistId).toBe(THERAPIST_ID);
    });

    test('therapist can choose a FULL ceiling', async () => {
      const res = await asTherapist(
        request(app).post('/api/therapist/clients/invite').send({ permissionLevel: 'full' })
      );

      expect(res.status).toBe(200);
      expect(res.body.permissionLevel).toBe('FULL');
    });

    test('invite generation rejects invalid ceilings', async () => {
      const res = await asTherapist(
        request(app).post('/api/therapist/clients/invite').send({ permissionLevel: 'ALL' })
      );

      expect(res.status).toBe(400);
    });

    describe('acceptance', () => {
      const CLIENT_USER = {
        id: CLIENT_A,
        email: 'a@example.com',
        firstName: 'Alex',
        lastName: 'A',
        role: 'user',
        subscriptionStatus: 'paid',
        isPlatformAdmin: false,
        tokenVersion: 0,
        stripeCustomerId: null,
        createdAt: new Date()
      };

      function inviteToken(ceiling) {
        return jwt.sign(
          {
            therapistId: THERAPIST_ID,
            therapistName: 'Dana Therapist',
            practiceName: null,
            permissionLevel: ceiling
          },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
      }

      beforeEach(() => {
        mockPrisma.user.findUnique.mockResolvedValue(CLIENT_USER);
        mockPrisma.therapistClient.findFirst.mockResolvedValue(null);
        mockPrisma.relationship.findFirst.mockResolvedValue(null);
      });

      test('requesting a level ABOVE the ceiling → explicit error, no silent clamp', async () => {
        const clientJwt = jwt.sign({ userId: CLIENT_A }, JWT_SECRET, { expiresIn: '1h' });

        const res = await request(app)
          .post(`/api/therapist/clients/invite/${inviteToken('STANDARD')}/accept`)
          .set('Authorization', `Bearer ${clientJwt}`)
          .send({ permissionLevel: 'full' });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('PERMISSION_EXCEEDS_INVITE');
        expect(res.body.maxPermissionLevel).toBe('STANDARD');
        // Nothing is stored — the consent record must equal the client's choice
        expect(mockPrisma.therapistClient.create).not.toHaveBeenCalled();
        expect(mockPrisma.therapistClient.update).not.toHaveBeenCalled();
      });

      test('requesting a level AT/below the ceiling stores exactly that level', async () => {
        const clientJwt = jwt.sign({ userId: CLIENT_A }, JWT_SECRET, { expiresIn: '1h' });
        mockPrisma.therapistClient.create.mockResolvedValue({});

        const res = await request(app)
          .post(`/api/therapist/clients/invite/${inviteToken('FULL')}/accept`)
          .set('Authorization', `Bearer ${clientJwt}`)
          .send({ permissionLevel: 'basic' });

        expect(res.status).toBe(200);
        expect(res.body.permissionLevel).toBe('BASIC');
        expect(mockPrisma.therapistClient.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              permissionLevel: 'BASIC',
              consentStatus: 'GRANTED'
            })
          })
        );
      });
    });
  });

  // ── Alert filter hardening ────────────────────────────────────────────────

  describe('GET /alerts filters', () => {
    test('400 on invalid alert type instead of a Prisma 500', async () => {
      const res = await asTherapist(request(app).get('/api/therapist/alerts?type=bogus'));

      expect(res.status).toBe(400);
      expect(mockPrisma.therapistAlert.findMany).not.toHaveBeenCalled();
    });

    test('normalizes lowercase type and honors + clamps limit', async () => {
      mockPrisma.therapistAlert.findMany.mockResolvedValue([]);

      const res = await asTherapist(
        request(app).get('/api/therapist/alerts?type=crisis&limit=5')
      );

      expect(res.status).toBe(200);
      expect(mockPrisma.therapistAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ alertType: 'CRISIS' }),
          take: 5
        })
      );

      // Out-of-range limits clamp to 1..100
      await asTherapist(request(app).get('/api/therapist/alerts?limit=5000'));
      expect(mockPrisma.therapistAlert.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ take: 100 })
      );
    });
  });
});
