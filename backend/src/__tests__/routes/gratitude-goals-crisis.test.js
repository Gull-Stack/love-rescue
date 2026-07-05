/**
 * Crisis detection is wired into the gratitude and goals free-text write paths
 * (same fire-and-forget hook as logs/real-talk). It must surface the 988/DV
 * resources in the response and NEVER break the save.
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

jest.mock('../../utils/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  isEmailConfigured: jest.fn(() => true),
}));

const { errorHandler } = require('../../middleware/errorHandler');
const { createMockPrisma } = require('../helpers/mockPrisma');

const JWT_SECRET = process.env.JWT_SECRET;
const USER_ID = 'user-1';
const REL_ID = 'rel-1';

const CRISIS_TEXT = 'I had a huge fight with my partner and now I want to die';
const BENIGN_TEXT = 'grateful for our morning walk together';

const USER = {
  id: USER_ID,
  email: 'u@example.com',
  firstName: 'Sam',
  lastName: 'User',
  role: 'user',
  subscriptionStatus: 'paid',
  stripeCustomerId: null,
  isPlatformAdmin: false,
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
  app.use('/api/gratitude', require('../../routes/gratitude'));
  app.use('/api/goals', require('../../routes/goals'));
  app.use(errorHandler);
  return app;
}

const token = () => jwt.sign({ userId: USER_ID }, JWT_SECRET, { expiresIn: '1h' });

async function flushAsync(times = 25) {
  for (let i = 0; i < times; i++) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}

describe('gratitude/goals crisis wiring', () => {
  let mockPrisma;
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();
    app = createApp(mockPrisma);

    mockPrisma.user.findUnique.mockResolvedValue(USER);
    mockPrisma.relationship.findFirst.mockResolvedValue({ id: REL_ID, user1Id: USER_ID, user2Id: 'partner-2', status: 'active' });
    mockPrisma.gratitudeEntry.upsert.mockResolvedValue({ id: 'g-1', userId: USER_ID, text: CRISIS_TEXT });
    mockPrisma.sharedGoal.create.mockResolvedValue({ id: 'goal-1', title: CRISIS_TEXT });

    // Alert pipeline (fire-and-forget) — resolve everything so nothing throws
    mockPrisma.therapistClient.findMany.mockResolvedValue([]);
    mockPrisma.relationship.findMany.mockResolvedValue([]);
    mockPrisma.therapistAssignment.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  test('gratitude: crisis text returns the crisis resources payload', async () => {
    const res = await request(app)
      .post('/api/gratitude')
      .set('Authorization', `Bearer ${token()}`)
      .send({ text: CRISIS_TEXT });

    expect(res.status).toBe(200);
    expect(res.body.entry).toBeDefined();
    expect(res.body.crisis).toBeDefined();
    expect(res.body.crisis.detected).toBe(true);
    expect(JSON.stringify(res.body.crisis.resources)).toContain('988');
    await flushAsync();
  });

  test('gratitude: benign text has no crisis payload but still saves', async () => {
    mockPrisma.gratitudeEntry.upsert.mockResolvedValue({ id: 'g-2', text: BENIGN_TEXT });
    const res = await request(app)
      .post('/api/gratitude')
      .set('Authorization', `Bearer ${token()}`)
      .send({ text: BENIGN_TEXT });

    expect(res.status).toBe(200);
    expect(res.body.entry).toBeDefined();
    expect(res.body.crisis).toBeUndefined();
  });

  test('goals: crisis text in title returns the crisis payload; save unaffected', async () => {
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${token()}`)
      .send({ title: CRISIS_TEXT, description: 'help' });

    expect(res.status).toBe(201);
    expect(res.body.goal).toBeDefined();
    expect(res.body.crisis).toBeDefined();
    expect(res.body.crisis.detected).toBe(true);
    await flushAsync();
  });

  test('goals: save still succeeds even if the alert pipeline errors', async () => {
    mockPrisma.therapistClient.findMany.mockRejectedValue(new Error('DB down'));
    mockPrisma.relationship.findMany.mockRejectedValue(new Error('DB down'));
    mockPrisma.auditLog.create.mockRejectedValue(new Error('DB down'));

    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${token()}`)
      .send({ title: CRISIS_TEXT });

    expect(res.status).toBe(201);
    expect(res.body.goal).toBeDefined();
    expect(res.body.crisis).toBeDefined();
    await flushAsync();
  });
});
