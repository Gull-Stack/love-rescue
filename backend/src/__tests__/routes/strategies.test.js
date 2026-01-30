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
  app.use('/api/strategies', require('../../routes/strategies'));
  app.use(errorHandler);
  return app;
}

describe('Strategies Routes', () => {
  let mockPrisma;
  let app;
  let token;
  const userId = 'user-strat-1';
  const relationshipId = 'rel-1';
  const mockUser = {
    id: userId,
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    subscriptionStatus: 'paid',
    stripeCustomerId: 'cus_test',
    createdAt: new Date('2025-01-01')
  };

  beforeEach(() => {
    token = generateToken(userId);

    mockPrisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(mockUser)
      },
      relationship: {
        findFirst: jest.fn()
      },
      strategy: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn()
      },
      matchup: {
        findFirst: jest.fn()
      }
    };

    app = createApp(mockPrisma);
  });

  // -------------------------------------------------------------------------
  // GET /api/strategies/current
  // -------------------------------------------------------------------------
  describe('GET /current', () => {
    test('returns active strategy for the relationship', async () => {
      const mockStrategy = {
        id: 'strat-1',
        cycleNumber: 1,
        week: 2,
        dailyActivities: { monday: ['Activity 1'] },
        weeklyGoals: ['Goal 1'],
        progress: 45,
        startDate: new Date('2025-06-01'),
        endDate: new Date('2025-06-07')
      };

      mockPrisma.relationship.findFirst.mockResolvedValue({ id: relationshipId, user1Id: userId, user2Id: 'user-2' });
      mockPrisma.strategy.findFirst.mockResolvedValue(mockStrategy);

      const res = await request(app)
        .get('/api/strategies/current')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.strategy).toMatchObject({
        id: 'strat-1',
        cycleNumber: 1,
        week: 2,
        progress: 45
      });
      expect(res.body.strategy.dailyActivities).toEqual({ monday: ['Activity 1'] });
      expect(res.body.strategy.weeklyGoals).toEqual(['Goal 1']);
    });

    test('returns 404 when no relationship found', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/strategies/current')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Relationship not found');
    });

    test('returns 404 with NO_STRATEGY code when no active strategy', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue({ id: relationshipId, user1Id: userId, user2Id: 'user-2' });
      mockPrisma.strategy.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/strategies/current')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('No active strategy');
      expect(res.body.code).toBe('NO_STRATEGY');
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/strategies/generate
  // -------------------------------------------------------------------------
  describe('POST /generate', () => {
    test('creates 6-week plan based on matchup', async () => {
      const mockMatchup = {
        id: 'matchup-1',
        relationshipId,
        score: 72,
        alignments: { misses: [{ area: 'attachment' }] },
        generatedAt: new Date()
      };

      mockPrisma.relationship.findFirst.mockResolvedValue({ id: relationshipId, user1Id: userId, user2Id: 'user-2' });
      mockPrisma.matchup.findFirst.mockResolvedValue(mockMatchup);
      mockPrisma.strategy.updateMany.mockResolvedValue({ count: 0 });
      // No previous strategy
      mockPrisma.strategy.findFirst.mockResolvedValue(null);

      let weekCounter = 0;
      mockPrisma.strategy.create.mockImplementation(({ data }) => {
        weekCounter++;
        return Promise.resolve({
          id: `strat-new-${weekCounter}`,
          ...data,
          week: data.week
        });
      });

      const res = await request(app)
        .post('/api/strategies/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('6-week strategy plan generated');
      expect(res.body.cycleNumber).toBe(1);
      expect(res.body.strategies).toHaveLength(6);
      expect(mockPrisma.strategy.create).toHaveBeenCalledTimes(6);
    });

    test('returns 400 NO_MATCHUP when no matchup found', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue({ id: relationshipId, user1Id: userId, user2Id: 'user-2' });
      mockPrisma.matchup.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/strategies/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('NO_MATCHUP');
      expect(res.body.error).toBe('Complete matchup assessment first');
    });

    test('returns 404 when no relationship found', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/strategies/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Relationship not found');
    });

    test('deactivates old strategies before creating new ones', async () => {
      const mockMatchup = {
        id: 'matchup-1',
        relationshipId,
        score: 72,
        alignments: { misses: [] },
        generatedAt: new Date()
      };

      mockPrisma.relationship.findFirst.mockResolvedValue({ id: relationshipId, user1Id: userId, user2Id: 'user-2' });
      mockPrisma.matchup.findFirst.mockResolvedValue(mockMatchup);
      mockPrisma.strategy.updateMany.mockResolvedValue({ count: 6 });
      mockPrisma.strategy.findFirst.mockResolvedValue({ cycleNumber: 2 });

      let weekCounter = 0;
      mockPrisma.strategy.create.mockImplementation(({ data }) => {
        weekCounter++;
        return Promise.resolve({ id: `strat-new-${weekCounter}`, ...data });
      });

      const res = await request(app)
        .post('/api/strategies/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(200);
      expect(mockPrisma.strategy.updateMany).toHaveBeenCalledWith({
        where: {
          relationshipId,
          isActive: true
        },
        data: { isActive: false }
      });
      expect(res.body.cycleNumber).toBe(3);
    });

    test('requires subscription (expired returns 403)', async () => {
      const expiredUser = { ...mockUser, subscriptionStatus: 'expired' };
      mockPrisma.user.findUnique.mockResolvedValue(expiredUser);

      const res = await request(app)
        .post('/api/strategies/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('SUBSCRIPTION_EXPIRED');
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/strategies/update-progress
  // -------------------------------------------------------------------------
  describe('POST /update-progress', () => {
    test('updates progress with explicit progress value', async () => {
      const mockStrategy = {
        id: 'strat-1',
        relationship: { user1Id: userId, user2Id: 'user-2' },
        dailyActivities: { monday: ['A1'] },
        weeklyGoals: ['G1']
      };

      mockPrisma.strategy.findUnique.mockResolvedValue(mockStrategy);
      mockPrisma.strategy.update.mockResolvedValue({
        id: 'strat-1',
        week: 2,
        progress: 75
      });

      const res = await request(app)
        .post('/api/strategies/update-progress')
        .set('Authorization', `Bearer ${token}`)
        .send({ strategyId: 'strat-1', progress: 75 });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Progress updated');
      expect(res.body.strategy.progress).toBe(75);
    });

    test('calculates progress from completedActivities', async () => {
      const mockStrategy = {
        id: 'strat-1',
        relationship: { user1Id: userId, user2Id: 'user-2' },
        dailyActivities: {
          monday: ['A1', 'A2'],
          tuesday: ['A3']
        },
        weeklyGoals: ['G1']
      };

      mockPrisma.strategy.findUnique.mockResolvedValue(mockStrategy);
      // 3 daily activities + 1 weekly goal = 4 total; 2 completed = 50%
      mockPrisma.strategy.update.mockResolvedValue({
        id: 'strat-1',
        week: 1,
        progress: 50
      });

      const res = await request(app)
        .post('/api/strategies/update-progress')
        .set('Authorization', `Bearer ${token}`)
        .send({ strategyId: 'strat-1', completedActivities: 2 });

      expect(res.status).toBe(200);
      // Calculated: Math.round((2/4)*100) = 50
      expect(mockPrisma.strategy.update).toHaveBeenCalledWith({
        where: { id: 'strat-1' },
        data: { progress: 50 }
      });
    });

    test('returns 404 when strategy not found', async () => {
      mockPrisma.strategy.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/strategies/update-progress')
        .set('Authorization', `Bearer ${token}`)
        .send({ strategyId: 'nonexistent' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Strategy not found');
    });

    test('returns 403 when user is not part of the relationship', async () => {
      const mockStrategy = {
        id: 'strat-1',
        relationship: { user1Id: 'other-user-1', user2Id: 'other-user-2' },
        dailyActivities: {},
        weeklyGoals: []
      };

      mockPrisma.strategy.findUnique.mockResolvedValue(mockStrategy);

      const res = await request(app)
        .post('/api/strategies/update-progress')
        .set('Authorization', `Bearer ${token}`)
        .send({ strategyId: 'strat-1', progress: 50 });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Not authorized');
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/strategies/history
  // -------------------------------------------------------------------------
  describe('GET /history', () => {
    test('returns strategies grouped by cycle', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue({ id: relationshipId, user1Id: userId, user2Id: 'user-2' });

      const strategies = [
        { id: 's1', cycleNumber: 1, week: 1, progress: 100, isActive: false, startDate: new Date('2025-01-01'), endDate: new Date('2025-01-07') },
        { id: 's2', cycleNumber: 1, week: 2, progress: 80, isActive: false, startDate: new Date('2025-01-08'), endDate: new Date('2025-01-14') },
        { id: 's3', cycleNumber: 2, week: 1, progress: 50, isActive: true, startDate: new Date('2025-02-01'), endDate: new Date('2025-02-07') }
      ];
      mockPrisma.strategy.findMany.mockResolvedValue(strategies);

      const res = await request(app)
        .get('/api/strategies/history')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.cycles).toBeDefined();
      expect(res.body.cycles['1']).toHaveLength(2);
      expect(res.body.cycles['2']).toHaveLength(1);
      expect(res.body.cycles['1'][0].id).toBe('s1');
      expect(res.body.cycles['2'][0].isActive).toBe(true);
    });

    test('returns empty cycles when no history exists', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue({ id: relationshipId, user1Id: userId, user2Id: 'user-2' });
      mockPrisma.strategy.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/strategies/history')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.cycles).toEqual({});
    });

    test('returns 404 when no relationship found', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/strategies/history')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Relationship not found');
    });
  });
});
