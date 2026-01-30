const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

jest.mock('../../utils/scoring', () => ({
  calculateRatio: jest.fn((p, n) => n === 0 ? (p > 0 ? Infinity : 0) : Math.round((p / n) * 100) / 100)
}));

const { errorHandler } = require('../../middleware/errorHandler');
const { calculateRatio } = require('../../utils/scoring');

const JWT_SECRET = 'test-jwt-secret-key-for-testing';

function createApp(mockPrisma) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.prisma = mockPrisma;
    next();
  });
  process.env.JWT_SECRET = JWT_SECRET;
  app.use('/api/logs', require('../../routes/logs'));
  app.use(errorHandler);
  return app;
}

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

describe('Logs Routes', () => {
  let mockPrisma;
  let app;
  let token;

  const mockAuthUser = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    subscriptionStatus: 'trial',
    stripeCustomerId: null,
    createdAt: new Date()
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const mockDailyLog = {
    id: 'log-1',
    userId: 'user-1',
    date: today,
    positiveCount: 5,
    negativeCount: 1,
    ratio: 5,
    journalEntry: 'Good day today',
    bidsTurned: 3,
    closenessScore: 8,
    mood: 7
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma = {
      user: {
        findUnique: jest.fn()
      },
      dailyLog: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn()
      }
    };

    app = createApp(mockPrisma);
    token = generateToken('user-1');

    // Default: authenticate middleware finds the user
    mockPrisma.user.findUnique.mockResolvedValue(mockAuthUser);
  });

  // ───────────────────────────────────────────────────────────────
  // POST /api/logs/daily
  // ───────────────────────────────────────────────────────────────

  describe('POST /api/logs/daily', () => {
    it('should create a daily log and return 200', async () => {
      mockPrisma.dailyLog.upsert.mockResolvedValue(mockDailyLog);

      const res = await request(app)
        .post('/api/logs/daily')
        .set('Authorization', `Bearer ${token}`)
        .send({
          positiveCount: 5,
          negativeCount: 1,
          journalEntry: 'Good day today',
          bidsTurned: 3,
          closenessScore: 8,
          mood: 7
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Daily log saved');
      expect(res.body.log).toBeDefined();
      expect(res.body.log.positiveCount).toBe(5);
      expect(res.body.log.negativeCount).toBe(1);
      expect(res.body.log.ratio).toBe(5);
      expect(calculateRatio).toHaveBeenCalledWith(5, 1);
      expect(mockPrisma.dailyLog.upsert).toHaveBeenCalled();
    });

    it('should upsert an existing log for the same date', async () => {
      const updatedLog = {
        ...mockDailyLog,
        positiveCount: 7,
        negativeCount: 2,
        ratio: 3.5
      };
      mockPrisma.dailyLog.upsert.mockResolvedValue(updatedLog);

      const res = await request(app)
        .post('/api/logs/daily')
        .set('Authorization', `Bearer ${token}`)
        .send({
          date: today.toISOString(),
          positiveCount: 7,
          negativeCount: 2,
          journalEntry: 'Updated entry',
          bidsTurned: 4,
          closenessScore: 9,
          mood: 8
        });

      expect(res.status).toBe(200);
      expect(res.body.log.positiveCount).toBe(7);
      expect(mockPrisma.dailyLog.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId_date: expect.objectContaining({
              userId: 'user-1'
            })
          })
        })
      );
    });

    it('should return 403 when subscription is expired', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockAuthUser,
        subscriptionStatus: 'expired'
      });

      const res = await request(app)
        .post('/api/logs/daily')
        .set('Authorization', `Bearer ${token}`)
        .send({ positiveCount: 5, negativeCount: 1 });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('SUBSCRIPTION_EXPIRED');
    });

    it('should handle Infinity ratio by storing 999', async () => {
      calculateRatio.mockReturnValueOnce(Infinity);

      const logWithInfinity = {
        ...mockDailyLog,
        positiveCount: 5,
        negativeCount: 0,
        ratio: 999
      };
      mockPrisma.dailyLog.upsert.mockResolvedValue(logWithInfinity);

      const res = await request(app)
        .post('/api/logs/daily')
        .set('Authorization', `Bearer ${token}`)
        .send({ positiveCount: 5, negativeCount: 0 });

      expect(res.status).toBe(200);
      expect(res.body.log.ratio).toBe(999);
      expect(mockPrisma.dailyLog.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ ratio: 999 }),
          update: expect.objectContaining({ ratio: 999 })
        })
      );
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/logs/daily')
        .send({ positiveCount: 5, negativeCount: 1 });

      expect(res.status).toBe(401);
    });

    it('should default positiveCount and negativeCount to 0', async () => {
      mockPrisma.dailyLog.upsert.mockResolvedValue({
        ...mockDailyLog,
        positiveCount: 0,
        negativeCount: 0,
        ratio: 0
      });

      const res = await request(app)
        .post('/api/logs/daily')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(200);
      expect(calculateRatio).toHaveBeenCalledWith(0, 0);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // GET /api/logs/daily/:date
  // ───────────────────────────────────────────────────────────────

  describe('GET /api/logs/daily/:date', () => {
    it('should return a log for the given date', async () => {
      mockPrisma.dailyLog.findUnique.mockResolvedValue(mockDailyLog);

      const dateStr = '2025-01-15';
      const res = await request(app)
        .get(`/api/logs/daily/${dateStr}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.log).toBeDefined();
      expect(res.body.log.positiveCount).toBe(5);
      expect(mockPrisma.dailyLog.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId_date: expect.objectContaining({
              userId: 'user-1'
            })
          })
        })
      );
    });

    it('should return 404 for a date with no log', async () => {
      mockPrisma.dailyLog.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/logs/daily/2025-01-01')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('No log for this date');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // GET /api/logs/daily (range)
  // ───────────────────────────────────────────────────────────────

  describe('GET /api/logs/daily (range)', () => {
    it('should return logs for default 7 days', async () => {
      const mockLogs = Array.from({ length: 5 }, (_, i) => ({
        ...mockDailyLog,
        id: `log-${i}`,
        date: new Date(Date.now() - i * 86400000)
      }));
      mockPrisma.dailyLog.findMany.mockResolvedValue(mockLogs);

      const res = await request(app)
        .get('/api/logs/daily')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.logs).toBeDefined();
      expect(res.body.logs).toHaveLength(5);
      expect(mockPrisma.dailyLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            date: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date)
            })
          }),
          orderBy: { date: 'desc' },
          take: 7
        })
      );
    });

    it('should respect startDate and endDate query params', async () => {
      mockPrisma.dailyLog.findMany.mockResolvedValue([mockDailyLog]);

      const res = await request(app)
        .get('/api/logs/daily')
        .query({ startDate: '2025-01-01', endDate: '2025-01-31' })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.logs).toBeDefined();
      expect(mockPrisma.dailyLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date)
            })
          })
        })
      );
    });

    it('should return empty array when no logs exist', async () => {
      mockPrisma.dailyLog.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/logs/daily')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.logs).toHaveLength(0);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // GET /api/logs/stats
  // ───────────────────────────────────────────────────────────────

  describe('GET /api/logs/stats', () => {
    it('should return stats for default 7d period', async () => {
      const mockLogs = [
        { positiveCount: 5, negativeCount: 1, ratio: 5, closenessScore: 8, mood: 7, date: new Date(Date.now() - 6 * 86400000) },
        { positiveCount: 4, negativeCount: 2, ratio: 2, closenessScore: 7, mood: 6, date: new Date(Date.now() - 5 * 86400000) },
        { positiveCount: 6, negativeCount: 1, ratio: 6, closenessScore: 9, mood: 8, date: new Date(Date.now() - 4 * 86400000) },
        { positiveCount: 3, negativeCount: 3, ratio: 1, closenessScore: 6, mood: 5, date: new Date(Date.now() - 3 * 86400000) },
        { positiveCount: 7, negativeCount: 1, ratio: 7, closenessScore: 8, mood: 8, date: new Date(Date.now() - 2 * 86400000) }
      ];
      mockPrisma.dailyLog.findMany.mockResolvedValue(mockLogs);
      calculateRatio.mockReturnValue(3.13); // 25/8

      const res = await request(app)
        .get('/api/logs/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.stats).toBeDefined();
      expect(res.body.stats.daysLogged).toBe(5);
      expect(res.body.stats.totalPositives).toBe(25);
      expect(res.body.stats.totalNegatives).toBe(8);
      expect(res.body.stats.avgRatio).toBeDefined();
      expect(res.body.stats.avgCloseness).toBeDefined();
      expect(res.body.stats.avgMood).toBeDefined();
      expect(res.body.stats.trend).toBeDefined();
      expect(res.body.chartData).toBeDefined();
      expect(res.body.chartData).toHaveLength(5);
    });

    it('should return zeros when no logs exist', async () => {
      mockPrisma.dailyLog.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/logs/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.stats).toBeDefined();
      expect(res.body.stats.daysLogged).toBe(0);
      expect(res.body.stats.avgRatio).toBe(0);
      expect(res.body.stats.avgCloseness).toBe(0);
      expect(res.body.stats.avgMood).toBe(0);
      expect(res.body.stats.totalPositives).toBe(0);
      expect(res.body.stats.totalNegatives).toBe(0);
      expect(res.body.stats.trend).toBe('neutral');
    });

    it('should calculate trend as improving when second half ratio is higher', async () => {
      // First half: low ratios, second half: high ratios
      const mockLogs = [
        { positiveCount: 2, negativeCount: 2, ratio: 1, closenessScore: 5, mood: 5, date: new Date(Date.now() - 6 * 86400000) },
        { positiveCount: 2, negativeCount: 2, ratio: 1, closenessScore: 5, mood: 5, date: new Date(Date.now() - 5 * 86400000) },
        { positiveCount: 8, negativeCount: 1, ratio: 8, closenessScore: 9, mood: 8, date: new Date(Date.now() - 2 * 86400000) },
        { positiveCount: 9, negativeCount: 1, ratio: 9, closenessScore: 9, mood: 9, date: new Date(Date.now() - 1 * 86400000) }
      ];
      mockPrisma.dailyLog.findMany.mockResolvedValue(mockLogs);
      calculateRatio.mockReturnValue(4.67);

      const res = await request(app)
        .get('/api/logs/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.trend).toBe('improving');
    });

    it('should calculate trend as declining when second half ratio is lower', async () => {
      // First half: high ratios, second half: low ratios
      const mockLogs = [
        { positiveCount: 8, negativeCount: 1, ratio: 8, closenessScore: 9, mood: 8, date: new Date(Date.now() - 6 * 86400000) },
        { positiveCount: 9, negativeCount: 1, ratio: 9, closenessScore: 9, mood: 9, date: new Date(Date.now() - 5 * 86400000) },
        { positiveCount: 2, negativeCount: 2, ratio: 1, closenessScore: 5, mood: 5, date: new Date(Date.now() - 2 * 86400000) },
        { positiveCount: 2, negativeCount: 2, ratio: 1, closenessScore: 5, mood: 5, date: new Date(Date.now() - 1 * 86400000) }
      ];
      mockPrisma.dailyLog.findMany.mockResolvedValue(mockLogs);
      calculateRatio.mockReturnValue(3.5);

      const res = await request(app)
        .get('/api/logs/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.trend).toBe('declining');
    });

    it('should calculate trend as neutral when ratios are similar', async () => {
      const mockLogs = [
        { positiveCount: 5, negativeCount: 1, ratio: 5, closenessScore: 8, mood: 7, date: new Date(Date.now() - 6 * 86400000) },
        { positiveCount: 5, negativeCount: 1, ratio: 5, closenessScore: 8, mood: 7, date: new Date(Date.now() - 5 * 86400000) },
        { positiveCount: 5, negativeCount: 1, ratio: 5, closenessScore: 8, mood: 7, date: new Date(Date.now() - 2 * 86400000) },
        { positiveCount: 5, negativeCount: 1, ratio: 5, closenessScore: 8, mood: 7, date: new Date(Date.now() - 1 * 86400000) }
      ];
      mockPrisma.dailyLog.findMany.mockResolvedValue(mockLogs);
      calculateRatio.mockReturnValue(5);

      const res = await request(app)
        .get('/api/logs/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.trend).toBe('neutral');
    });

    it('should handle 30d period', async () => {
      mockPrisma.dailyLog.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/logs/stats')
        .query({ period: '30d' })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.daysLogged).toBe(0);
      // Verify that findMany was called (the period logic is internal)
      expect(mockPrisma.dailyLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
            date: expect.objectContaining({
              gte: expect.any(Date)
            })
          })
        })
      );
    });

    it('should handle 90d period', async () => {
      mockPrisma.dailyLog.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/logs/stats')
        .query({ period: '90d' })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.daysLogged).toBe(0);
      expect(mockPrisma.dailyLog.findMany).toHaveBeenCalled();
    });

    it('should handle Infinity avgRatio by capping at 999', async () => {
      const mockLogs = [
        { positiveCount: 5, negativeCount: 0, ratio: 999, closenessScore: 8, mood: 7, date: new Date() }
      ];
      mockPrisma.dailyLog.findMany.mockResolvedValue(mockLogs);
      calculateRatio.mockReturnValue(Infinity);

      const res = await request(app)
        .get('/api/logs/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.avgRatio).toBe(999);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // GET /api/logs/prompt
  // ───────────────────────────────────────────────────────────────

  describe('GET /api/logs/prompt', () => {
    it('should return today\'s prompt', async () => {
      mockPrisma.dailyLog.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/logs/prompt')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.prompt).toBeDefined();
      expect(res.body.prompt.title).toBeDefined();
      expect(res.body.prompt.prompt).toBeDefined();
      expect(res.body.prompt.type).toBeDefined();
      expect(res.body.hasLoggedToday).toBe(false);
      expect(res.body.todayLog).toBeNull();
    });

    it('should show hasLoggedToday true when user has logged today', async () => {
      mockPrisma.dailyLog.findUnique.mockResolvedValue({
        ...mockDailyLog,
        date: today
      });

      const res = await request(app)
        .get('/api/logs/prompt')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.hasLoggedToday).toBe(true);
      expect(res.body.todayLog).toBeDefined();
      expect(res.body.todayLog.positiveCount).toBe(5);
      expect(res.body.todayLog.negativeCount).toBe(1);
      expect(res.body.todayLog.ratio).toBe(5);
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .get('/api/logs/prompt');

      expect(res.status).toBe(401);
    });
  });
});
