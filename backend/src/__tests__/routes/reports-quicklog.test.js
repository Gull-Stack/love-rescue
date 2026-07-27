/**
 * QA remediation P0-D: quick-only logs must not move Gottman-ratio report
 * inputs. The recommendation engine used to average (ratio || 0) over ALL
 * rows — a quick-only day silently dragged the average down. These tests
 * FAIL if quick rows re-enter ratio aggregation.
 */
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

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
  app.use('/api/reports', require('../../routes/reports'));
  app.use(errorHandler);
  return app;
}

const token = () => jwt.sign({ userId: 'user-1' }, JWT_SECRET, { expiresIn: '1h' });

const day = (offset) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - offset);
  return d;
};

const fullLog = (offset) => ({
  id: `log-f-${offset}`, userId: 'user-1', date: day(offset),
  positiveCount: 5, negativeCount: 1, ratio: 5,
  closenessScore: 8, mood: 7, quickLogOnly: false
});
const quickLog = (offset) => ({
  id: `log-q-${offset}`, userId: 'user-1', date: day(offset),
  positiveCount: 0, negativeCount: 0, ratio: null,
  closenessScore: null, mood: 4, quickLogOnly: true
});

describe('GET /api/reports/weekly with quick-only logs present', () => {
  let mockPrisma;
  let app;
  let body;

  beforeEach(async () => {
    mockPrisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-1', email: 't@x.com' }) },
      dailyLog: { findMany: jest.fn().mockResolvedValue([fullLog(2), fullLog(1), quickLog(0)]) },
      relationship: { findFirst: jest.fn().mockResolvedValue(null) },
      strategy: { findFirst: jest.fn().mockResolvedValue(null) }
    };
    app = createApp(mockPrisma);
    const res = await request(app)
      .get('/api/reports/weekly')
      .set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    body = res.body;
  });

  test('ratio statistics come from full check-ins only', () => {
    expect(body.report.statistics.totalPositives).toBe(10);
    expect(body.report.statistics.totalNegatives).toBe(2);
    expect(body.report.statistics.avgRatio).toBe(5);
  });

  test('quick log still counts as a logged day', () => {
    expect(body.report.daysLogged).toBe(3);
  });

  test('recommendation average is not dragged down by the quick-only day', () => {
    // Old bug: avg over (5 + 5 + 0)/3 = 3.33 < 5 → "aim for 5:1" fires.
    // Fixed: avg over full logs (5 + 5)/2 = 5 → it must NOT fire.
    const ratioRec = (body.report.recommendations || [])
      .find((r) => /5:1/.test(r.text));
    expect(ratioRec).toBeUndefined();
  });

  test('daily breakdown nulls the quick day instead of plotting fake zeros', () => {
    const quick = body.report.dailyBreakdown.find((d) => d.quickLogOnly);
    expect(quick).toBeDefined();
    expect(quick.positiveCount).toBeNull();
    expect(quick.negativeCount).toBeNull();
    expect(quick.ratio).toBeNull();
    expect(quick.mood).toBe(4); // mood is real user input and stays
  });
});
