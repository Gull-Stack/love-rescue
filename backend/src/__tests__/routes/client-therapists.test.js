/**
 * Client-facing therapist consent control endpoints (Settings → My Therapist).
 *
 * Covers the end-to-end revocation flow: list links → change permission →
 * revoke → therapist loses access (403), plus the sharing-history feed.
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

const CLIENT_ID = 'client-user-1';
const THERAPIST_ID = 'therapist-1';
const LINK_ID = 'link-1';

const CLIENT_USER = {
  id: CLIENT_ID,
  email: 'client@example.com',
  firstName: 'Casey',
  lastName: 'Client',
  role: 'user',
  subscriptionStatus: 'paid',
  isPlatformAdmin: false,
  tokenVersion: 0,
  stripeCustomerId: null,
  createdAt: new Date()
};

const THERAPIST_PROFILE = {
  id: THERAPIST_ID,
  email: 'dr@example.com',
  firstName: 'Dana',
  lastName: 'Therapist',
  practiceName: 'Dana Family Therapy',
  isActive: true
};

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

function createApp(mockPrisma) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.prisma = mockPrisma;
    next();
  });
  app.use('/api/client', require('../../routes/client'));
  app.use('/api/therapist', require('../../routes/therapist'));
  app.use(errorHandler);
  return app;
}

/** Minimal in-memory matcher for the TherapistClient where clauses we use. */
function matchesWhere(link, where = {}) {
  for (const [key, cond] of Object.entries(where)) {
    if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
      if ('in' in cond && !cond.in.includes(link[key])) return false;
    } else if (link[key] !== cond) {
      return false;
    }
  }
  return true;
}

describe('Client therapist-consent controls', () => {
  let mockPrisma;
  let app;
  let clientToken;
  let links; // stateful in-memory TherapistClient store

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();
    app = createApp(mockPrisma);
    clientToken = generateToken(CLIENT_ID);

    links = [
      {
        id: LINK_ID,
        therapistId: THERAPIST_ID,
        clientId: CLIENT_ID,
        coupleId: 'rel-1',
        inviteCode: null,
        consentStatus: 'GRANTED',
        consentGrantedAt: new Date('2026-06-01'),
        consentRevokedAt: null,
        consentDeclinedAt: null,
        permissionLevel: 'STANDARD',
        createdAt: new Date('2026-05-30'),
        updatedAt: new Date('2026-06-01')
      }
    ];

    // Stateful TherapistClient mock backed by `links`. Relations that routes
    // `include` are attached unconditionally (harmless when unused).
    const withRelations = (l) => ({
      ...l,
      therapist: THERAPIST_PROFILE,
      client: CLIENT_USER,
      couple: null
    });
    mockPrisma.therapistClient.findMany.mockImplementation(async ({ where } = {}) =>
      links.filter(l => matchesWhere(l, where)).map(withRelations)
    );
    mockPrisma.therapistClient.findFirst.mockImplementation(async ({ where } = {}) => {
      const found = links.find(l => matchesWhere(l, where));
      return found ? withRelations(found) : null;
    });
    mockPrisma.therapistClient.update.mockImplementation(async ({ where, data }) => {
      const link = links.find(l => l.id === where.id);
      Object.assign(link, data);
      return { ...link };
    });

    // Auth mocks
    mockPrisma.user.findUnique.mockResolvedValue(CLIENT_USER);
    const hashedApiKey = await bcrypt.hash(THERAPIST_API_KEY, 10);
    mockPrisma.therapist.findMany.mockResolvedValue([
      { ...THERAPIST_PROFILE, apiKeyHash: hashedApiKey }
    ]);

    mockPrisma.consentLog.create.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});
    mockPrisma.accessLog.create.mockResolvedValue({});
  });

  describe('GET /api/client/therapists', () => {
    test('lists the client\'s links with therapist name, practice and consent info', async () => {
      const res = await request(app)
        .get('/api/client/therapists')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.therapists).toHaveLength(1);
      expect(res.body.therapists[0]).toMatchObject({
        id: LINK_ID,
        therapistId: THERAPIST_ID,
        therapistName: 'Dana Therapist',
        practiceName: 'Dana Family Therapy',
        permissionLevel: 'STANDARD',
        consentStatus: 'GRANTED'
      });
      // Only PENDING/GRANTED links are queried — never revoked ghosts
      expect(mockPrisma.therapistClient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clientId: CLIENT_ID,
            consentStatus: { in: ['PENDING', 'GRANTED'] }
          })
        })
      );
    });

    test('requires authentication', async () => {
      const res = await request(app).get('/api/client/therapists');
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/client/therapists/:id/permission', () => {
    test('updates permission level (accepts lowercase) and writes a consent log', async () => {
      const res = await request(app)
        .patch(`/api/client/therapists/${LINK_ID}/permission`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ permissionLevel: 'full' });

      expect(res.status).toBe(200);
      expect(res.body.therapist.permissionLevel).toBe('FULL');
      expect(links[0].permissionLevel).toBe('FULL');
      expect(mockPrisma.consentLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: CLIENT_ID,
            relationshipId: 'rel-1',
            consentType: 'therapist_permission',
            granted: true
          })
        })
      );
    });

    test('rejects invalid permission levels', async () => {
      const res = await request(app)
        .patch(`/api/client/therapists/${LINK_ID}/permission`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ permissionLevel: 'superuser' });

      expect(res.status).toBe(400);
      expect(mockPrisma.therapistClient.update).not.toHaveBeenCalled();
    });

    test('404s for a link belonging to a different client', async () => {
      links[0].clientId = 'someone-else';

      const res = await request(app)
        .patch(`/api/client/therapists/${LINK_ID}/permission`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ permissionLevel: 'basic' });

      expect(res.status).toBe(404);
      expect(mockPrisma.therapistClient.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/client/therapists/:id (revoke)', () => {
    test('soft-revokes: sets REVOKED + consentRevokedAt, never deletes', async () => {
      const res = await request(app)
        .delete(`/api/client/therapists/${LINK_ID}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(links[0].consentStatus).toBe('REVOKED');
      expect(links[0].consentRevokedAt).toBeInstanceOf(Date);
      expect(mockPrisma.therapistClient.delete).not.toHaveBeenCalled();
      expect(mockPrisma.therapistClient.deleteMany).not.toHaveBeenCalled();
      expect(mockPrisma.consentLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            consentType: 'therapist_access',
            granted: false
          })
        })
      );
    });

    test('end-to-end: list → revoke → therapist detail read returns 403', async () => {
      // 1. Client sees the connected therapist
      const listRes = await request(app)
        .get('/api/client/therapists')
        .set('Authorization', `Bearer ${clientToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.therapists).toHaveLength(1);

      // 2. Therapist can read the client detail while consent is GRANTED
      const beforeRes = await request(app)
        .get(`/api/therapist/clients/${CLIENT_ID}`)
        .set('x-therapist-api-key', THERAPIST_API_KEY);
      expect(beforeRes.status).toBe(200);

      // 3. Client revokes
      const revokeRes = await request(app)
        .delete(`/api/client/therapists/${LINK_ID}`)
        .set('Authorization', `Bearer ${clientToken}`);
      expect(revokeRes.status).toBe(200);

      // 4. Therapist now gets 403 CONSENT_REQUIRED — revoked = no access
      const afterRes = await request(app)
        .get(`/api/therapist/clients/${CLIENT_ID}`)
        .set('x-therapist-api-key', THERAPIST_API_KEY);
      expect(afterRes.status).toBe(403);
      expect(afterRes.body.code).toBe('CONSENT_REQUIRED');

      // The denial is written to the HIPAA access log
      expect(mockPrisma.accessLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accessorId: THERAPIST_ID,
            resourceOwnerId: CLIENT_ID,
            accessGranted: false
          })
        })
      );

      // 5. Revoked link no longer appears in the client's list
      const listAfter = await request(app)
        .get('/api/client/therapists')
        .set('Authorization', `Bearer ${clientToken}`);
      expect(listAfter.body.therapists).toHaveLength(0);
    });

    test('is idempotent for an already revoked link', async () => {
      links[0].consentStatus = 'REVOKED';

      const res = await request(app)
        .delete(`/api/client/therapists/${LINK_ID}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(mockPrisma.therapistClient.update).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/client/therapist-sharing-history', () => {
    test('returns real access-log rows with therapist name and data type', async () => {
      const logRow = {
        id: 'log-1',
        accessorId: THERAPIST_ID,
        accessorRole: 'therapist',
        resourceType: 'assessment_scores',
        resourceOwnerId: CLIENT_ID,
        action: 'read',
        accessGranted: true,
        createdAt: new Date('2026-07-01T10:00:00Z')
      };
      mockPrisma.accessLog.findMany.mockResolvedValue([logRow]);
      mockPrisma.accessLog.count.mockResolvedValue(1);
      mockPrisma.therapist.findMany.mockResolvedValue([
        { id: THERAPIST_ID, firstName: 'Dana', lastName: 'Therapist' }
      ]);

      const res = await request(app)
        .get('/api/client/therapist-sharing-history?page=1&limit=10')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.entries[0]).toMatchObject({
        id: 'log-1',
        therapistName: 'Dana Therapist',
        dataType: 'assessment_scores'
      });
      // Only this client's own rows are ever queried
      expect(mockPrisma.accessLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ resourceOwnerId: CLIENT_ID })
        })
      );
    });
  });
});
