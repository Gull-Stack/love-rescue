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
  app.use('/api/videos', require('../../routes/videos'));
  app.use(errorHandler);
  return app;
}

describe('Videos Routes', () => {
  let mockPrisma;
  let app;
  let token;
  const userId = 'user-video-1';
  const mockUser = {
    id: userId,
    email: 'video@example.com',
    firstName: 'Video',
    lastName: 'Viewer',
    subscriptionStatus: 'paid',
    stripeCustomerId: 'cus_vid',
    createdAt: new Date('2025-01-01')
  };

  beforeEach(() => {
    token = generateToken(userId);
    getCoursePosition.mockReturnValue({ week: 1, day: 1, courseDay: 1, daysSinceStart: 0 });

    mockPrisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(mockUser)
      },
      dailyVideo: {
        findUnique: jest.fn()
      },
      videoCompletion: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn()
      }
    };

    app = createApp(mockPrisma);
  });

  // -------------------------------------------------------------------------
  // GET /api/videos/daily
  // -------------------------------------------------------------------------
  describe('GET /daily', () => {
    test('returns video with completion status', async () => {
      const mockVideo = {
        id: 'video-1',
        week: 1,
        day: 1,
        youtubeId: 'abc123',
        title: 'Day 1 - Building Connection',
        description: 'Learn the foundations of connection.'
      };

      mockPrisma.dailyVideo.findUnique.mockResolvedValue(mockVideo);
      mockPrisma.videoCompletion.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/videos/daily')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.video).toBeDefined();
      expect(res.body.video.id).toBe('video-1');
      expect(res.body.video.youtubeId).toBe('abc123');
      expect(res.body.video.title).toBe('Day 1 - Building Connection');
      expect(res.body.video.description).toBe('Learn the foundations of connection.');
      expect(res.body.position).toEqual({ week: 1, day: 1, courseDay: 1, daysSinceStart: 0 });
      expect(res.body.completed).toBe(false);
    });

    test('returns null video with fallback text when no video found', async () => {
      mockPrisma.dailyVideo.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/videos/daily')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.video).toBeNull();
      expect(res.body.completed).toBe(false);
      expect(res.body.fallbackText).toBe('No video available for today. Check back tomorrow!');
      expect(res.body.position).toEqual({ week: 1, day: 1, courseDay: 1, daysSinceStart: 0 });
    });

    test('marks as completed when videoCompletion exists', async () => {
      const mockVideo = {
        id: 'video-2',
        week: 1,
        day: 1,
        youtubeId: 'def456',
        title: 'Day 1 Video',
        description: 'Description'
      };

      mockPrisma.dailyVideo.findUnique.mockResolvedValue(mockVideo);
      mockPrisma.videoCompletion.findUnique.mockResolvedValue({
        id: 'comp-1',
        userId,
        videoId: 'video-2',
        watchedAt: new Date()
      });

      const res = await request(app)
        .get('/api/videos/daily')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.completed).toBe(true);
      expect(res.body.video.id).toBe('video-2');
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/videos/complete
  // -------------------------------------------------------------------------
  describe('POST /complete', () => {
    test('marks video complete idempotently via upsert', async () => {
      const mockVideo = {
        id: 'video-complete-1',
        week: 1,
        day: 1,
        youtubeId: 'ghi789',
        title: 'Complete Me'
      };
      const watchedAt = new Date();

      mockPrisma.dailyVideo.findUnique.mockResolvedValue(mockVideo);
      mockPrisma.videoCompletion.upsert.mockResolvedValue({
        id: 'comp-new',
        userId,
        videoId: 'video-complete-1',
        watchedAt
      });

      const res = await request(app)
        .post('/api/videos/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({ videoId: 'video-complete-1' });

      expect(res.status).toBe(200);
      expect(res.body.completed).toBe(true);
      expect(res.body.watchedAt).toBeDefined();
      expect(mockPrisma.videoCompletion.upsert).toHaveBeenCalledWith({
        where: { userId_videoId: { userId, videoId: 'video-complete-1' } },
        update: {},
        create: { userId, videoId: 'video-complete-1' }
      });
    });

    test('returns 400 without videoId', async () => {
      const res = await request(app)
        .post('/api/videos/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('videoId is required');
    });

    test('returns 404 for nonexistent video', async () => {
      mockPrisma.dailyVideo.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/videos/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({ videoId: 'nonexistent-video' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Video not found');
    });

    test('requires subscription - returns 403 for expired', async () => {
      const expiredUser = { ...mockUser, subscriptionStatus: 'expired' };
      mockPrisma.user.findUnique.mockResolvedValue(expiredUser);

      const res = await request(app)
        .post('/api/videos/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({ videoId: 'video-1' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('SUBSCRIPTION_EXPIRED');
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/videos/streak
  // -------------------------------------------------------------------------
  describe('GET /streak', () => {
    test('returns streak count and total completed', async () => {
      getCoursePosition.mockReturnValue({ week: 1, day: 3, courseDay: 3, daysSinceStart: 2 });

      const completions = [
        { id: 'c3', userId, videoId: 'v3', watchedAt: new Date(), video: { week: 1, day: 3 } },
        { id: 'c2', userId, videoId: 'v2', watchedAt: new Date(), video: { week: 1, day: 2 } },
        { id: 'c1', userId, videoId: 'v1', watchedAt: new Date(), video: { week: 1, day: 1 } }
      ];

      mockPrisma.videoCompletion.findMany.mockResolvedValue(completions);

      const res = await request(app)
        .get('/api/videos/streak')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.streak).toBe(3);
      expect(res.body.totalCompleted).toBe(3);
    });

    test('returns 0 streak when no completions', async () => {
      mockPrisma.videoCompletion.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/videos/streak')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.streak).toBe(0);
      expect(res.body.totalCompleted).toBe(0);
    });

    test('calculates consecutive days correctly with broken streak', async () => {
      getCoursePosition.mockReturnValue({ week: 1, day: 5, courseDay: 5, daysSinceStart: 4 });

      // Completed days 5, 4, but NOT 3 -- so streak should be 2
      const completions = [
        { id: 'c5', userId, videoId: 'v5', watchedAt: new Date(), video: { week: 1, day: 5 } },
        { id: 'c4', userId, videoId: 'v4', watchedAt: new Date(), video: { week: 1, day: 4 } },
        // Day 3 is missing
        { id: 'c1', userId, videoId: 'v1', watchedAt: new Date(), video: { week: 1, day: 1 } }
      ];

      mockPrisma.videoCompletion.findMany.mockResolvedValue(completions);

      const res = await request(app)
        .get('/api/videos/streak')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.streak).toBe(2);
      expect(res.body.totalCompleted).toBe(3);
    });
  });
});
