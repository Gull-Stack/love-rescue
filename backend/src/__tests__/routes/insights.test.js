const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

jest.mock('../../utils/coursePosition', () => ({
  getCoursePosition: jest.fn().mockReturnValue({ week: 1, day: 1, courseDay: 1, daysSinceStart: 0 })
}));

const { getCoursePosition } = require('../../utils/coursePosition');
const { errorHandler } = require('../../middleware/errorHandler');

const JWT_SECRET = 'test-jwt-secret-key-for-testing';

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
  app.use('/api/insights', require('../../routes/insights'));
  app.use(errorHandler);
  return app;
}

describe('Insights Routes', () => {
  let mockPrisma;
  let app;
  let token;
  const userId = 'user-insight-1';
  const mockUser = {
    id: userId,
    email: 'insight@example.com',
    firstName: 'Insight',
    lastName: 'User',
    subscriptionStatus: 'paid',
    stripeCustomerId: 'cus_ins',
    createdAt: new Date('2025-01-01')
  };

  beforeEach(() => {
    token = generateToken(userId);
    getCoursePosition.mockReturnValue({ week: 1, day: 1, courseDay: 1, daysSinceStart: 0 });

    mockPrisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(mockUser)
      },
      dailyInsight: {
        findUnique: jest.fn()
      },
      assessment: {
        findMany: jest.fn()
      }
    };

    app = createApp(mockPrisma);
  });

  // -------------------------------------------------------------------------
  // GET /api/insights/daily
  // -------------------------------------------------------------------------
  describe('GET /daily', () => {
    test('returns insight with position data', async () => {
      const mockInsight = {
        id: 'insight-1',
        week: 1,
        day: 1,
        baseText: 'Today focus on building connection.',
        personalizationTags: null
      };

      mockPrisma.dailyInsight.findUnique.mockResolvedValue(mockInsight);

      const res = await request(app)
        .get('/api/insights/daily')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.insight).toBeDefined();
      expect(res.body.insight.id).toBe('insight-1');
      expect(res.body.insight.week).toBe(1);
      expect(res.body.insight.day).toBe(1);
      expect(res.body.insight.text).toBe('Today focus on building connection.');
      expect(res.body.insight.isPersonalized).toBe(false);
      expect(res.body.position).toEqual({ week: 1, day: 1, courseDay: 1, daysSinceStart: 0 });
    });

    test('returns null insight when not found', async () => {
      mockPrisma.dailyInsight.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/insights/daily')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.insight).toBeNull();
      expect(res.body.position).toEqual({ week: 1, day: 1, courseDay: 1, daysSinceStart: 0 });
    });

    test('personalizes insight with attachment tags', async () => {
      const mockInsight = {
        id: 'insight-2',
        week: 1,
        day: 1,
        baseText: 'Base insight text.',
        personalizationTags: {
          attachment: {
            secure: 'You have a secure attachment style - leverage this strength.',
            anxious: 'Focus on self-soothing when feeling anxious.'
          }
        }
      };

      mockPrisma.dailyInsight.findUnique.mockResolvedValue(mockInsight);
      mockPrisma.assessment.findMany.mockResolvedValue([
        {
          id: 'assess-1',
          type: 'attachment',
          score: { style: 'secure' },
          completedAt: new Date()
        }
      ]);

      const res = await request(app)
        .get('/api/insights/daily')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.insight.isPersonalized).toBe(true);
      expect(res.body.insight.text).toContain('Base insight text.');
      expect(res.body.insight.text).toContain('secure attachment style');
    });

    test('personalizes insight with personality tags', async () => {
      const mockInsight = {
        id: 'insight-3',
        week: 1,
        day: 1,
        baseText: 'Personality insight base.',
        personalizationTags: {
          personality: {
            introvert: 'As an introvert, take quiet time to recharge.',
            extrovert: 'Use your social energy to connect.'
          }
        }
      };

      mockPrisma.dailyInsight.findUnique.mockResolvedValue(mockInsight);
      mockPrisma.assessment.findMany.mockResolvedValue([
        {
          id: 'assess-2',
          type: 'personality',
          score: { dominantTrait: 'introvert' },
          completedAt: new Date()
        }
      ]);

      const res = await request(app)
        .get('/api/insights/daily')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.insight.isPersonalized).toBe(true);
      expect(res.body.insight.text).toContain('Personality insight base.');
      expect(res.body.insight.text).toContain('introvert');
    });

    test('requires subscription - returns 403 for expired', async () => {
      const expiredUser = { ...mockUser, subscriptionStatus: 'expired' };
      mockPrisma.user.findUnique.mockResolvedValue(expiredUser);

      const res = await request(app)
        .get('/api/insights/daily')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('SUBSCRIPTION_EXPIRED');
    });

    test('requires auth - returns 401 without token', async () => {
      const res = await request(app)
        .get('/api/insights/daily');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('No token provided');
    });
  });
});
