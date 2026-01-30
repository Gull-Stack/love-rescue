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
  app.use('/api/reports', require('../../routes/reports'));
  app.use(errorHandler);
  return app;
}

describe('Reports Routes', () => {
  let mockPrisma;
  let app;
  let token;
  const userId = 'user-report-1';
  const relationshipId = 'rel-report-1';
  const mockUser = {
    id: userId,
    email: 'reporter@example.com',
    firstName: 'Jane',
    lastName: 'Report',
    subscriptionStatus: 'paid',
    stripeCustomerId: 'cus_rpt',
    createdAt: new Date('2025-01-01')
  };

  beforeEach(() => {
    token = generateToken(userId);

    mockPrisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(mockUser)
      },
      dailyLog: {
        findMany: jest.fn()
      },
      relationship: {
        findFirst: jest.fn()
      },
      strategy: {
        findFirst: jest.fn(),
        findMany: jest.fn()
      },
      matchup: {
        findMany: jest.fn()
      }
    };

    app = createApp(mockPrisma);
  });

  // -------------------------------------------------------------------------
  // GET /api/reports/weekly
  // -------------------------------------------------------------------------
  describe('GET /weekly', () => {
    test('returns weekly report with stats, highlights, improvements, and recommendations', async () => {
      const logs = [
        { date: new Date(), positiveCount: 10, negativeCount: 2, ratio: 5.0, closenessScore: 8, mood: 7 },
        { date: new Date(), positiveCount: 8, negativeCount: 1, ratio: 8.0, closenessScore: 7, mood: 8 },
        { date: new Date(), positiveCount: 6, negativeCount: 1, ratio: 6.0, closenessScore: 9, mood: 7 },
        { date: new Date(), positiveCount: 7, negativeCount: 2, ratio: 3.5, closenessScore: 8, mood: 6 },
        { date: new Date(), positiveCount: 9, negativeCount: 1, ratio: 9.0, closenessScore: 7, mood: 8 }
      ];

      mockPrisma.dailyLog.findMany.mockResolvedValue(logs);
      mockPrisma.relationship.findFirst.mockResolvedValue({ id: relationshipId, user1Id: userId, user2Id: 'user-2' });
      mockPrisma.strategy.findFirst.mockResolvedValue({
        id: 'strat-1',
        week: 3,
        progress: 60,
        weeklyGoals: ['Goal 1', 'Goal 2']
      });

      const res = await request(app)
        .get('/api/reports/weekly')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.report).toBeDefined();
      expect(res.body.report.daysLogged).toBe(5);
      expect(res.body.report.statistics.totalPositives).toBe(40);
      expect(res.body.report.statistics.totalNegatives).toBe(7);
      expect(res.body.report.statistics.avgRatio).toBeCloseTo(5.71, 1);
      expect(res.body.report.statistics.avgCloseness).toBeDefined();
      expect(res.body.report.statistics.avgMood).toBeDefined();
      expect(res.body.report.highlights).toEqual(expect.any(Array));
      expect(res.body.report.improvements).toEqual(expect.any(Array));
      expect(res.body.report.recommendations).toEqual(expect.any(Array));
      expect(res.body.report.strategyProgress).toMatchObject({ week: 3, progress: 60 });
      expect(res.body.report.dailyBreakdown).toHaveLength(5);
    });

    test('returns zero stats when no logs for the week', async () => {
      mockPrisma.dailyLog.findMany.mockResolvedValue([]);
      mockPrisma.relationship.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/reports/weekly')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.report.daysLogged).toBe(0);
      expect(res.body.report.statistics.totalPositives).toBe(0);
      expect(res.body.report.statistics.totalNegatives).toBe(0);
      expect(res.body.report.statistics.avgRatio).toBe(0);
      expect(res.body.report.statistics.avgCloseness).toBeNull();
      expect(res.body.report.statistics.avgMood).toBeNull();
      expect(res.body.report.strategyProgress).toBeNull();
    });

    test('shows highlight when positive ratio is >= 5', async () => {
      const logs = [
        { date: new Date(), positiveCount: 15, negativeCount: 2, ratio: 7.5, closenessScore: null, mood: null },
        { date: new Date(), positiveCount: 10, negativeCount: 1, ratio: 10, closenessScore: null, mood: null }
      ];

      mockPrisma.dailyLog.findMany.mockResolvedValue(logs);
      mockPrisma.relationship.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/reports/weekly')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      // 25/3 = 8.33, which is >= 5
      expect(res.body.report.highlights).toContain('Excellent positive interaction ratio!');
    });

    test('shows improvement when positive ratio is < 5', async () => {
      const logs = [
        { date: new Date(), positiveCount: 3, negativeCount: 2, ratio: 1.5, closenessScore: null, mood: null },
        { date: new Date(), positiveCount: 2, negativeCount: 3, ratio: 0.67, closenessScore: null, mood: null }
      ];

      mockPrisma.dailyLog.findMany.mockResolvedValue(logs);
      mockPrisma.relationship.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/reports/weekly')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      // 5/5 = 1.0, which is < 5
      expect(res.body.report.improvements).toContain('Work on increasing positive interactions');
    });

    test('shows consistent logging highlight when >= 5 logs', async () => {
      const logs = Array.from({ length: 5 }, (_, i) => ({
        date: new Date(),
        positiveCount: 1,
        negativeCount: 0,
        ratio: 1,
        closenessScore: null,
        mood: null
      }));

      mockPrisma.dailyLog.findMany.mockResolvedValue(logs);
      mockPrisma.relationship.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/reports/weekly')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.report.highlights).toContain('Great consistency with daily logging');
    });

    test('includes strategy progress when strategy is active', async () => {
      const logs = [
        { date: new Date(), positiveCount: 5, negativeCount: 1, ratio: 5.0, closenessScore: 7, mood: 7 }
      ];

      mockPrisma.dailyLog.findMany.mockResolvedValue(logs);
      mockPrisma.relationship.findFirst.mockResolvedValue({ id: relationshipId, user1Id: userId, user2Id: 'user-2' });
      mockPrisma.strategy.findFirst.mockResolvedValue({
        id: 'strat-active',
        week: 2,
        progress: 80,
        weeklyGoals: ['Keep going']
      });

      const res = await request(app)
        .get('/api/reports/weekly')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.report.strategyProgress).toEqual({
        week: 2,
        progress: 80,
        weeklyGoals: ['Keep going']
      });
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/reports/monthly
  // -------------------------------------------------------------------------
  describe('GET /monthly', () => {
    test('returns monthly breakdown by weeks', async () => {
      // Create 14 logs (2 weeks' worth)
      const logs = Array.from({ length: 14 }, (_, i) => ({
        date: new Date(2025, 5, i + 1),
        positiveCount: 5 + i,
        negativeCount: 1,
        ratio: 5 + i,
        closenessScore: 7,
        mood: 7
      }));

      mockPrisma.dailyLog.findMany.mockResolvedValue(logs);

      const res = await request(app)
        .get('/api/reports/monthly')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.report).toBeDefined();
      expect(res.body.report.daysLogged).toBe(14);
      expect(res.body.report.weeklyBreakdown).toEqual(expect.any(Array));
      expect(res.body.report.weeklyBreakdown.length).toBeGreaterThanOrEqual(2);
      expect(res.body.report.statistics.totalPositives).toBeGreaterThan(0);
    });

    test('returns empty report when no logs for the month', async () => {
      mockPrisma.dailyLog.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/reports/monthly')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.report.daysLogged).toBe(0);
      expect(res.body.report.weeklyBreakdown).toEqual([]);
      expect(res.body.report.statistics.totalPositives).toBe(0);
      expect(res.body.report.statistics.totalNegatives).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/reports/progress
  // -------------------------------------------------------------------------
  describe('GET /progress', () => {
    test('returns matchup and cycle progress', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue({ id: relationshipId, user1Id: userId, user2Id: 'user-2' });

      const matchups = [
        { id: 'm1', generatedAt: new Date('2025-01-15'), score: 60 },
        { id: 'm2', generatedAt: new Date('2025-03-15'), score: 75 }
      ];
      mockPrisma.matchup.findMany.mockResolvedValue(matchups);

      const strategies = [
        { cycleNumber: 1, week: 1, progress: 80 },
        { cycleNumber: 1, week: 2, progress: 60 },
        { cycleNumber: 2, week: 1, progress: 50 }
      ];
      mockPrisma.strategy.findMany.mockResolvedValue(strategies);

      const res = await request(app)
        .get('/api/reports/progress')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.report.matchupProgress).toHaveLength(2);
      expect(res.body.report.matchupProgress[0].score).toBe(60);
      expect(res.body.report.matchupProgress[1].score).toBe(75);
      expect(res.body.report.cycleProgress['1'].weeks).toHaveLength(2);
      expect(res.body.report.cycleProgress['1'].avgProgress).toBe(70); // (80+60)/2
      expect(res.body.report.cycleProgress['2'].weeks).toHaveLength(1);
      expect(res.body.report.currentCycle).toBe(2);
    });

    test('returns 404 when no relationship found', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/reports/progress')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Relationship not found');
    });

    test('calculates overallImprovement from first and last matchup scores', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue({ id: relationshipId, user1Id: userId, user2Id: 'user-2' });

      const matchups = [
        { id: 'm1', generatedAt: new Date('2025-01-01'), score: 50 },
        { id: 'm2', generatedAt: new Date('2025-02-01'), score: 65 },
        { id: 'm3', generatedAt: new Date('2025-03-01'), score: 80 }
      ];
      mockPrisma.matchup.findMany.mockResolvedValue(matchups);
      mockPrisma.strategy.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/reports/progress')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      // overallImprovement = last score - first score = 80 - 50 = 30
      expect(res.body.report.overallImprovement).toBe(30);
    });

    test('returns 0 overallImprovement with fewer than 2 matchups', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue({ id: relationshipId, user1Id: userId, user2Id: 'user-2' });
      mockPrisma.matchup.findMany.mockResolvedValue([
        { id: 'm1', generatedAt: new Date('2025-01-01'), score: 60 }
      ]);
      mockPrisma.strategy.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/reports/progress')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.report.overallImprovement).toBe(0);
    });
  });
});
