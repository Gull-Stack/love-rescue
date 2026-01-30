const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

const { errorHandler } = require('../../middleware/errorHandler');

const JWT_SECRET = process.env.JWT_SECRET; // 'test-jwt-secret-key-for-testing' from setup.js

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

function createMockPrisma() {
  return {
    user: {
      findUnique: jest.fn()
    },
    mediator: {
      findMany: jest.fn()
    }
  };
}

function createApp(mockPrisma) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.prisma = mockPrisma;
    next();
  });
  app.use('/api/mediators', require('../../routes/mediators'));
  app.use(errorHandler);
  return app;
}

const TEST_USER_ID = 'user-test-123';

const TEST_USER_PREMIUM = {
  id: TEST_USER_ID,
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  subscriptionStatus: 'premium',
  stripeCustomerId: null,
  createdAt: new Date()
};

describe('Mediators Routes', () => {
  let mockPrisma;
  let app;
  let token;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();
    app = createApp(mockPrisma);
    token = generateToken(TEST_USER_ID);

    // Default: authenticate middleware finds the premium user
    mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_PREMIUM);
  });

  // -------------------------------------------------------------------------
  // GET /api/mediators/available
  // -------------------------------------------------------------------------
  describe('GET /available', () => {
    test('returns list of active mediators with premium subscription', async () => {
      const mediators = [
        {
          id: 'mediator-1',
          name: 'Dr. Alice Smith',
          bio: 'Licensed family mediator with 10 years experience',
          availabilityRules: {
            monday: [{ start: '09:00', end: '17:00' }],
            tuesday: [{ start: '09:00', end: '17:00' }]
          },
          rate: 50
        },
        {
          id: 'mediator-2',
          name: 'Dr. Bob Johnson',
          bio: 'Certified conflict resolution specialist',
          availabilityRules: {
            wednesday: [{ start: '10:00', end: '16:00' }],
            friday: [{ start: '09:00', end: '12:00' }]
          },
          rate: 65
        }
      ];
      mockPrisma.mediator.findMany.mockResolvedValue(mediators);

      const res = await request(app)
        .get('/api/mediators/available')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.mediators).toHaveLength(2);
      expect(res.body.mediators[0]).toHaveProperty('id', 'mediator-1');
      expect(res.body.mediators[0]).toHaveProperty('name', 'Dr. Alice Smith');
      expect(res.body.mediators[0]).toHaveProperty('availabilityRules');
      expect(res.body.mediators[0]).toHaveProperty('rate', 50);
      expect(res.body.mediators[1]).toHaveProperty('id', 'mediator-2');
      expect(mockPrisma.mediator.findMany).toHaveBeenCalledWith({
        where: { status: 'active' },
        select: {
          id: true,
          name: true,
          bio: true,
          availabilityRules: true,
          rate: true
        },
        orderBy: { name: 'asc' }
      });
    });

    test('returns empty array when no mediators', async () => {
      mockPrisma.mediator.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/mediators/available')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.mediators).toEqual([]);
    });

    test('returns 403 for non-premium user', async () => {
      const trialUser = { ...TEST_USER_PREMIUM, subscriptionStatus: 'trial' };
      mockPrisma.user.findUnique.mockResolvedValue(trialUser);

      const res = await request(app)
        .get('/api/mediators/available')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Premium subscription required');
      expect(res.body.code).toBe('PREMIUM_REQUIRED');
      expect(mockPrisma.mediator.findMany).not.toHaveBeenCalled();
    });

    test('returns 401 without auth token', async () => {
      const res = await request(app)
        .get('/api/mediators/available');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('No token provided');
      expect(mockPrisma.mediator.findMany).not.toHaveBeenCalled();
    });
  });
});
