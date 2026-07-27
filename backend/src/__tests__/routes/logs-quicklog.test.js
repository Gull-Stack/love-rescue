/**
 * QA remediation P0-D: quick logs are mood-only.
 * These tests FAIL if the old behavior returns: fabricated interaction
 * counts written into ratio-bearing daily_logs columns, or a quick log
 * degrading an existing full check-in.
 */
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../utils/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn()
}));
jest.mock('../../utils/therapistAlerts', () => ({
  detectCrisisAndNotify: jest.fn().mockReturnValue({ isCrisis: false })
}));

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
  app.use('/api/logs', require('../../routes/logs'));
  app.use(errorHandler);
  return app;
}

const token = () => jwt.sign({ userId: 'user-1' }, JWT_SECRET, { expiresIn: '1h' });

describe('POST /api/logs/daily quickLog (metric integrity)', () => {
  let mockPrisma;
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-1', email: 't@x.com' }) },
      dailyLog: { upsert: jest.fn().mockImplementation(({ create }) => Promise.resolve({ id: 'log-1', ...create })) }
    };
    app = createApp(mockPrisma);
  });

  test('quick log stores mood only: counts 0, ratio null, flagged quickLogOnly', async () => {
    const res = await request(app)
      .post('/api/logs/daily')
      .set('Authorization', `Bearer ${token()}`)
      .send({ mood: 7, quickLog: true });

    expect(res.status).toBe(201);
    const { create, update } = mockPrisma.dailyLog.upsert.mock.calls[0][0];
    expect(create.quickLogOnly).toBe(true);
    expect(create.positiveCount).toBe(0);
    expect(create.negativeCount).toBe(0);
    expect(create.ratio).toBeNull();
    expect(create.mood).toBe(7);
    // An existing (possibly full) log for the day is never degraded
    expect(update).toEqual({ mood: 7 });
  });

  test('quick log IGNORES any counts smuggled into the payload', async () => {
    await request(app)
      .post('/api/logs/daily')
      .set('Authorization', `Bearer ${token()}`)
      .send({ mood: 8, quickLog: true, positiveCount: 3, negativeCount: 0 });

    const { create, update } = mockPrisma.dailyLog.upsert.mock.calls[0][0];
    expect(create.positiveCount).toBe(0);
    expect(create.negativeCount).toBe(0);
    expect(update.positiveCount).toBeUndefined();
    expect(update.negativeCount).toBeUndefined();
  });

  test('quick log without mood → 400', async () => {
    const res = await request(app)
      .post('/api/logs/daily')
      .set('Authorization', `Bearer ${token()}`)
      .send({ quickLog: true });

    expect(res.status).toBe(400);
    expect(mockPrisma.dailyLog.upsert).not.toHaveBeenCalled();
  });

  test('full check-in still writes real counts and clears quickLogOnly', async () => {
    const res = await request(app)
      .post('/api/logs/daily')
      .set('Authorization', `Bearer ${token()}`)
      .send({ positiveCount: 5, negativeCount: 1, mood: 6, closenessScore: 8 });

    expect(res.status).toBeLessThan(300);
    const { create, update } = mockPrisma.dailyLog.upsert.mock.calls[0][0];
    expect(create.positiveCount).toBe(5);
    expect(create.negativeCount).toBe(1);
    expect(create.quickLogOnly).toBe(false);
    expect(update.quickLogOnly).toBe(false);
  });
});
