const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

jest.mock('../../utils/googleCalendar', () => ({
  getFreeBusy: jest.fn().mockResolvedValue([]),
  createCalendarEventWithMeet: jest.fn().mockResolvedValue({
    eventId: 'evt-123',
    meetLink: 'https://meet.google.com/test',
    htmlLink: 'https://calendar.google.com/test'
  }),
  cancelCalendarEvent: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../../utils/coursePosition', () => ({
  getCoursePosition: jest.fn().mockReturnValue({
    week: 1,
    day: 1,
    courseDay: 1,
    daysSinceStart: 0
  })
}));

const { cancelCalendarEvent } = require('../../utils/googleCalendar');
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
    relationship: {
      findFirst: jest.fn()
    },
    mediator: {
      findUnique: jest.fn()
    },
    meeting: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn()
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
  app.use('/api/meetings', require('../../routes/meetings'));
  app.use(errorHandler);
  return app;
}

const TEST_USER_ID = 'user-test-123';
const PARTNER_USER_ID = 'user-partner-456';

const TEST_USER_PREMIUM = {
  id: TEST_USER_ID,
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  subscriptionStatus: 'premium',
  stripeCustomerId: null,
  createdAt: new Date()
};

const TEST_RELATIONSHIP = {
  id: 'rel-123',
  user1Id: TEST_USER_ID,
  user2Id: PARTNER_USER_ID,
  user1: { id: TEST_USER_ID, email: 'test@example.com', firstName: 'Test' },
  user2: { id: PARTNER_USER_ID, email: 'partner@example.com', firstName: 'Partner' }
};

const TEST_MEDIATOR = {
  id: 'mediator-1',
  name: 'Dr. Smith',
  bio: 'Licensed mediator',
  status: 'active',
  googleCalendarId: 'mediator@calendar.google.com',
  availabilityRules: {
    monday: [{ start: '09:00', end: '17:00' }],
    tuesday: [{ start: '09:00', end: '17:00' }],
    wednesday: [],
    thursday: [{ start: '09:00', end: '17:00' }],
    friday: [{ start: '09:00', end: '12:00' }],
    saturday: [],
    sunday: []
  },
  rate: 50
};

describe('Meetings Routes', () => {
  let mockPrisma;
  let app;
  let token;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();
    app = createApp(mockPrisma);
    token = generateToken(TEST_USER_ID);

    // Default: authenticate middleware finds the premium user
    mockPrisma.user.findUnique.mockResolvedValue(TEST_USER_PREMIUM);
  });

  // -------------------------------------------------------------------------
  // POST /api/meetings/check-availability
  // -------------------------------------------------------------------------
  describe('POST /check-availability', () => {
    test('returns available slots', async () => {
      mockPrisma.mediator.findUnique.mockResolvedValue(TEST_MEDIATOR);

      // Use a future Monday date
      const futureMonday = new Date();
      futureMonday.setDate(futureMonday.getDate() + ((1 + 7 - futureMonday.getDay()) % 7 || 7) + 7);
      const dateStr = futureMonday.toISOString().split('T')[0];

      const res = await request(app)
        .post('/api/meetings/check-availability')
        .set('Authorization', `Bearer ${token}`)
        .send({ mediatorId: 'mediator-1', date: dateStr });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('slots');
      expect(Array.isArray(res.body.slots)).toBe(true);
      // Monday 09:00-17:00 = 16 half-hour slots
      expect(res.body.slots.length).toBeGreaterThan(0);
    });

    test('returns empty slots for unavailable day', async () => {
      // Create a mediator with ALL days having empty availability
      const mediatorNoAvailability = {
        ...TEST_MEDIATOR,
        availabilityRules: {
          sunday: [],
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: []
        }
      };
      mockPrisma.mediator.findUnique.mockResolvedValue(mediatorNoAvailability);

      // Use any future date — all days are unavailable
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14);
      const dateStr = futureDate.toISOString().split('T')[0];

      const res = await request(app)
        .post('/api/meetings/check-availability')
        .set('Authorization', `Bearer ${token}`)
        .send({ mediatorId: 'mediator-1', date: dateStr });

      expect(res.status).toBe(200);
      expect(res.body.slots).toEqual([]);
      expect(res.body.message).toBe('Mediator is not available on this day');
    });

    test('requires premium subscription', async () => {
      const nonPremiumUser = { ...TEST_USER_PREMIUM, subscriptionStatus: 'paid' };
      mockPrisma.user.findUnique.mockResolvedValue(nonPremiumUser);

      const res = await request(app)
        .post('/api/meetings/check-availability')
        .set('Authorization', `Bearer ${token}`)
        .send({ mediatorId: 'mediator-1', date: '2026-03-15' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PREMIUM_REQUIRED');
    });

    test('returns 400 without mediatorId or date', async () => {
      const res = await request(app)
        .post('/api/meetings/check-availability')
        .set('Authorization', `Bearer ${token}`)
        .send({ mediatorId: 'mediator-1' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('mediatorId and date are required');
    });

    test('returns 404 for inactive mediator', async () => {
      mockPrisma.mediator.findUnique.mockResolvedValue({
        ...TEST_MEDIATOR,
        status: 'inactive'
      });

      const res = await request(app)
        .post('/api/meetings/check-availability')
        .set('Authorization', `Bearer ${token}`)
        .send({ mediatorId: 'mediator-1', date: '2026-03-15' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Mediator not found or inactive');
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/meetings/schedule
  // -------------------------------------------------------------------------
  describe('POST /schedule', () => {
    test('creates meeting with Meet link', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(TEST_RELATIONSHIP);
      mockPrisma.meeting.findUnique.mockResolvedValue(null); // No existing meeting
      mockPrisma.mediator.findUnique.mockResolvedValue(TEST_MEDIATOR);
      mockPrisma.meeting.create.mockResolvedValue({
        id: 'meeting-1',
        relationshipId: 'rel-123',
        mediatorId: 'mediator-1',
        scheduledAt: new Date('2026-03-16T10:00:00Z'),
        duration: 30,
        meetLink: 'https://meet.google.com/test',
        calendarEventId: 'evt-123',
        status: 'scheduled',
        week: 1,
        createdBy: TEST_USER_ID,
        partnerConsent: false,
        mediator: { name: 'Dr. Smith', bio: 'Licensed mediator' }
      });

      const res = await request(app)
        .post('/api/meetings/schedule')
        .set('Authorization', `Bearer ${token}`)
        .send({
          mediatorId: 'mediator-1',
          startTime: '2026-03-16T10:00:00Z'
        });

      expect(res.status).toBe(200);
      expect(res.body.meeting).toHaveProperty('id', 'meeting-1');
      expect(res.body.meeting).toHaveProperty('meetLink', 'https://meet.google.com/test');
      expect(res.body.meeting).toHaveProperty('status', 'scheduled');
      expect(mockPrisma.meeting.create).toHaveBeenCalledTimes(1);
    });

    test('returns 400 without partner (user2Id null)', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue({
        ...TEST_RELATIONSHIP,
        user2Id: null,
        user2: null
      });

      const res = await request(app)
        .post('/api/meetings/schedule')
        .set('Authorization', `Bearer ${token}`)
        .send({
          mediatorId: 'mediator-1',
          startTime: '2026-03-16T10:00:00Z'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Both partners');
    });

    test('returns 400 for existing meeting this week', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(TEST_RELATIONSHIP);
      mockPrisma.meeting.findUnique.mockResolvedValue({
        id: 'meeting-existing',
        status: 'scheduled'
      });

      const res = await request(app)
        .post('/api/meetings/schedule')
        .set('Authorization', `Bearer ${token}`)
        .send({
          mediatorId: 'mediator-1',
          startTime: '2026-03-16T10:00:00Z'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already scheduled');
    });

    test('returns 404 for inactive mediator', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(TEST_RELATIONSHIP);
      mockPrisma.meeting.findUnique.mockResolvedValue(null);
      mockPrisma.mediator.findUnique.mockResolvedValue({
        ...TEST_MEDIATOR,
        status: 'inactive'
      });

      const res = await request(app)
        .post('/api/meetings/schedule')
        .set('Authorization', `Bearer ${token}`)
        .send({
          mediatorId: 'mediator-1',
          startTime: '2026-03-16T10:00:00Z'
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Mediator not found or inactive');
    });

    test('requires premium subscription', async () => {
      const nonPremiumUser = { ...TEST_USER_PREMIUM, subscriptionStatus: 'trial' };
      mockPrisma.user.findUnique.mockResolvedValue(nonPremiumUser);

      const res = await request(app)
        .post('/api/meetings/schedule')
        .set('Authorization', `Bearer ${token}`)
        .send({
          mediatorId: 'mediator-1',
          startTime: '2026-03-16T10:00:00Z'
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PREMIUM_REQUIRED');
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/meetings/upcoming
  // -------------------------------------------------------------------------
  describe('GET /upcoming', () => {
    test('returns upcoming meetings', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(TEST_RELATIONSHIP);
      mockPrisma.meeting.findMany.mockResolvedValue([
        {
          id: 'meeting-1',
          scheduledAt: new Date('2026-03-20T10:00:00Z'),
          duration: 30,
          meetLink: 'https://meet.google.com/test',
          status: 'scheduled',
          week: 1,
          mediator: { id: 'mediator-1', name: 'Dr. Smith', bio: 'Licensed mediator' },
          createdBy: TEST_USER_ID,
          partnerConsent: false
        }
      ]);

      const res = await request(app)
        .get('/api/meetings/upcoming')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.meetings).toHaveLength(1);
      expect(res.body.meetings[0]).toHaveProperty('id', 'meeting-1');
      expect(res.body.meetings[0]).toHaveProperty('meetLink');
      expect(res.body.meetings[0]).toHaveProperty('isCreator', true);
    });

    test('returns empty array when no relationship', async () => {
      mockPrisma.relationship.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/meetings/upcoming')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.meetings).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/meetings/:id/cancel
  // -------------------------------------------------------------------------
  describe('POST /:id/cancel', () => {
    test('cancels meeting', async () => {
      mockPrisma.meeting.findUnique.mockResolvedValue({
        id: 'meeting-1',
        status: 'scheduled',
        calendarEventId: 'evt-123',
        relationship: {
          user1Id: TEST_USER_ID,
          user2Id: PARTNER_USER_ID
        },
        mediator: {
          googleCalendarId: 'mediator@calendar.google.com'
        }
      });
      mockPrisma.meeting.update.mockResolvedValue({
        id: 'meeting-1',
        status: 'cancelled'
      });

      const res = await request(app)
        .post('/api/meetings/meeting-1/cancel')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.meeting.status).toBe('cancelled');
      expect(mockPrisma.meeting.update).toHaveBeenCalledWith({
        where: { id: 'meeting-1' },
        data: { status: 'cancelled' }
      });
    });

    test('returns 404 for missing meeting', async () => {
      mockPrisma.meeting.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/meetings/nonexistent/cancel')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Meeting not found');
    });

    test('returns 403 for unauthorized user', async () => {
      mockPrisma.meeting.findUnique.mockResolvedValue({
        id: 'meeting-1',
        status: 'scheduled',
        relationship: {
          user1Id: 'other-user-1',
          user2Id: 'other-user-2'
        },
        mediator: {}
      });

      const res = await request(app)
        .post('/api/meetings/meeting-1/cancel')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Not authorized');
    });

    test('returns 400 for non-scheduled meeting', async () => {
      mockPrisma.meeting.findUnique.mockResolvedValue({
        id: 'meeting-1',
        status: 'completed',
        relationship: {
          user1Id: TEST_USER_ID,
          user2Id: PARTNER_USER_ID
        },
        mediator: {}
      });

      const res = await request(app)
        .post('/api/meetings/meeting-1/cancel')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Meeting cannot be cancelled');
    });

    test('cancels calendar event when calendarEventId exists', async () => {
      mockPrisma.meeting.findUnique.mockResolvedValue({
        id: 'meeting-1',
        status: 'scheduled',
        calendarEventId: 'evt-456',
        relationship: {
          user1Id: TEST_USER_ID,
          user2Id: PARTNER_USER_ID
        },
        mediator: {
          googleCalendarId: 'mediator@calendar.google.com'
        }
      });
      mockPrisma.meeting.update.mockResolvedValue({
        id: 'meeting-1',
        status: 'cancelled'
      });

      const res = await request(app)
        .post('/api/meetings/meeting-1/cancel')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(cancelCalendarEvent).toHaveBeenCalledWith(
        'mediator@calendar.google.com',
        'evt-456'
      );
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/meetings/:id/consent
  // -------------------------------------------------------------------------
  describe('POST /:id/consent', () => {
    test('records partner consent', async () => {
      // Use partner token (non-creator)
      const partnerToken = generateToken(PARTNER_USER_ID);
      const partnerUser = {
        ...TEST_USER_PREMIUM,
        id: PARTNER_USER_ID,
        email: 'partner@example.com'
      };
      mockPrisma.user.findUnique.mockResolvedValue(partnerUser);

      mockPrisma.meeting.findUnique.mockResolvedValue({
        id: 'meeting-1',
        status: 'scheduled',
        createdBy: TEST_USER_ID,
        partnerConsent: false,
        relationship: {
          user1Id: TEST_USER_ID,
          user2Id: PARTNER_USER_ID
        }
      });
      mockPrisma.meeting.update.mockResolvedValue({
        id: 'meeting-1',
        partnerConsent: true
      });

      const res = await request(app)
        .post('/api/meetings/meeting-1/consent')
        .set('Authorization', `Bearer ${partnerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.meeting.partnerConsent).toBe(true);
      expect(mockPrisma.meeting.update).toHaveBeenCalledWith({
        where: { id: 'meeting-1' },
        data: { partnerConsent: true }
      });
    });

    test('returns 400 when creator tries to consent', async () => {
      mockPrisma.meeting.findUnique.mockResolvedValue({
        id: 'meeting-1',
        status: 'scheduled',
        createdBy: TEST_USER_ID,
        relationship: {
          user1Id: TEST_USER_ID,
          user2Id: PARTNER_USER_ID
        }
      });

      const res = await request(app)
        .post('/api/meetings/meeting-1/consent')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Only the non-creator partner can consent');
    });

    test('returns 404 for missing meeting', async () => {
      mockPrisma.meeting.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/meetings/nonexistent/consent')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Meeting not found');
    });

    test('returns 403 for unauthorized user', async () => {
      mockPrisma.meeting.findUnique.mockResolvedValue({
        id: 'meeting-1',
        status: 'scheduled',
        createdBy: 'some-other-creator',
        relationship: {
          user1Id: 'other-user-1',
          user2Id: 'other-user-2'
        }
      });

      const res = await request(app)
        .post('/api/meetings/meeting-1/consent')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Not authorized');
    });
  });
});
