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
  calculateMatchupScore: jest.fn().mockReturnValue({
    score: 75,
    alignments: [{ area: 'attachment', note: 'Both secure' }],
    misses: [],
    details: {}
  })
}));

const { errorHandler } = require('../../middleware/errorHandler');
const { calculateMatchupScore } = require('../../utils/scoring');

const JWT_SECRET = 'test-jwt-secret-key-for-testing';

function createApp(mockPrisma) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.prisma = mockPrisma;
    next();
  });
  process.env.JWT_SECRET = JWT_SECRET;
  app.use('/api/matchup', require('../../routes/matchup'));
  app.use(errorHandler);
  return app;
}

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

describe('Matchup Routes', () => {
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

  const mockRelationship = {
    id: 'rel-1',
    user1Id: 'user-1',
    user2Id: 'user-2',
    inviteCode: null
  };

  const allRequiredTypes = ['attachment', 'personality', 'wellness_behavior', 'negative_patterns_closeness'];

  function makeAssessments(userId) {
    return allRequiredTypes.map((type, i) => ({
      id: `assessment-${userId}-${i}`,
      userId,
      type,
      score: { mock: true },
      completedAt: new Date()
    }));
  }

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma = {
      user: {
        findUnique: jest.fn()
      },
      relationship: {
        findFirst: jest.fn()
      },
      assessment: {
        findMany: jest.fn()
      },
      matchup: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn()
      }
    };

    app = createApp(mockPrisma);
    token = generateToken('user-1');

    // Default: authenticate middleware finds the user
    mockPrisma.user.findUnique.mockResolvedValue(mockAuthUser);
  });

  // ───────────────────────────────────────────────────────────────
  // POST /api/matchup/generate
  // ───────────────────────────────────────────────────────────────

  describe('POST /api/matchup/generate', () => {
    it('should successfully generate a matchup', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(mockRelationship);
      mockPrisma.assessment.findMany
        .mockResolvedValueOnce(makeAssessments('user-1'))
        .mockResolvedValueOnce(makeAssessments('user-2'));

      const mockMatchup = {
        id: 'matchup-1',
        relationshipId: 'rel-1',
        score: 75,
        alignments: {
          compatible: [{ area: 'attachment', note: 'Both secure' }],
          misses: []
        },
        details: {},
        generatedAt: new Date()
      };
      mockPrisma.matchup.create.mockResolvedValue(mockMatchup);

      const res = await request(app)
        .post('/api/matchup/generate')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Matchup score generated');
      expect(res.body.matchup).toBeDefined();
      expect(res.body.matchup.score).toBe(75);
      expect(res.body.matchup.alignments).toBeDefined();
      expect(calculateMatchupScore).toHaveBeenCalled();
      expect(mockPrisma.matchup.create).toHaveBeenCalled();
    });

    it('should return 404 when no relationship found', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/matchup/generate')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Relationship not found');
    });

    it('should return 400 with PARTNER_REQUIRED when no partner', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue({
        ...mockRelationship,
        user2Id: null
      });

      const res = await request(app)
        .post('/api/matchup/generate')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Partner has not joined yet');
      expect(res.body.code).toBe('PARTNER_REQUIRED');
    });

    it('should return 400 with ASSESSMENTS_INCOMPLETE when assessments missing', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(mockRelationship);
      // User 1 has only attachment
      mockPrisma.assessment.findMany
        .mockResolvedValueOnce([{
          id: 'a-1',
          userId: 'user-1',
          type: 'attachment',
          score: {},
          completedAt: new Date()
        }])
        .mockResolvedValueOnce([]); // User 2 has none

      const res = await request(app)
        .post('/api/matchup/generate')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Both partners must complete all assessments');
      expect(res.body.code).toBe('ASSESSMENTS_INCOMPLETE');
      expect(res.body.user1Missing).toBeDefined();
      expect(res.body.user2Missing).toBeDefined();
    });

    it('should return 403 when subscription is expired', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockAuthUser,
        subscriptionStatus: 'expired'
      });

      const res = await request(app)
        .post('/api/matchup/generate')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('SUBSCRIPTION_EXPIRED');
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .post('/api/matchup/generate');

      expect(res.status).toBe(401);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // GET /api/matchup/current
  // ───────────────────────────────────────────────────────────────

  describe('GET /api/matchup/current', () => {
    it('should return the latest matchup', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(mockRelationship);

      const mockMatchup = {
        id: 'matchup-1',
        relationshipId: 'rel-1',
        score: 75,
        alignments: {
          compatible: [{ area: 'attachment', note: 'Both secure' }],
          misses: [{ area: 'personality', note: 'Different styles' }]
        },
        details: { attachment: { score: 80 } },
        generatedAt: new Date()
      };
      mockPrisma.matchup.findFirst.mockResolvedValue(mockMatchup);

      const res = await request(app)
        .get('/api/matchup/current')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.matchup).toBeDefined();
      expect(res.body.matchup.score).toBe(75);
      expect(res.body.matchup.alignments).toBeDefined();
      expect(res.body.matchup.misses).toBeDefined();
    });

    it('should return 404 with NO_MATCHUP when no matchup exists', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(mockRelationship);
      mockPrisma.matchup.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/matchup/current')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('No matchup score yet');
      expect(res.body.code).toBe('NO_MATCHUP');
    });

    it('should return 404 when no relationship found', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/matchup/current')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Relationship not found');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // GET /api/matchup/history
  // ───────────────────────────────────────────────────────────────

  describe('GET /api/matchup/history', () => {
    it('should return a list of matchups', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(mockRelationship);
      mockPrisma.matchup.findMany.mockResolvedValue([
        { id: 'matchup-2', score: 80, generatedAt: new Date() },
        { id: 'matchup-1', score: 75, generatedAt: new Date(Date.now() - 86400000) }
      ]);

      const res = await request(app)
        .get('/api/matchup/history')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.matchups).toBeDefined();
      expect(res.body.matchups).toHaveLength(2);
      expect(res.body.matchups[0].score).toBe(80);
      expect(res.body.matchups[1].score).toBe(75);
    });

    it('should return empty list when no matchups exist', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(mockRelationship);
      mockPrisma.matchup.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/matchup/history')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.matchups).toBeDefined();
      expect(res.body.matchups).toHaveLength(0);
    });

    it('should return 404 when no relationship found', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/matchup/history')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Relationship not found');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // GET /api/matchup/status
  // ───────────────────────────────────────────────────────────────

  describe('GET /api/matchup/status', () => {
    it('should return status with both partners progress', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue({
        ...mockRelationship,
        user1: { id: 'user-1', firstName: 'John' },
        user2: { id: 'user-2', firstName: 'Jane' }
      });

      // User 1 assessments: all complete
      mockPrisma.assessment.findMany
        .mockResolvedValueOnce(
          allRequiredTypes.map(type => ({ type }))
        )
        // User 2 assessments: only attachment and personality
        .mockResolvedValueOnce([
          { type: 'attachment' },
          { type: 'personality' }
        ]);

      const res = await request(app)
        .get('/api/matchup/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.hasPartner).toBe(true);
      expect(res.body.user1).toBeDefined();
      expect(res.body.user1.completed).toHaveLength(4);
      expect(res.body.user1.pending).toHaveLength(0);
      expect(res.body.user2).toBeDefined();
      expect(res.body.user2.completed).toHaveLength(2);
      expect(res.body.user2.pending).toHaveLength(2);
      expect(res.body.canGenerateMatchup).toBe(false);
    });

    it('should show hasPartner false when no partner', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue({
        id: 'rel-1',
        user1Id: 'user-1',
        user2Id: null,
        user1: { id: 'user-1', firstName: 'John' },
        user2: null
      });

      mockPrisma.assessment.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/matchup/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.hasPartner).toBe(false);
      expect(res.body.user2).toBeNull();
      expect(res.body.canGenerateMatchup).toBeFalsy();
    });

    it('should show canGenerateMatchup true when both complete all assessments', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue({
        ...mockRelationship,
        user1: { id: 'user-1', firstName: 'John' },
        user2: { id: 'user-2', firstName: 'Jane' }
      });

      // Both users have all 4 assessments completed
      mockPrisma.assessment.findMany
        .mockResolvedValueOnce(allRequiredTypes.map(type => ({ type })))
        .mockResolvedValueOnce(allRequiredTypes.map(type => ({ type })));

      const res = await request(app)
        .get('/api/matchup/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.canGenerateMatchup).toBe(true);
      expect(res.body.user1.pending).toHaveLength(0);
      expect(res.body.user2.pending).toHaveLength(0);
    });

    it('should return 404 when no relationship found', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/matchup/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Relationship not found');
    });
  });
});
