/**
 * QA remediation P0-C: Real Talk share must be honest delivery.
 * These tests FAIL if the old behavior returns: success:true with the
 * notification write swallowed, or delivery claimed without a durable row.
 */
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../utils/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn()
}));
jest.mock('../../utils/therapistAlerts', () => ({
  detectCrisisAndNotify: jest.fn().mockReturnValue({ isCrisis: false })
}));
jest.mock('../../utils/pushNotifications', () => ({
  sendToUser: jest.fn().mockResolvedValue({ sent: 1 })
}));

const { sendToUser } = require('../../utils/pushNotifications');
const { errorHandler } = require('../../middleware/errorHandler');

const JWT_SECRET = 'test-jwt-secret-key-for-testing';

function createApp(mockPrisma) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.prisma = mockPrisma;
    next();
  });
  process.env.JWT_SECRET = JWT_SECRET;
  app.use('/api/real-talk', require('../../routes/real-talk'));
  app.use(errorHandler);
  return app;
}

const token = (id = 'user-1') => jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '1h' });

describe('POST /api/real-talk/:id/share (honest delivery)', () => {
  let mockPrisma;
  let app;

  const authUser = { id: 'user-1', email: 'a@x.com', firstName: 'Alex' };
  const realTalk = {
    id: 'rt-1',
    userId: 'user-1',
    deletedAt: null,
    generatedStartup: 'I feel lonely when we skip dinner. I need us to eat together. What do you think?'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = {
      user: { findUnique: jest.fn().mockResolvedValue(authUser) },
      realTalk: { findUnique: jest.fn().mockResolvedValue(realTalk) },
      relationship: {
        findFirst: jest.fn().mockResolvedValue({ id: 'rel-1', user1Id: 'user-1', user2Id: 'user-2', status: 'active' })
      },
      notification: { create: jest.fn().mockResolvedValue({ id: 'n-1' }) }
    };
    app = createApp(mockPrisma);
  });

  test('share creates the notification for the partner only, then succeeds', async () => {
    const res = await request(app)
      .post('/api/real-talk/rt-1/share')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1);
    const arg = mockPrisma.notification.create.mock.calls[0][0];
    expect(arg.data.userId).toBe('user-2');
    expect(arg.data.type).toBe('REAL_TALK_SHARED');
    expect(arg.data.body).toBe(realTalk.generatedStartup);
    expect(arg.data.data.realTalkId).toBe('rt-1');
    // Durable write precedes push
    expect(mockPrisma.notification.create.mock.invocationCallOrder[0])
      .toBeLessThan(sendToUser.mock.invocationCallOrder[0]);
  });

  test('DB failure is NEVER reported as success', async () => {
    mockPrisma.notification.create.mockRejectedValue(new Error('db down'));
    const res = await request(app)
      .post('/api/real-talk/rt-1/share')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(res.body.success).toBeUndefined();
    expect(sendToUser).not.toHaveBeenCalled();
  });

  test('push failure keeps success (row exists) but reports pushed:false', async () => {
    sendToUser.mockRejectedValueOnce(new Error('no push infra'));
    const res = await request(app)
      .post('/api/real-talk/rt-1/share')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.pushed).toBe(false);
  });

  test("someone else's Real Talk → 403, no row", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-9', email: 'i@x.com', firstName: 'Eve' });
    const res = await request(app)
      .post('/api/real-talk/rt-1/share')
      .set('Authorization', `Bearer ${token('user-9')}`);

    expect(res.status).toBe(403);
    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
  });

  test('no partner → 400 NO_PARTNER, no row', async () => {
    mockPrisma.relationship.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/real-talk/rt-1/share')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('NO_PARTNER');
    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
  });

  test('deleted or missing Real Talk → 404', async () => {
    mockPrisma.realTalk.findUnique.mockResolvedValue({ ...realTalk, deletedAt: new Date() });
    const res = await request(app)
      .post('/api/real-talk/rt-1/share')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(404);
    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
  });
});
