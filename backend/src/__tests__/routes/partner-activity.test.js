/**
 * QA remediation P0-B: the nudge must be honest.
 * These tests FAIL if the old behavior returns:
 *  - success:true without a durable Notification row (swallowed DB failure)
 *  - rate limit failing open when the lookup throws
 *  - push attempted before (or instead of) the durable write
 */
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

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
  app.use('/api/partner', require('../../routes/partner-activity'));
  app.use(errorHandler);
  return app;
}

const token = () => jwt.sign({ userId: 'user-1' }, JWT_SECRET, { expiresIn: '1h' });

describe('POST /api/partner/nudge-partner (honest delivery)', () => {
  let mockPrisma;
  let app;

  const authUser = { id: 'user-1', email: 'a@x.com', firstName: 'Alex', subscriptionStatus: 'trial' };
  const partner = { id: 'user-2', firstName: 'Jamie' };
  const relationship = { id: 'rel-1', user1Id: 'user-1', user2Id: 'user-2', status: 'active' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = {
      user: {
        findUnique: jest.fn().mockImplementation(({ where }) =>
          Promise.resolve(where.id === 'user-1' ? authUser : partner))
      },
      relationship: { findFirst: jest.fn().mockResolvedValue(relationship) },
      notification: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'n-1' })
      }
    };
    app = createApp(mockPrisma);
  });

  test('success creates exactly one durable notification row for the partner', async () => {
    const res = await request(app)
      .post('/api/partner/nudge-partner')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1);
    const arg = mockPrisma.notification.create.mock.calls[0][0];
    expect(arg.data.userId).toBe('user-2');
    expect(arg.data.type).toBe('PARTNER_NUDGE');
    // Honest copy: no delivery overclaim beyond the saved in-app record
    expect(res.body.message).toMatch(/saved/i);
  });

  test('push is attempted only AFTER the durable write', async () => {
    await request(app)
      .post('/api/partner/nudge-partner')
      .set('Authorization', `Bearer ${token()}`);

    expect(sendToUser).toHaveBeenCalledTimes(1);
    expect(sendToUser.mock.calls[0][0]).toBe('user-2');
    const createOrder = mockPrisma.notification.create.mock.invocationCallOrder[0];
    const pushOrder = sendToUser.mock.invocationCallOrder[0];
    expect(createOrder).toBeLessThan(pushOrder);
  });

  test('push failure does not flip the response — the in-app row is the record', async () => {
    sendToUser.mockRejectedValueOnce(new Error('push infra down'));
    const res = await request(app)
      .post('/api/partner/nudge-partner')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.pushed).toBe(false);
  });

  test('second nudge on the same day is refused with 429 and creates no row', async () => {
    mockPrisma.notification.findFirst.mockResolvedValue({ id: 'n-existing' });
    const res = await request(app)
      .post('/api/partner/nudge-partner')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(429);
    expect(res.body.code).toBe('NUDGE_LIMIT');
    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
  });

  test('DB write failure is NEVER reported as success', async () => {
    mockPrisma.notification.create.mockRejectedValue(new Error('db down'));
    const res = await request(app)
      .post('/api/partner/nudge-partner')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(res.body.success).toBeUndefined();
    expect(sendToUser).not.toHaveBeenCalled();
  });

  test('rate-limit lookup failure fails CLOSED (error, not unlimited sends)', async () => {
    mockPrisma.notification.findFirst.mockRejectedValue(new Error('db down'));
    const res = await request(app)
      .post('/api/partner/nudge-partner')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(res.body.success).toBeUndefined();
    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
  });

  test('no partner linked → 400, no row, no push', async () => {
    mockPrisma.relationship.findFirst.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/partner/nudge-partner')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(400);
    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    expect(sendToUser).not.toHaveBeenCalled();
  });
});

describe('GET /api/partner/partner-status (domain date, real streak)', () => {
  test('logged-today checks query the domain date column, not createdAt', async () => {
    const authUser = { id: 'user-1', email: 'a@x.com', firstName: 'Alex' };
    const partner = { id: 'user-2', firstName: 'Jamie' };
    const mockPrisma = {
      user: {
        findUnique: jest.fn().mockImplementation(({ where }) =>
          Promise.resolve(where.id === 'user-1' ? authUser : partner))
      },
      relationship: {
        findFirst: jest.fn().mockResolvedValue({ id: 'rel-1', user1Id: 'user-1', user2Id: 'user-2', status: 'active' })
      },
      dailyLog: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([])
      }
    };
    const app = createApp(mockPrisma);

    const res = await request(app)
      .get('/api/partner/partner-status')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(200);
    for (const call of mockPrisma.dailyLog.findFirst.mock.calls) {
      expect(call[0].where.createdAt).toBeUndefined();
      expect(call[0].where.date).toBeInstanceOf(Date);
      expect(call[0].where.date.getHours()).toBe(0);
    }
  });
});
