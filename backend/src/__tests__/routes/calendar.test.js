const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock googleapis before importing routes (module-level usage in calendar.js)
const mockOAuth2 = {
  generateAuthUrl: jest.fn(),
  getToken: jest.fn(),
  setCredentials: jest.fn()
};
const mockCalendar = {
  events: {
    insert: jest.fn(),
    delete: jest.fn()
  }
};
jest.mock('googleapis', () => ({
  google: {
    auth: { OAuth2: jest.fn(() => mockOAuth2) },
    calendar: jest.fn(() => mockCalendar)
  }
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

const { errorHandler } = require('../../middleware/errorHandler');

const JWT_SECRET = process.env.JWT_SECRET; // 'test-jwt-secret-key-for-testing' from setup.js

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

function createMockPrisma() {
  return {
    user: {
      findUnique: jest.fn()
    },
    token: {
      create: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn()
    },
    relationship: {
      findFirst: jest.fn()
    },
    strategy: {
      findFirst: jest.fn()
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
  app.use('/api/calendar', require('../../routes/calendar'));
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

describe('Calendar Routes', () => {
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
  // GET /api/calendar/auth-url
  // -------------------------------------------------------------------------
  describe('GET /auth-url', () => {
    test('returns auth URL when configured', async () => {
      mockOAuth2.generateAuthUrl.mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth?client_id=test');

      const res = await request(app)
        .get('/api/calendar/auth-url')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('authUrl');
      expect(res.body.authUrl).toContain('https://accounts.google.com');
      expect(mockOAuth2.generateAuthUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          access_type: 'offline',
          prompt: 'consent'
        })
      );
    });

    test('returns 503 when not configured (placeholder client ID)', async () => {
      // Temporarily override GOOGLE_CLIENT_ID to a placeholder
      const originalClientId = process.env.GOOGLE_CLIENT_ID;
      process.env.GOOGLE_CLIENT_ID = 'placeholder';

      // Need to re-import the route to pick up the env change
      // Since isCalendarConfigured reads from env each call, we can test it
      // by creating a fresh app with the module cache
      // The isCalendarConfigured() function reads process.env at call time
      const res = await request(app)
        .get('/api/calendar/auth-url')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(503);
      expect(res.body.error).toContain('not yet configured');
      expect(res.body.code).toBe('CALENDAR_NOT_CONFIGURED');

      // Restore
      process.env.GOOGLE_CLIENT_ID = originalClientId;
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/calendar/callback
  // -------------------------------------------------------------------------
  describe('GET /callback', () => {
    test('stores tokens and redirects to success', async () => {
      const mockTokens = {
        access_token: 'access-123',
        refresh_token: 'refresh-456',
        expiry_date: Date.now() + 3600000
      };
      mockOAuth2.getToken.mockResolvedValue({ tokens: mockTokens });
      mockPrisma.token.create.mockResolvedValue({ id: 'token-1' });

      const res = await request(app)
        .get('/api/calendar/callback')
        .query({ code: 'auth-code-xyz', state: TEST_USER_ID });

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('calendar=success');
      expect(mockOAuth2.getToken).toHaveBeenCalledWith('auth-code-xyz');
      expect(mockPrisma.token.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: TEST_USER_ID,
          type: 'google_calendar',
          token: JSON.stringify(mockTokens)
        })
      });
    });

    test('redirects to error without code', async () => {
      const res = await request(app)
        .get('/api/calendar/callback')
        .query({ state: TEST_USER_ID });

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('calendar=error');
      expect(mockOAuth2.getToken).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/calendar/sync
  // -------------------------------------------------------------------------
  describe('POST /sync', () => {
    const mockTokenRecord = {
      id: 'token-rec-1',
      email: TEST_USER_ID,
      type: 'google_calendar',
      token: JSON.stringify({
        access_token: 'access-123',
        refresh_token: 'refresh-456',
        expiry_date: Date.now() + 3600000
      }),
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date()
    };

    const mockRelationship = {
      id: 'rel-123',
      user1Id: TEST_USER_ID,
      user2Id: 'partner-456'
    };

    const mockStrategy = {
      id: 'strat-1',
      relationshipId: 'rel-123',
      isActive: true,
      week: 1,
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 86400000),
      weeklyGoals: ['Communicate daily', 'Practice gratitude'],
      dailyActivities: {
        monday: ['Active listening exercise'],
        tuesday: ['Gratitude journaling'],
        wednesday: [],
        thursday: ['Date night planning'],
        friday: [],
        saturday: [],
        sunday: ['Weekly review']
      }
    };

    test('syncs calendar events', async () => {
      mockPrisma.token.findFirst.mockResolvedValue(mockTokenRecord);
      mockPrisma.relationship.findFirst.mockResolvedValue(mockRelationship);
      mockPrisma.strategy.findFirst.mockResolvedValue(mockStrategy);
      mockCalendar.events.insert.mockResolvedValue({ data: { id: 'evt-1' } });

      const res = await request(app)
        .post('/api/calendar/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Calendar synced successfully');
      expect(res.body).toHaveProperty('eventsCreated');
      expect(mockOAuth2.setCredentials).toHaveBeenCalled();
    });

    test('returns 400 when not connected (no token)', async () => {
      mockPrisma.token.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/calendar/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Google Calendar not connected');
      expect(res.body.code).toBe('CALENDAR_NOT_CONNECTED');
    });

    test('returns 404 for no relationship', async () => {
      mockPrisma.token.findFirst.mockResolvedValue(mockTokenRecord);
      mockPrisma.relationship.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/calendar/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Relationship not found');
    });

    test('returns 404 when no active strategy', async () => {
      mockPrisma.token.findFirst.mockResolvedValue(mockTokenRecord);
      mockPrisma.relationship.findFirst.mockResolvedValue(mockRelationship);
      mockPrisma.strategy.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/calendar/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('No active strategy to sync');
    });

    test('requires subscription (rejects expired)', async () => {
      const expiredUser = { ...TEST_USER, subscriptionStatus: 'expired' };
      mockPrisma.user.findUnique.mockResolvedValue(expiredUser);

      const res = await request(app)
        .post('/api/calendar/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('SUBSCRIPTION_EXPIRED');
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/calendar/status
  // -------------------------------------------------------------------------
  describe('GET /status', () => {
    test('returns connected=true when token exists', async () => {
      mockPrisma.token.findFirst.mockResolvedValue({
        id: 'token-1',
        expiresAt: new Date(Date.now() + 86400000)
      });

      const res = await request(app)
        .get('/api/calendar/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.connected).toBe(true);
      expect(res.body).toHaveProperty('expiresAt');
    });

    test('returns connected=false when no token', async () => {
      mockPrisma.token.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/calendar/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.connected).toBe(false);
      expect(res.body.expiresAt).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /api/calendar/disconnect
  // -------------------------------------------------------------------------
  describe('DELETE /disconnect', () => {
    test('deletes tokens and returns 200', async () => {
      mockPrisma.token.deleteMany.mockResolvedValue({ count: 1 });

      const res = await request(app)
        .delete('/api/calendar/disconnect')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Calendar disconnected');
      expect(mockPrisma.token.deleteMany).toHaveBeenCalledWith({
        where: {
          email: TEST_USER_ID,
          type: 'google_calendar'
        }
      });
    });
  });
});
