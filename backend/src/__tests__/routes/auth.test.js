const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

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

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} = require('@simplewebauthn/server');
const { errorHandler } = require('../../middleware/errorHandler');

const JWT_SECRET = 'test-jwt-secret-key-for-testing';

function createApp(mockPrisma) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.prisma = mockPrisma;
    next();
  });
  // Set JWT_SECRET so the auth middleware and route can use it
  process.env.JWT_SECRET = JWT_SECRET;
  app.use('/api/auth', require('../../routes/auth'));
  app.use(errorHandler);
  return app;
}

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

describe('Auth Routes', () => {
  let mockPrisma;
  let app;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    subscriptionStatus: 'trial',
    passwordHash: '$2a$12$hashedpassword',
    trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    createdAt: new Date()
  };

  const mockRelationship = {
    id: 'rel-1',
    user1Id: 'user-1',
    user2Id: null,
    inviteCode: 'TESTCODE',
    inviteEmail: null
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      relationship: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      token: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn()
      }
    };

    app = createApp(mockPrisma);
  });

  // ───────────────────────────────────────────────────────────────
  // POST /api/auth/signup
  // ───────────────────────────────────────────────────────────────

  describe('POST /api/auth/signup', () => {
    it('should create a new user and return 201 with user and token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        subscriptionStatus: 'trial'
      });
      mockPrisma.relationship.create.mockResolvedValue({ id: 'rel-1' });

      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe'
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Account created successfully');
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.token).toBeDefined();
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockPrisma.relationship.create).toHaveBeenCalled();
    });

    it('should return 400 when email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Email and password are required');
    });

    it('should return 400 when password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Email and password are required');
    });

    it('should return 400 when password is too short', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'test@example.com', password: 'short' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Password must be at least 8 characters');
    });

    it('should return 409 when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Email already registered');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // POST /api/auth/login
  // ───────────────────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('should return 200 with user and token on successful login', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.token).toBeDefined();
    });

    it('should return 401 when email does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should return 401 when password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should return 400 when fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Email and password are required');
    });

    it('should update subscription status when trial is expired', async () => {
      const expiredUser = {
        ...mockUser,
        subscriptionStatus: 'trial',
        trialEndsAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // expired yesterday
      };
      mockPrisma.user.findUnique.mockResolvedValue(expiredUser);
      mockPrisma.user.update.mockResolvedValue({ ...expiredUser, subscriptionStatus: 'expired' });
      bcrypt.compare.mockResolvedValue(true);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.user.subscriptionStatus).toBe('expired');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: expiredUser.id },
          data: { subscriptionStatus: 'expired' }
        })
      );
    });
  });

  // ───────────────────────────────────────────────────────────────
  // GET /api/auth/me
  // ───────────────────────────────────────────────────────────────

  describe('GET /api/auth/me', () => {
    it('should return 200 with user and relationship', async () => {
      const token = generateToken('user-1');

      // First call is from authenticate middleware, second from route
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          id: 'user-1',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          subscriptionStatus: 'trial',
          stripeCustomerId: null,
          createdAt: new Date()
        })
        .mockResolvedValueOnce({
          id: 'user-1',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          subscriptionStatus: 'trial',
          trialEndsAt: new Date(),
          createdAt: new Date()
        });

      const relationshipWithUsers = {
        ...mockRelationship,
        user2Id: 'user-2',
        user1: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
        user2: { id: 'user-2', firstName: 'Jane', lastName: 'Doe' }
      };
      mockPrisma.relationship.findFirst.mockResolvedValue(relationshipWithUsers);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
      expect(res.body.relationship).toBeDefined();
      expect(res.body.relationship.hasPartner).toBe(true);
    });

    it('should return 401 without a token', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('No token provided');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // POST /api/auth/invite-partner
  // ───────────────────────────────────────────────────────────────

  describe('POST /api/auth/invite-partner', () => {
    it('should return invite code and link on success', async () => {
      const token = generateToken('user-1');

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        subscriptionStatus: 'trial',
        stripeCustomerId: null,
        createdAt: new Date()
      });
      mockPrisma.relationship.findFirst.mockResolvedValue(mockRelationship);
      mockPrisma.relationship.update.mockResolvedValue({
        ...mockRelationship,
        inviteEmail: 'partner@example.com'
      });

      const res = await request(app)
        .post('/api/auth/invite-partner')
        .set('Authorization', `Bearer ${token}`)
        .send({ partnerEmail: 'partner@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.inviteCode).toBeDefined();
      expect(res.body.inviteLink).toBeDefined();
      expect(res.body.message).toBe('Invite created');
    });

    it('should return 400 when partner already joined', async () => {
      const token = generateToken('user-1');

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        subscriptionStatus: 'trial',
        stripeCustomerId: null,
        createdAt: new Date()
      });

      const relationshipWithPartner = {
        ...mockRelationship,
        user2Id: 'user-2'
      };
      mockPrisma.relationship.findFirst.mockResolvedValue(relationshipWithPartner);

      const res = await request(app)
        .post('/api/auth/invite-partner')
        .set('Authorization', `Bearer ${token}`)
        .send({ partnerEmail: 'partner@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Partner already joined');
    });

    it('should return 404 when no relationship found', async () => {
      const token = generateToken('user-1');

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        subscriptionStatus: 'trial',
        stripeCustomerId: null,
        createdAt: new Date()
      });
      mockPrisma.relationship.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/invite-partner')
        .set('Authorization', `Bearer ${token}`)
        .send({ partnerEmail: 'partner@example.com' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Relationship not found');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // POST /api/auth/join/:code
  // ───────────────────────────────────────────────────────────────

  describe('POST /api/auth/join/:code', () => {
    it('should successfully join a relationship', async () => {
      const token = generateToken('user-2');

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        email: 'partner@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        subscriptionStatus: 'trial',
        stripeCustomerId: null,
        createdAt: new Date()
      });
      mockPrisma.relationship.findUnique.mockResolvedValue(mockRelationship);
      mockPrisma.relationship.update.mockResolvedValue({
        ...mockRelationship,
        user2Id: 'user-2',
        inviteCode: null
      });

      const res = await request(app)
        .post('/api/auth/join/TESTCODE')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Successfully joined relationship');
      expect(mockPrisma.relationship.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user2Id: 'user-2',
            inviteCode: null
          })
        })
      );
    });

    it('should return 404 for an invalid invite code', async () => {
      const token = generateToken('user-2');

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        email: 'partner@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        subscriptionStatus: 'trial',
        stripeCustomerId: null,
        createdAt: new Date()
      });
      mockPrisma.relationship.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/join/INVALIDCODE')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Invalid invite code');
    });

    it('should return 400 when invite is already used', async () => {
      const token = generateToken('user-3');

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-3',
        email: 'another@example.com',
        firstName: 'Alice',
        lastName: 'Smith',
        subscriptionStatus: 'trial',
        stripeCustomerId: null,
        createdAt: new Date()
      });
      mockPrisma.relationship.findUnique.mockResolvedValue({
        ...mockRelationship,
        user2Id: 'user-2' // already used
      });

      const res = await request(app)
        .post('/api/auth/join/TESTCODE')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invite already used');
    });

    it('should return 400 when trying to join own relationship', async () => {
      const token = generateToken('user-1');

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        subscriptionStatus: 'trial',
        stripeCustomerId: null,
        createdAt: new Date()
      });
      mockPrisma.relationship.findUnique.mockResolvedValue(mockRelationship);

      const res = await request(app)
        .post('/api/auth/join/TESTCODE')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Cannot join your own relationship');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // WebAuthn endpoints
  // ───────────────────────────────────────────────────────────────

  describe('POST /api/auth/webauthn/register/options', () => {
    it('should return registration options for authenticated user', async () => {
      const token = generateToken('user-1');

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        subscriptionStatus: 'trial',
        stripeCustomerId: null,
        createdAt: new Date()
      });

      const mockOptions = {
        challenge: 'test-challenge-string',
        rp: { name: 'Marriage Rescue App', id: 'localhost' },
        user: { id: 'user-1', name: 'test@example.com', displayName: 'John Doe' }
      };
      generateRegistrationOptions.mockResolvedValue(mockOptions);
      mockPrisma.token.create.mockResolvedValue({ id: 'token-1' });

      const res = await request(app)
        .post('/api/auth/webauthn/register/options')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.challenge).toBe('test-challenge-string');
      expect(generateRegistrationOptions).toHaveBeenCalled();
      expect(mockPrisma.token.create).toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/webauthn/register/verify', () => {
    it('should verify registration and store credential', async () => {
      const token = generateToken('user-1');

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        subscriptionStatus: 'trial',
        stripeCustomerId: null,
        createdAt: new Date()
      });

      mockPrisma.token.findFirst.mockResolvedValue({
        id: 'token-1',
        email: 'test@example.com',
        token: 'test-challenge',
        type: 'webauthn_challenge'
      });

      verifyRegistrationResponse.mockResolvedValue({
        verified: true,
        registrationInfo: {
          credentialPublicKey: Buffer.from('public-key-data'),
          credentialID: Buffer.from('credential-id-data')
        }
      });

      mockPrisma.user.update.mockResolvedValue({ id: 'user-1' });
      mockPrisma.token.update.mockResolvedValue({ id: 'token-1' });

      const res = await request(app)
        .post('/api/auth/webauthn/register/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ credential: { id: 'cred-1', response: {} } });

      expect(res.status).toBe(200);
      expect(res.body.verified).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('should return 400 when challenge is not found or expired', async () => {
      const token = generateToken('user-1');

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        subscriptionStatus: 'trial',
        stripeCustomerId: null,
        createdAt: new Date()
      });
      mockPrisma.token.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/webauthn/register/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ credential: { id: 'cred-1', response: {} } });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Challenge expired or not found');
    });
  });

  describe('POST /api/auth/webauthn/login/options', () => {
    it('should return authentication options', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        biometricKeyId: Buffer.from('key-id').toString('base64')
      });

      const mockOptions = {
        challenge: 'auth-challenge',
        allowCredentials: [{ id: 'key-id', type: 'public-key' }]
      };
      generateAuthenticationOptions.mockResolvedValue(mockOptions);
      mockPrisma.token.create.mockResolvedValue({ id: 'token-1' });

      const res = await request(app)
        .post('/api/auth/webauthn/login/options')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.challenge).toBe('auth-challenge');
      expect(generateAuthenticationOptions).toHaveBeenCalled();
    });

    it('should return 400 when biometric not set up', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        biometricKeyId: null
      });

      const res = await request(app)
        .post('/api/auth/webauthn/login/options')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Biometric login not set up for this account');
    });
  });

  describe('POST /api/auth/webauthn/login/verify', () => {
    it('should verify authentication and return token', async () => {
      const biometricUser = {
        ...mockUser,
        biometricKey: Buffer.from('public-key').toString('base64'),
        biometricKeyId: Buffer.from('key-id').toString('base64')
      };
      mockPrisma.user.findUnique.mockResolvedValue(biometricUser);

      mockPrisma.token.findFirst.mockResolvedValue({
        id: 'token-1',
        email: 'test@example.com',
        token: 'auth-challenge',
        type: 'webauthn_auth_challenge'
      });

      verifyAuthenticationResponse.mockResolvedValue({ verified: true });
      mockPrisma.token.update.mockResolvedValue({ id: 'token-1' });

      const res = await request(app)
        .post('/api/auth/webauthn/login/verify')
        .send({
          email: 'test@example.com',
          credential: { id: 'cred-1', response: {} }
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
    });

    it('should return 400 when biometric key not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        biometricKey: null,
        biometricKeyId: null
      });

      const res = await request(app)
        .post('/api/auth/webauthn/login/verify')
        .send({
          email: 'test@example.com',
          credential: { id: 'cred-1', response: {} }
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should return 401 when verification fails', async () => {
      const biometricUser = {
        ...mockUser,
        biometricKey: Buffer.from('public-key').toString('base64'),
        biometricKeyId: Buffer.from('key-id').toString('base64')
      };
      mockPrisma.user.findUnique.mockResolvedValue(biometricUser);

      mockPrisma.token.findFirst.mockResolvedValue({
        id: 'token-1',
        email: 'test@example.com',
        token: 'auth-challenge',
        type: 'webauthn_auth_challenge'
      });

      verifyAuthenticationResponse.mockResolvedValue({ verified: false });

      const res = await request(app)
        .post('/api/auth/webauthn/login/verify')
        .send({
          email: 'test@example.com',
          credential: { id: 'cred-1', response: {} }
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication failed');
    });
  });
});
