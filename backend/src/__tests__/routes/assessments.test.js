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
  scoreAttachment: jest.fn().mockReturnValue({
    style: 'secure',
    anxietyScore: 20,
    avoidanceScore: 20,
    secureScore: 80
  }),
  scorePersonality: jest.fn().mockReturnValue({
    type: 'INTJ',
    dimensions: {},
    description: 'Strategic'
  }),
  scoreWellnessBehavior: jest.fn().mockReturnValue({
    score: 75,
    level: 'high',
    rawScore: 38,
    maxScore: 50
  }),
  scoreNegativePatterns: jest.fn().mockReturnValue({
    patterns: { criticism: 20, defensiveness: 30, disrespect: 10, withdrawal: 15 },
    closeness: 70,
    overallRisk: 19
  })
}));

const { errorHandler } = require('../../middleware/errorHandler');
const {
  scoreAttachment,
  scorePersonality,
  scoreWellnessBehavior,
  scoreNegativePatterns
} = require('../../utils/scoring');

const JWT_SECRET = 'test-jwt-secret-key-for-testing';

function createApp(mockPrisma) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.prisma = mockPrisma;
    next();
  });
  process.env.JWT_SECRET = JWT_SECRET;
  app.use('/api/assessments', require('../../routes/assessments'));
  app.use(errorHandler);
  return app;
}

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

describe('Assessments Routes', () => {
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

  const mockAssessment = {
    id: 'assessment-1',
    userId: 'user-1',
    type: 'attachment',
    responses: { 1: 4, 2: 2, 3: 5 },
    score: { style: 'secure', anxietyScore: 20, avoidanceScore: 20, secureScore: 80 },
    completedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma = {
      user: {
        findUnique: jest.fn()
      },
      assessment: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      }
    };

    app = createApp(mockPrisma);
    token = generateToken('user-1');

    // Default: authenticate middleware finds the user
    mockPrisma.user.findUnique.mockResolvedValue(mockAuthUser);
  });

  // ───────────────────────────────────────────────────────────────
  // GET /api/assessments/questions/:type
  // ───────────────────────────────────────────────────────────────

  describe('GET /api/assessments/questions/:type', () => {
    it('should return attachment questions', async () => {
      const res = await request(app)
        .get('/api/assessments/questions/attachment')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('attachment');
      expect(res.body.questions).toBeDefined();
      expect(Array.isArray(res.body.questions)).toBe(true);
      expect(res.body.questions.length).toBeGreaterThan(0);
    });

    it('should return personality questions', async () => {
      const res = await request(app)
        .get('/api/assessments/questions/personality')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.type).toBe('personality');
      expect(res.body.questions).toBeDefined();
      expect(Array.isArray(res.body.questions)).toBe(true);
      expect(res.body.questions.length).toBeGreaterThan(0);
    });

    it('should return 400 for an invalid assessment type', async () => {
      const res = await request(app)
        .get('/api/assessments/questions/invalid_type')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid assessment type');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .get('/api/assessments/questions/attachment');

      expect(res.status).toBe(401);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // POST /api/assessments/submit
  // ───────────────────────────────────────────────────────────────

  describe('POST /api/assessments/submit', () => {
    it('should create a new assessment and return 200', async () => {
      mockPrisma.assessment.findFirst.mockResolvedValue(null);
      mockPrisma.assessment.create.mockResolvedValue(mockAssessment);

      const res = await request(app)
        .post('/api/assessments/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'attachment',
          responses: { 1: 4, 2: 2, 3: 5 }
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Assessment completed');
      expect(res.body.assessment).toBeDefined();
      expect(res.body.assessment.type).toBe('attachment');
      expect(scoreAttachment).toHaveBeenCalled();
      expect(mockPrisma.assessment.create).toHaveBeenCalled();
    });

    it('should update an existing assessment', async () => {
      mockPrisma.assessment.findFirst.mockResolvedValue(mockAssessment);
      mockPrisma.assessment.update.mockResolvedValue({
        ...mockAssessment,
        completedAt: new Date()
      });

      const res = await request(app)
        .post('/api/assessments/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'attachment',
          responses: { 1: 5, 2: 3, 3: 4 }
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Assessment completed');
      expect(mockPrisma.assessment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockAssessment.id }
        })
      );
    });

    it('should return 400 when type is missing', async () => {
      const res = await request(app)
        .post('/api/assessments/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({ responses: { 1: 4 } });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Type and responses are required');
    });

    it('should return 400 when responses are missing', async () => {
      const res = await request(app)
        .post('/api/assessments/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'attachment' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Type and responses are required');
    });

    it('should return 400 for invalid assessment type', async () => {
      const res = await request(app)
        .post('/api/assessments/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'invalid_type', responses: { 1: 4 } });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid assessment type');
    });

    it('should return 403 when subscription is expired', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockAuthUser,
        subscriptionStatus: 'expired'
      });

      const res = await request(app)
        .post('/api/assessments/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'attachment',
          responses: { 1: 4, 2: 2, 3: 5 }
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('SUBSCRIPTION_EXPIRED');
    });

    it('should score personality type correctly', async () => {
      mockPrisma.assessment.findFirst.mockResolvedValue(null);
      mockPrisma.assessment.create.mockResolvedValue({
        ...mockAssessment,
        type: 'personality',
        score: { type: 'INTJ', dimensions: {}, description: 'Strategic' }
      });

      const res = await request(app)
        .post('/api/assessments/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'personality',
          responses: { 1: 4, 2: 3, 3: 5 }
        });

      expect(res.status).toBe(200);
      expect(scorePersonality).toHaveBeenCalled();
    });

    it('should score wellness_behavior type correctly', async () => {
      mockPrisma.assessment.findFirst.mockResolvedValue(null);
      mockPrisma.assessment.create.mockResolvedValue({
        ...mockAssessment,
        type: 'wellness_behavior',
        score: { score: 75, level: 'high', rawScore: 38, maxScore: 50 }
      });

      const res = await request(app)
        .post('/api/assessments/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'wellness_behavior',
          responses: { 1: 4, 2: 2 }
        });

      expect(res.status).toBe(200);
      expect(scoreWellnessBehavior).toHaveBeenCalled();
    });

    it('should score negative_patterns_closeness type correctly', async () => {
      mockPrisma.assessment.findFirst.mockResolvedValue(null);
      mockPrisma.assessment.create.mockResolvedValue({
        ...mockAssessment,
        type: 'negative_patterns_closeness',
        score: { patterns: {}, closeness: 70, overallRisk: 19 }
      });

      const res = await request(app)
        .post('/api/assessments/submit')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'negative_patterns_closeness',
          responses: { 1: 3, 2: 4 }
        });

      expect(res.status).toBe(200);
      expect(scoreNegativePatterns).toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────
  // GET /api/assessments/results
  // ───────────────────────────────────────────────────────────────

  describe('GET /api/assessments/results', () => {
    it('should return completed and pending assessments', async () => {
      mockPrisma.assessment.findMany.mockResolvedValue([
        {
          id: 'a-1',
          type: 'attachment',
          score: { style: 'secure' },
          completedAt: new Date()
        },
        {
          id: 'a-2',
          type: 'personality',
          score: { type: 'INTJ' },
          completedAt: new Date()
        }
      ]);

      const res = await request(app)
        .get('/api/assessments/results')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.completed).toHaveLength(2);
      expect(res.body.pending).toContain('wellness_behavior');
      expect(res.body.pending).toContain('negative_patterns_closeness');
      expect(res.body.allCompleted).toBe(false);
    });

    it('should return empty when no assessments exist', async () => {
      mockPrisma.assessment.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/assessments/results')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.completed).toHaveLength(0);
      expect(res.body.pending).toHaveLength(4);
      expect(res.body.allCompleted).toBe(false);
    });

    it('should report allCompleted when all assessments are done', async () => {
      mockPrisma.assessment.findMany.mockResolvedValue([
        { id: 'a-1', type: 'attachment', score: {}, completedAt: new Date() },
        { id: 'a-2', type: 'personality', score: {}, completedAt: new Date() },
        { id: 'a-3', type: 'wellness_behavior', score: {}, completedAt: new Date() },
        { id: 'a-4', type: 'negative_patterns_closeness', score: {}, completedAt: new Date() }
      ]);

      const res = await request(app)
        .get('/api/assessments/results')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.completed).toHaveLength(4);
      expect(res.body.pending).toHaveLength(0);
      expect(res.body.allCompleted).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // GET /api/assessments/results/:type
  // ───────────────────────────────────────────────────────────────

  describe('GET /api/assessments/results/:type', () => {
    it('should return assessment with interpretation', async () => {
      mockPrisma.assessment.findFirst.mockResolvedValue({
        id: 'a-1',
        type: 'attachment',
        score: { style: 'secure', anxietyScore: 20, avoidanceScore: 20, secureScore: 80 },
        completedAt: new Date()
      });

      const res = await request(app)
        .get('/api/assessments/results/attachment')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.assessment).toBeDefined();
      expect(res.body.assessment.type).toBe('attachment');
      expect(res.body.interpretation).toBeDefined();
      expect(res.body.interpretation.title).toBe('Secure Attachment');
    });

    it('should return 404 when assessment is not found', async () => {
      mockPrisma.assessment.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/assessments/results/attachment')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Assessment not found');
    });

    it('should return personality interpretation', async () => {
      mockPrisma.assessment.findFirst.mockResolvedValue({
        id: 'a-2',
        type: 'personality',
        score: { type: 'INTJ', dimensions: {}, description: 'Strategic' },
        completedAt: new Date()
      });

      const res = await request(app)
        .get('/api/assessments/results/personality')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.interpretation).toBeDefined();
      expect(res.body.interpretation.title).toContain('Personality Type');
    });

    it('should return wellness_behavior interpretation', async () => {
      mockPrisma.assessment.findFirst.mockResolvedValue({
        id: 'a-3',
        type: 'wellness_behavior',
        score: { score: 75, level: 'high', rawScore: 38, maxScore: 50 },
        completedAt: new Date()
      });

      const res = await request(app)
        .get('/api/assessments/results/wellness_behavior')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.interpretation).toBeDefined();
      expect(res.body.interpretation.title).toBe('Strong Coping Skills');
    });
  });
});
