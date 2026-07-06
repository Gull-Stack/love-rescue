/**
 * Apple IAP routes (routes/iap.js + routes/subscriptions.js):
 *  - async handlers are wrapped in try/catch → next(error): a Prisma error
 *    mid-applyAppleReceipt returns a 500 through the error handler instead of
 *    hanging the request forever
 *  - replay rejection (409 APPLE_RECEIPT_IN_USE) surfaces its code to clients
 *  - GET /subscriptions/status reports a lapsed Apple entitlement as expired
 */

const express = require('express');
const request = require('supertest');

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

const { errorHandler } = require('../../middleware/errorHandler');
const { createMockPrisma } = require('../helpers/mockPrisma');
const { getAuthHeader } = require('../helpers/tokenHelper');

const USER_ID = 'user-1';

const AUTH_USER = {
  id: USER_ID,
  email: 'buyer@example.com',
  firstName: 'Iris',
  lastName: 'Buyer',
  role: 'user',
  subscriptionStatus: 'expired',
  subscriptionSource: 'NONE',
  appleExpiresAt: null,
  trialEndsAt: null,
  stripeCustomerId: null,
  isPlatformAdmin: false,
  tokenVersion: 0,
  createdAt: new Date()
};

function appleResponse({ expiresInMs = 30 * 24 * 60 * 60 * 1000 } = {}) {
  return {
    status: 0,
    environment: 'Production',
    latest_receipt: 'BASE64_LATEST',
    latest_receipt_info: [{
      product_id: 'com.loverescue.premium.monthly',
      original_transaction_id: 'orig-txn-1',
      expires_date_ms: String(Date.now() + expiresInMs)
    }]
  };
}

function createApp(mockPrisma) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.prisma = mockPrisma;
    next();
  });
  app.use('/api/iap', require('../../routes/iap'));
  app.use('/api/subscriptions', require('../../routes/subscriptions'));
  app.use(errorHandler);
  return app;
}

describe('IAP / subscriptions routes', () => {
  let mockPrisma;
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();
    app = createApp(mockPrisma);

    mockPrisma.user.findUnique.mockResolvedValue(AUTH_USER);
    mockPrisma.user.findFirst.mockResolvedValue(null); // receipt unclaimed
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.relationship.findFirst.mockResolvedValue(null);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => appleResponse()
    });
  });

  afterEach(() => {
    delete global.fetch;
  });

  describe.each([
    ['POST /api/iap/verify', '/api/iap/verify'],
    ['POST /api/subscriptions/verify-apple', '/api/subscriptions/verify-apple']
  ])('%s', (_name, path) => {
    test('valid receipt → 200 premium via APPLE', async () => {
      const res = await request(app)
        .post(path)
        .set(getAuthHeader(USER_ID))
        .send({ receipt: 'RECEIPT' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(expect.objectContaining({
        success: true,
        subscriptionStatus: 'premium',
        source: 'APPLE'
      }));
    });

    test('Prisma error mid-apply → 500 via next(error), request does not hang', async () => {
      mockPrisma.user.update.mockRejectedValue(new Error('DB down'));

      const res = await request(app)
        .post(path)
        .set(getAuthHeader(USER_ID))
        .send({ receipt: 'RECEIPT' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBeDefined();
    });

    test('replayed receipt → 409 APPLE_RECEIPT_IN_USE', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'other-user' });

      const res = await request(app)
        .post(path)
        .set(getAuthHeader(USER_ID))
        .send({ receipt: 'RECEIPT' });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('APPLE_RECEIPT_IN_USE');
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    test('missing receipt → 400', async () => {
      const res = await request(app)
        .post(path)
        .set(getAuthHeader(USER_ID))
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/subscriptions/status', () => {
    test('lapsed Apple entitlement reports expired / inactive', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...AUTH_USER,
        subscriptionStatus: 'premium',
        subscriptionSource: 'APPLE',
        appleExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      });

      const res = await request(app)
        .get('/api/subscriptions/status')
        .set(getAuthHeader(USER_ID));

      expect(res.status).toBe(200);
      expect(res.body).toEqual(expect.objectContaining({
        status: 'expired',
        isActive: false,
        source: 'APPLE'
      }));
    });

    test('active Apple entitlement reports premium / active', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...AUTH_USER,
        subscriptionStatus: 'premium',
        subscriptionSource: 'APPLE',
        appleExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      const res = await request(app)
        .get('/api/subscriptions/status')
        .set(getAuthHeader(USER_ID));

      expect(res.status).toBe(200);
      expect(res.body).toEqual(expect.objectContaining({
        status: 'premium',
        isActive: true,
        source: 'APPLE'
      }));
    });
  });
});
