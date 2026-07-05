/**
 * PUT /api/admin/users/:id — adminRevokedAt must only change on a real
 * isPlatformAdmin transition (true→false stamps, false→true clears); a no-op
 * edit must leave it untouched.
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const { errorHandler } = require('../../middleware/errorHandler');
const { createMockPrisma } = require('../helpers/mockPrisma');

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_ID = 'admin-1';
const TARGET_ID = 'target-1';

const ADMIN_USER = {
  id: ADMIN_ID,
  email: 'admin@example.com',
  firstName: 'Ada',
  lastName: 'Admin',
  role: 'admin',
  subscriptionStatus: 'paid',
  stripeCustomerId: null,
  isPlatformAdmin: true,
  tokenVersion: 0,
  createdAt: new Date(),
};

function createApp(mockPrisma) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.prisma = mockPrisma;
    next();
  });
  app.use('/api/admin', require('../../routes/admin'));
  app.use(errorHandler);
  return app;
}

function adminToken() {
  return jwt.sign({ userId: ADMIN_ID }, JWT_SECRET, { expiresIn: '1h' });
}

/**
 * @param {boolean} targetIsAdmin - the target user's CURRENT isPlatformAdmin
 */
function setup(targetIsAdmin) {
  const mockPrisma = createMockPrisma();
  mockPrisma.user.findUnique.mockImplementation(async ({ where }) => {
    if (where.id === ADMIN_ID) return ADMIN_USER;
    if (where.id === TARGET_ID) return { id: TARGET_ID, isPlatformAdmin: targetIsAdmin };
    return null;
  });
  mockPrisma.user.update.mockImplementation(async ({ data }) => ({
    id: TARGET_ID,
    email: 'target@example.com',
    firstName: 'Tim',
    lastName: 'Target',
    subscriptionStatus: data.subscriptionStatus || 'free',
    isPlatformAdmin: data.isPlatformAdmin ?? targetIsAdmin,
  }));
  mockPrisma.auditLog.create.mockResolvedValue({});
  return { mockPrisma, app: createApp(mockPrisma) };
}

describe('PUT /api/admin/users/:id — adminRevokedAt transitions', () => {
  beforeEach(() => jest.clearAllMocks());

  test('no-op (isPlatformAdmin unchanged: false→false) does NOT stamp adminRevokedAt', async () => {
    const { mockPrisma, app } = setup(false);

    const res = await request(app)
      .put(`/api/admin/users/${TARGET_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ isPlatformAdmin: false });

    expect(res.status).toBe(200);
    const data = mockPrisma.user.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty('adminRevokedAt');
  });

  test('demotion (true→false) stamps adminRevokedAt with a Date', async () => {
    const { mockPrisma, app } = setup(true);

    const res = await request(app)
      .put(`/api/admin/users/${TARGET_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ isPlatformAdmin: false });

    expect(res.status).toBe(200);
    const data = mockPrisma.user.update.mock.calls[0][0].data;
    expect(data.adminRevokedAt).toBeInstanceOf(Date);
  });

  test('promotion (false→true) clears adminRevokedAt to null', async () => {
    const { mockPrisma, app } = setup(false);

    const res = await request(app)
      .put(`/api/admin/users/${TARGET_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ isPlatformAdmin: true });

    expect(res.status).toBe(200);
    const data = mockPrisma.user.update.mock.calls[0][0].data;
    expect(data.adminRevokedAt).toBeNull();
  });

  test('editing only subscriptionStatus never touches adminRevokedAt', async () => {
    const { mockPrisma, app } = setup(true);

    const res = await request(app)
      .put(`/api/admin/users/${TARGET_ID}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ subscriptionStatus: 'paid' });

    expect(res.status).toBe(200);
    const data = mockPrisma.user.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty('adminRevokedAt');
    expect(data).not.toHaveProperty('isPlatformAdmin');
  });
});
