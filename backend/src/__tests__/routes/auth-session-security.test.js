/**
 * Session security tests:
 *  - tokenVersion revocation after password change
 *  - POST /api/auth/logout (refresh token revocation + global access-token kill)
 *  - password reset codes scoped to the submitted email with attempt lockout
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$12$hashedpassword'),
  compare: jest.fn()
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid-1234-5678')
}));

jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: jest.fn(),
  verifyRegistrationResponse: jest.fn(),
  generateAuthenticationOptions: jest.fn(),
  verifyAuthenticationResponse: jest.fn()
}));

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn()
  }))
}));

jest.mock('../../utils/email', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  sendPartnerInviteEmail: jest.fn().mockResolvedValue(true)
}));

const bcrypt = require('bcryptjs');
const { createMockPrisma } = require('../helpers/mockPrisma');
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
  app.use('/api/auth', require('../../routes/auth'));
  app.use(errorHandler);
  return app;
}

function generateToken(userId, tokenVersion) {
  const payload = tokenVersion === undefined ? { userId } : { userId, tokenVersion };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

const authUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'user',
  subscriptionStatus: 'premium',
  stripeCustomerId: null,
  isPlatformAdmin: false,
  tokenVersion: 0,
  createdAt: new Date(),
  ...overrides
});

describe('Session security', () => {
  let mockPrisma;
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();
    app = createApp(mockPrisma);
  });

  // ───────────────────────────────────────────────────────────────
  // Token issuance embeds tokenVersion
  // ───────────────────────────────────────────────────────────────

  describe('login embeds tokenVersion in the access token', () => {
    it('issues an access token carrying the user current tokenVersion', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(
        authUser({ passwordHash: '$2a$12$hashedpassword', tokenVersion: 4 })
      );
      bcrypt.compare.mockResolvedValue(true);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      const decoded = jwt.verify(res.body.token, JWT_SECRET);
      expect(decoded.tokenVersion).toBe(4);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // Password change revokes existing sessions
  // ───────────────────────────────────────────────────────────────

  describe('POST /api/auth/change-password revokes sessions', () => {
    it('increments tokenVersion and revokes outstanding refresh tokens', async () => {
      const token = generateToken('user-1', 0);

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(authUser()) // authenticate middleware
        .mockResolvedValueOnce({           // route lookup
          id: 'user-1',
          email: 'test@example.com',
          passwordHash: '$2a$12$hashedpassword'
        });
      bcrypt.compare.mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1' });
      mockPrisma.token.updateMany.mockResolvedValue({ count: 2 });

      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: 'oldpassword', newPassword: 'newpassword123' });

      expect(res.status).toBe(200);
      // tokenVersion bumped → all outstanding access tokens die
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { tokenVersion: { increment: 1 } }
      });
      // All refresh tokens revoked → no new access tokens can be minted
      expect(mockPrisma.token.updateMany).toHaveBeenCalledWith({
        where: {
          email: 'user:user-1',
          type: 'refresh_token',
          usedAt: null
        },
        data: { usedAt: expect.any(Date) }
      });
    });

    it('rejects the old access token after the password change (end-to-end)', async () => {
      const oldToken = generateToken('user-1', 0);

      // After the change the DB says tokenVersion 1; the old token carries 0
      mockPrisma.user.findUnique.mockResolvedValue(authUser({ tokenVersion: 1 }));

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${oldToken}`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('TOKEN_REVOKED');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // POST /api/auth/logout
  // ───────────────────────────────────────────────────────────────

  describe('POST /api/auth/logout', () => {
    it('requires authentication', async () => {
      const res = await request(app).post('/api/auth/logout').send({});
      expect(res.status).toBe(401);
    });

    it('revokes the presented refresh token and bumps tokenVersion', async () => {
      const token = generateToken('user-1', 0);
      const refreshToken = 'raw-refresh-token-value';
      const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      mockPrisma.user.findUnique.mockResolvedValue(authUser());
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1' });
      mockPrisma.token.updateMany.mockResolvedValue({ count: 1 });

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');
      // Presented refresh token marked used (looked up by its sha256 hash)
      expect(mockPrisma.token.updateMany).toHaveBeenCalledWith({
        where: {
          token: refreshTokenHash,
          type: 'refresh_token',
          usedAt: null
        },
        data: { usedAt: expect.any(Date) }
      });
      // Global revocation: tokenVersion bump + all remaining refresh tokens
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { tokenVersion: { increment: 1 } }
      });
      expect(mockPrisma.token.updateMany).toHaveBeenCalledWith({
        where: {
          email: 'user:user-1',
          type: 'refresh_token',
          usedAt: null
        },
        data: { usedAt: expect.any(Date) }
      });
    });

    it('still revokes all sessions when no refresh token is presented', async () => {
      const token = generateToken('user-1', 0);

      mockPrisma.user.findUnique.mockResolvedValue(authUser());
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1' });
      mockPrisma.token.updateMany.mockResolvedValue({ count: 0 });

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(200);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { tokenVersion: { increment: 1 } }
      });
    });
  });

  // ───────────────────────────────────────────────────────────────
  // Password reset codes: email scoping + attempt lockout
  // ───────────────────────────────────────────────────────────────

  describe('POST /api/auth/reset-password (scoped codes)', () => {
    const resetTokenRecord = (overrides = {}) => ({
      id: 'token-1',
      email: 'test@example.com',
      token: '123456',
      type: 'password_reset',
      attempts: 0,
      usedAt: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      ...overrides
    });

    it('returns 400 when email is missing (codes are email-scoped)', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: '123456', newPassword: 'newpassword123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Email, reset token, and new password are required');
      expect(mockPrisma.token.findFirst).not.toHaveBeenCalled();
    });

    it('looks the code up scoped to the submitted email, never globally by value', async () => {
      mockPrisma.token.findFirst.mockResolvedValue(resetTokenRecord());
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1' });
      mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.token.update.mockResolvedValue({ id: 'token-1' });
      mockPrisma.token.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.token.deleteMany.mockResolvedValue({ count: 0 });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ email: 'Test@Example.com', token: '123456', newPassword: 'newpassword123' });

      expect(res.status).toBe(200);
      const where = mockPrisma.token.findFirst.mock.calls[0][0].where;
      expect(where.email).toBe('test@example.com'); // scoped + normalized
      expect(where.token).toBeUndefined();           // NOT looked up by value
      expect(where.type).toBe('password_reset');
    });

    it("rejects a valid code submitted with a different account's email", async () => {
      // The other account has no active reset code → nothing found for that email
      mockPrisma.token.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ email: 'victim@example.com', token: '123456', newPassword: 'newpassword123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid or expired reset token');
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('counts failed attempts on a wrong code', async () => {
      mockPrisma.token.findFirst.mockResolvedValue(resetTokenRecord({ attempts: 1 }));
      mockPrisma.token.update.mockResolvedValue({ id: 'token-1' });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ email: 'test@example.com', token: '000000', newPassword: 'newpassword123' });

      expect(res.status).toBe(400);
      expect(mockPrisma.token.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: { attempts: 2 }
      });
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('invalidates the code after the 5th failed attempt', async () => {
      mockPrisma.token.findFirst.mockResolvedValue(resetTokenRecord({ attempts: 4 }));
      mockPrisma.token.update.mockResolvedValue({ id: 'token-1' });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ email: 'test@example.com', token: '000000', newPassword: 'newpassword123' });

      expect(res.status).toBe(400);
      expect(mockPrisma.token.update).toHaveBeenCalledWith({
        where: { id: 'token-1' },
        data: { attempts: 5, usedAt: expect.any(Date) }
      });
    });

    it('rejects a correct code once the attempt limit has been reached', async () => {
      mockPrisma.token.findFirst.mockResolvedValue(resetTokenRecord({ attempts: 5 }));

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ email: 'test@example.com', token: '123456', newPassword: 'newpassword123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid or expired reset token');
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('revokes all sessions after a successful reset', async () => {
      mockPrisma.token.findFirst.mockResolvedValue(resetTokenRecord());
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1' });
      mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.token.update.mockResolvedValue({ id: 'token-1' });
      mockPrisma.token.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.token.deleteMany.mockResolvedValue({ count: 0 });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ email: 'test@example.com', token: '123456', newPassword: 'newpassword123' });

      expect(res.status).toBe(200);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { tokenVersion: { increment: 1 } }
      });
    });
  });

  // ───────────────────────────────────────────────────────────────
  // forgot-password invalidates previous codes
  // ───────────────────────────────────────────────────────────────

  describe('POST /api/auth/forgot-password', () => {
    it('deletes previous unused codes before issuing a new one', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: '$2a$12$hashedpassword'
      });
      mockPrisma.token.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.token.create.mockResolvedValue({ id: 'token-2' });

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(200);
      expect(mockPrisma.token.deleteMany).toHaveBeenCalledWith({
        where: {
          email: 'test@example.com',
          type: 'password_reset',
          usedAt: null
        }
      });
      expect(mockPrisma.token.create).toHaveBeenCalled();
    });
  });
});
