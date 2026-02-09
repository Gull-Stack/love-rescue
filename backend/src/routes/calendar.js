const express = require('express');
const crypto = require('crypto');
const { google } = require('googleapis');
const { authenticate, requireSubscription } = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/encryption');
const logger = require('../utils/logger');

const router = express.Router();

// Check if Google OAuth credentials are properly configured
function isCalendarConfigured() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const placeholders = ['placeholder', 'your-google-client-id', 'your-google-client-secret', ''];
  return (
    clientId &&
    clientSecret &&
    !placeholders.includes(clientId) &&
    !placeholders.includes(clientSecret)
  );
}

// Google OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/**
 * GET /api/calendar/auth-url
 * Get Google OAuth URL for calendar authorization
 * CRIT-03: Uses a signed CSRF token in the state parameter instead of raw userId
 */
router.get('/auth-url', authenticate, async (req, res, next) => {
  try {
    if (!isCalendarConfigured()) {
      return res.status(503).json({
        error: 'Google Calendar integration is not yet configured. Please set up Google Cloud OAuth credentials.',
        code: 'CALENDAR_NOT_CONFIGURED'
      });
    }

    const scopes = ['https://www.googleapis.com/auth/calendar.events'];

    // Generate a signed CSRF token and store it mapped to the userId
    const csrfToken = crypto.randomBytes(32).toString('hex');

    await req.prisma.token.create({
      data: {
        email: req.user.id, // Store userId for lookup on callback
        token: csrfToken,
        type: 'calendar_oauth_csrf',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minute expiry
      }
    });

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: csrfToken, // Pass CSRF token, not raw userId
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
 * CRIT-03: Verifies CSRF token from state parameter to extract userId securely
 */
router.get('/callback', async (req, res, next) => {
  try {
    const { code, state: csrfToken } = req.query;

    if (!code || !csrfToken) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings?calendar=error`);
    }

    // Verify the CSRF token exists, hasn't expired, and hasn't been used
    const tokenRecord = await req.prisma.token.findFirst({
      where: {
        token: csrfToken,
        type: 'calendar_oauth_csrf',
        usedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    if (!tokenRecord) {
      logger.warn('Invalid or expired calendar OAuth CSRF token');
      return res.redirect(`${process.env.FRONTEND_URL}/settings?calendar=error`);
    }

    const userId = tokenRecord.email; // userId was stored in email field

    // Delete the CSRF token (single-use)
    await req.prisma.token.delete({ where: { id: tokenRecord.id } });

    const { tokens } = await oauth2Client.getToken(code);

    // CRIT-04: Encrypt tokens before storing
    const encryptedTokens = encrypt(JSON.stringify(tokens));

    // Store encrypted tokens
    await req.prisma.token.create({
      data: {
        email: userId,
        token: encryptedTokens,
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

    // CRIT-04: Decrypt tokens before use
    const tokens = JSON.parse(decrypt(tokenRecord.token));
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
      description: `Weekly Goals:\n${strategy.weeklyGoals.map(g => `• ${g}`).join('\n')}\n\nFrom Love Rescue App`,
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
          description: activities.map(a => `• ${a}`).join('\n') + '\n\nOpen Love Rescue App to log your progress.',
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
      expiresAt: tokenRecord?.expiresAt || null,
      calendarAvailable: isCalendarConfigured()
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
