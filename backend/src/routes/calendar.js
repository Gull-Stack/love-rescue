const express = require('express');
const { google } = require('googleapis');
const { authenticate, requireSubscription } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Google OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/**
 * GET /api/calendar/auth-url
 * Get Google OAuth URL for calendar authorization
 */
router.get('/auth-url', authenticate, async (req, res, next) => {
  try {
    const scopes = ['https://www.googleapis.com/auth/calendar.events'];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: req.user.id, // Pass user ID for callback
      prompt: 'consent'
    });

    res.json({ authUrl: url });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/calendar/callback
 * Handle Google OAuth callback
 */
router.get('/callback', async (req, res, next) => {
  try {
    const { code, state: userId } = req.query;

    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings?calendar=error`);
    }

    const { tokens } = await oauth2Client.getToken(code);

    // Store tokens securely (in production, encrypt these)
    // For now, store in a token record
    await req.prisma.token.create({
      data: {
        email: userId, // Using userId as identifier
        token: JSON.stringify(tokens),
        type: 'google_calendar',
        expiresAt: new Date(tokens.expiry_date || Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    logger.info('Google Calendar connected', { userId });

    res.redirect(`${process.env.FRONTEND_URL}/settings?calendar=success`);
  } catch (error) {
    logger.error('Calendar callback error', { error: error.message });
    res.redirect(`${process.env.FRONTEND_URL}/settings?calendar=error`);
  }
});

/**
 * POST /api/calendar/sync
 * Sync strategy activities to Google Calendar
 */
router.post('/sync', authenticate, requireSubscription, async (req, res, next) => {
  try {
    // Get stored tokens
    const tokenRecord = await req.prisma.token.findFirst({
      where: {
        email: req.user.id,
        type: 'google_calendar',
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!tokenRecord) {
      return res.status(400).json({
        error: 'Google Calendar not connected',
        code: 'CALENDAR_NOT_CONNECTED'
      });
    }

    const tokens = JSON.parse(tokenRecord.token);
    oauth2Client.setCredentials(tokens);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Get current strategy
    const relationship = await req.prisma.relationship.findFirst({
      where: {
        OR: [
          { user1Id: req.user.id },
          { user2Id: req.user.id }
        ]
      }
    });

    if (!relationship) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    const strategy = await req.prisma.strategy.findFirst({
      where: {
        relationshipId: relationship.id,
        isActive: true
      },
      orderBy: { week: 'asc' }
    });

    if (!strategy) {
      return res.status(404).json({ error: 'No active strategy to sync' });
    }

    // Create calendar events for weekly goals
    const eventsCreated = [];
    const startDate = new Date(strategy.startDate);

    // Add weekly review event
    const weeklyReviewDate = new Date(strategy.endDate);
    weeklyReviewDate.setHours(18, 0, 0, 0);

    const weeklyEvent = {
      summary: `💑 Relationship Check-in - Week ${strategy.week}`,
      description: `Weekly Goals:\n${strategy.weeklyGoals.map(g => `• ${g}`).join('\n')}\n\nFrom Marriage Rescue App`,
      start: {
        dateTime: weeklyReviewDate.toISOString(),
        timeZone: 'America/Los_Angeles'
      },
      end: {
        dateTime: new Date(weeklyReviewDate.getTime() + 30 * 60 * 1000).toISOString(),
        timeZone: 'America/Los_Angeles'
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 },
          { method: 'email', minutes: 1440 }
        ]
      }
    };

    try {
      const createdEvent = await calendar.events.insert({
        calendarId: 'primary',
        resource: weeklyEvent
      });
      eventsCreated.push(createdEvent.data);
    } catch (calError) {
      logger.error('Failed to create calendar event', { error: calError.message });
    }

    // Add a daily reminder for the week
    for (let day = 0; day < 7; day++) {
      const eventDate = new Date(startDate);
      eventDate.setDate(eventDate.getDate() + day);
      eventDate.setHours(9, 0, 0, 0);

      const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][eventDate.getDay()];
      const activities = strategy.dailyActivities[dayName] || [];

      if (activities.length > 0) {
        const dailyEvent = {
          summary: '💕 Daily Relationship Prompt',
          description: activities.map(a => `• ${a}`).join('\n') + '\n\nOpen Marriage Rescue App to log your progress.',
          start: {
            dateTime: eventDate.toISOString(),
            timeZone: 'America/Los_Angeles'
          },
          end: {
            dateTime: new Date(eventDate.getTime() + 15 * 60 * 1000).toISOString(),
            timeZone: 'America/Los_Angeles'
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 0 }
            ]
          }
        };

        try {
          const created = await calendar.events.insert({
            calendarId: 'primary',
            resource: dailyEvent
          });
          eventsCreated.push(created.data);
        } catch (calError) {
          logger.error('Failed to create daily event', { error: calError.message, day });
        }
      }
    }

    logger.info('Calendar synced', {
      userId: req.user.id,
      eventsCreated: eventsCreated.length
    });

    res.json({
      message: 'Calendar synced successfully',
      eventsCreated: eventsCreated.length
    });
  } catch (error) {
    if (error.code === 401) {
      // Token expired, delete and ask to reconnect
      await req.prisma.token.deleteMany({
        where: {
          email: req.user.id,
          type: 'google_calendar'
        }
      });
      return res.status(401).json({
        error: 'Calendar authorization expired, please reconnect',
        code: 'CALENDAR_AUTH_EXPIRED'
      });
    }
    next(error);
  }
});

/**
 * GET /api/calendar/status
 * Check if Google Calendar is connected
 */
router.get('/status', authenticate, async (req, res, next) => {
  try {
    const tokenRecord = await req.prisma.token.findFirst({
      where: {
        email: req.user.id,
        type: 'google_calendar',
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      connected: !!tokenRecord,
      expiresAt: tokenRecord?.expiresAt || null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/calendar/disconnect
 * Disconnect Google Calendar
 */
router.delete('/disconnect', authenticate, async (req, res, next) => {
  try {
    await req.prisma.token.deleteMany({
      where: {
        email: req.user.id,
        type: 'google_calendar'
      }
    });

    logger.info('Calendar disconnected', { userId: req.user.id });

    res.json({ message: 'Calendar disconnected' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
