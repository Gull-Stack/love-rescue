const { google } = require('googleapis');
const logger = require('./logger');

/**
 * Get authenticated Google Calendar client using service account credentials.
 */
function getCalendarClient() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    null,
    (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '').replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/calendar']
  );

  return google.calendar({ version: 'v3', auth });
}

/**
 * Query Google Calendar FreeBusy API to find busy times.
 *
 * @param {string} calendarId - Google Calendar ID to check
 * @param {string} timeMin - ISO start time
 * @param {string} timeMax - ISO end time
 * @returns {Array<{ start: string, end: string }>} Array of busy periods
 */
async function getFreeBusy(calendarId, timeMin, timeMax) {
  const calendar = getCalendarClient();

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin,
      timeMax,
      items: [{ id: calendarId }],
    },
  });

  const busySlots = response.data.calendars?.[calendarId]?.busy || [];
  return busySlots;
}

/**
 * Create a Google Calendar event with auto-generated Google Meet link.
 *
 * @param {Object} params
 * @param {string} params.calendarId - Mediator's calendar ID
 * @param {string} params.summary - Event title
 * @param {string} params.description - Event description
 * @param {string} params.startTime - ISO start time
 * @param {string} params.endTime - ISO end time
 * @param {string[]} params.attendees - Array of attendee email addresses
 * @returns {{ eventId: string, meetLink: string, htmlLink: string }}
 */
async function createCalendarEventWithMeet({ calendarId, summary, description, startTime, endTime, attendees = [] }) {
  const calendar = getCalendarClient();

  const event = {
    summary,
    description,
    start: { dateTime: startTime, timeZone: 'UTC' },
    end: { dateTime: endTime, timeZone: 'UTC' },
    attendees: attendees.map((email) => ({ email })),
    conferenceData: {
      createRequest: {
        requestId: `meet-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 60 },
        { method: 'popup', minutes: 15 },
      ],
    },
  };

  const response = await calendar.events.insert({
    calendarId,
    requestBody: event,
    conferenceDataVersion: 1,
    sendUpdates: 'all',
  });

  const meetLink = response.data.hangoutLink || response.data.conferenceData?.entryPoints?.[0]?.uri || null;

  logger.info('Calendar event created', {
    eventId: response.data.id,
    meetLink,
    calendarId,
  });

  return {
    eventId: response.data.id,
    meetLink,
    htmlLink: response.data.htmlLink,
  };
}

/**
 * Cancel (delete) a Google Calendar event.
 *
 * @param {string} calendarId - Calendar ID
 * @param {string} eventId - Event ID to cancel
 */
async function cancelCalendarEvent(calendarId, eventId) {
  const calendar = getCalendarClient();

  await calendar.events.delete({
    calendarId,
    eventId,
    sendUpdates: 'all',
  });

  logger.info('Calendar event cancelled', { eventId, calendarId });
}

module.exports = { getFreeBusy, createCalendarEventWithMeet, cancelCalendarEvent };
