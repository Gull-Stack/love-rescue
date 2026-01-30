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
const THERAPIST_API_KEY = process.env.THERAPIST_API_KEY; // 'test-therapist-api-key' from setup.js

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

function createMockPrisma() {
  return {
    user: {
      findUnique: jest.fn()
    },
    relationship: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn()
    },
    therapistTask: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    therapist: {
      findMany: jest.fn().mockResolvedValue([])
    },
    consentLog: {
      create: jest.fn().mockResolvedValue({})
    },
    therapistAssignment: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 })
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
  app.use('/api/therapist', require('../../routes/therapist'));
  app.use(errorHandler);
  return app;
}

const TEST_USER_ID = 'user-test-123';
const TEST_USER = {
  id: TEST_USER_ID,
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  subscriptionStatus: 'paid',
  stripeCustomerId: null,
  createdAt: new Date()
};

const TEST_RELATIONSHIP = {
  id: 'rel-123',
  user1Id: TEST_USER_ID,
  user2Id: 'user-partner-456',
  status: 'active',
  sharedConsent: true,
  user1TherapistConsent: true,
  user2TherapistConsent: true
};

describe('Therapist Routes', () => {
  let mockPrisma;
  let app;
  let token;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();
    app = createApp(mockPrisma);
    token = generateToken(TEST_USER_ID);

    // Default: authenticate middleware finds the user
    mockPrisma.user.findUnique.mockResolvedValue(TEST_USER);
  });

  // -------------------------------------------------------------------------
  // POST /api/therapist/tasks/add
  // -------------------------------------------------------------------------
  describe('POST /tasks/add', () => {
    test('creates a task with valid API key (201)', async () => {
      mockPrisma.relationship.findUnique.mockResolvedValue(TEST_RELATIONSHIP);
      mockPrisma.therapistTask.create.mockResolvedValue({
        id: 'task-1',
        taskDescription: 'Practice active listening',
        priority: 'medium',
        dueDate: null,
        createdAt: new Date()
      });

      const res = await request(app)
        .post('/api/therapist/tasks/add')
        .set('x-therapist-api-key', THERAPIST_API_KEY)
        .send({
          relationshipId: 'rel-123',
          taskDescription: 'Practice active listening',
          therapistEmail: 'therapist@example.com'
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Task added successfully');
      expect(res.body.task).toHaveProperty('id', 'task-1');
      expect(res.body.task).toHaveProperty('description', 'Practice active listening');
      expect(mockPrisma.therapistTask.create).toHaveBeenCalledTimes(1);
    });

    test('returns 401 without API key', async () => {
      const res = await request(app)
        .post('/api/therapist/tasks/add')
        .send({
          relationshipId: 'rel-123',
          taskDescription: 'Practice active listening'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Therapist API key required');
    });

    test('returns 403 with wrong API key', async () => {
      const res = await request(app)
        .post('/api/therapist/tasks/add')
        .set('x-therapist-api-key', 'wrong-key')
        .send({
          relationshipId: 'rel-123',
          taskDescription: 'Practice active listening'
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Invalid API key');
    });

    test('returns 400 without taskDescription', async () => {
      const res = await request(app)
        .post('/api/therapist/tasks/add')
        .set('x-therapist-api-key', THERAPIST_API_KEY)
        .send({
          relationshipId: 'rel-123'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Task description required');
    });

    test('returns 404 when relationship not found', async () => {
      mockPrisma.relationship.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/therapist/tasks/add')
        .set('x-therapist-api-key', THERAPIST_API_KEY)
        .send({
          relationshipId: 'nonexistent-rel',
          taskDescription: 'Do something'
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Relationship not found');
    });

    test('returns 403 when no consent (user1TherapistConsent=false)', async () => {
      mockPrisma.relationship.findUnique.mockResolvedValue({
        ...TEST_RELATIONSHIP,
        user1TherapistConsent: false,
        user2TherapistConsent: true
      });

      const res = await request(app)
        .post('/api/therapist/tasks/add')
        .set('x-therapist-api-key', THERAPIST_API_KEY)
        .send({
          relationshipId: 'rel-123',
          taskDescription: 'Practice active listening'
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Both partners must consent to therapist integration');
      expect(res.body.code).toBe('CONSENT_REQUIRED');
    });

    test('finds relationship by userEmail', async () => {
      const emailUser = {
        id: 'user-email-789',
        email: 'partner@example.com'
      };
      mockPrisma.user.findUnique.mockResolvedValue(emailUser);
      mockPrisma.relationship.findFirst.mockResolvedValue(TEST_RELATIONSHIP);
      mockPrisma.therapistTask.create.mockResolvedValue({
        id: 'task-2',
        taskDescription: 'Journal together',
        priority: 'medium',
        dueDate: null,
        createdAt: new Date()
      });

      const res = await request(app)
        .post('/api/therapist/tasks/add')
        .set('x-therapist-api-key', THERAPIST_API_KEY)
        .send({
          userEmail: 'Partner@Example.com',
          taskDescription: 'Journal together'
        });

      expect(res.status).toBe(201);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'partner@example.com' }
      });
      expect(mockPrisma.relationship.findFirst).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/therapist/tasks
  // -------------------------------------------------------------------------
  describe('GET /tasks', () => {
    test('returns all tasks', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(TEST_RELATIONSHIP);
      mockPrisma.therapistTask.findMany.mockResolvedValue([
        {
          id: 'task-1',
          taskDescription: 'Task one',
          notes: 'Some notes',
          dueDate: null,
          completed: false,
          completedAt: null,
          createdAt: new Date()
        },
        {
          id: 'task-2',
          taskDescription: 'Task two',
          notes: null,
          dueDate: new Date(),
          completed: true,
          completedAt: new Date(),
          createdAt: new Date()
        }
      ]);

      const res = await request(app)
        .get('/api/therapist/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.tasks).toHaveLength(2);
      expect(res.body.tasks[0]).toHaveProperty('description', 'Task one');
      expect(res.body.tasks[1]).toHaveProperty('completed', true);
    });

    test('filters by status=pending', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(TEST_RELATIONSHIP);
      mockPrisma.therapistTask.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/therapist/tasks?status=pending')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(mockPrisma.therapistTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            relationshipId: 'rel-123',
            completed: false
          })
        })
      );
    });

    test('filters by status=completed', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(TEST_RELATIONSHIP);
      mockPrisma.therapistTask.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/therapist/tasks?status=completed')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(mockPrisma.therapistTask.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            relationshipId: 'rel-123',
            completed: true
          })
        })
      );
    });

    test('returns 404 when no relationship', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/therapist/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Relationship not found');
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /api/therapist/tasks/:id/complete
  // -------------------------------------------------------------------------
  describe('PATCH /tasks/:id/complete', () => {
    test('marks task as complete', async () => {
      const now = new Date();
      mockPrisma.therapistTask.findUnique.mockResolvedValue({
        id: 'task-1',
        relationship: TEST_RELATIONSHIP
      });
      mockPrisma.therapistTask.update.mockResolvedValue({
        id: 'task-1',
        completed: true,
        completedAt: now
      });

      const res = await request(app)
        .patch('/api/therapist/tasks/task-1/complete')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Task completed');
      expect(res.body.task.completed).toBe(true);
      expect(mockPrisma.therapistTask.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: {
          completed: true,
          completedAt: expect.any(Date)
        }
      });
    });

    test('returns 404 when task not found', async () => {
      mockPrisma.therapistTask.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/therapist/tasks/nonexistent/complete')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Task not found');
    });

    test('returns 403 for unauthorized user', async () => {
      mockPrisma.therapistTask.findUnique.mockResolvedValue({
        id: 'task-1',
        relationship: {
          id: 'rel-other',
          user1Id: 'other-user-1',
          user2Id: 'other-user-2'
        }
      });

      const res = await request(app)
        .patch('/api/therapist/tasks/task-1/complete')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Not authorized');
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/therapist/consent
  // -------------------------------------------------------------------------
  describe('POST /consent', () => {
    test('grants consent', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(TEST_RELATIONSHIP);
      mockPrisma.relationship.update
        .mockResolvedValueOnce({
          ...TEST_RELATIONSHIP,
          user1TherapistConsent: true,
          user2TherapistConsent: true
        })
        .mockResolvedValueOnce({
          ...TEST_RELATIONSHIP,
          sharedConsent: true
        });

      const res = await request(app)
        .post('/api/therapist/consent')
        .set('Authorization', `Bearer ${token}`)
        .send({ consent: true });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Consent granted');
      expect(res.body.consent).toBe(true);
      expect(res.body.bothConsented).toBe(true);
      expect(mockPrisma.relationship.update).toHaveBeenCalledWith({
        where: { id: 'rel-123' },
        data: { user1TherapistConsent: true }
      });
    });

    test('revokes consent', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(TEST_RELATIONSHIP);
      mockPrisma.relationship.update
        .mockResolvedValueOnce({
          ...TEST_RELATIONSHIP,
          user1TherapistConsent: false,
          user2TherapistConsent: true
        })
        .mockResolvedValueOnce({
          ...TEST_RELATIONSHIP,
          sharedConsent: false
        });

      const res = await request(app)
        .post('/api/therapist/consent')
        .set('Authorization', `Bearer ${token}`)
        .send({ consent: false });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Consent revoked');
      expect(res.body.consent).toBe(false);
    });

    test('returns 404 for no relationship', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/therapist/consent')
        .set('Authorization', `Bearer ${token}`)
        .send({ consent: true });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Relationship not found');
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/therapist/consent
  // -------------------------------------------------------------------------
  describe('GET /consent', () => {
    test('returns consent status', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue({
        ...TEST_RELATIONSHIP,
        sharedConsent: true,
        user1TherapistConsent: true,
        user2TherapistConsent: true
      });

      const res = await request(app)
        .get('/api/therapist/consent')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.consent).toBe(true);
      expect(res.body.myConsent).toBe(true);
      expect(res.body.partnerConsent).toBe(true);
      expect(res.body.bothConsented).toBe(true);
    });
  });
});
