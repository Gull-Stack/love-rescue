const express = require('express');
const { authenticate, requirePremium, requireSubscription } = require('../middleware/auth');
const { getFreeBusy, createCalendarEventWithMeet, cancelCalendarEvent } = require('../utils/googleCalendar');
const { getCoursePosition } = require('../utils/coursePosition');
const logger = require('../utils/logger');

const router = express.Router();

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Helper: find user's relationship
 */
async function findUserRelationship(prisma, userId) {
  return prisma.relationship.findFirst({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
    },
    include: {
      user1: { select: { id: true, email: true, firstName: true } },
      user2: { select: { id: true, email: true, firstName: true } },
    },
  });
}

/**
 * POST /api/meetings/check-availability
 * Check mediator availability for a given date
 */
router.post('/check-availability', authenticate, requirePremium, async (req, res, next) => {
  try {
    const { mediatorId, date } = req.body;

    if (!mediatorId || !date) {
      return res.status(400).json({ error: 'mediatorId and date are required' });
    }

    const mediator = await req.prisma.mediator.findUnique({ where: { id: mediatorId } });
    if (!mediator || mediator.status !== 'active') {
      return res.status(404).json({ error: 'Mediator not found or inactive' });
    }

    // Parse date and get day of week
    const dateObj = new Date(date);
    const dayName = DAYS_OF_WEEK[dateObj.getUTCDay()];
    const rules = mediator.availabilityRules[dayName];

    if (!rules || rules.length === 0) {
      return res.json({ slots: [], message: 'Mediator is not available on this day' });
    }

    // Generate 30-minute slots from availability rules
    const allSlots = [];
    for (const rule of rules) {
      const [startHour, startMin] = rule.start.split(':').map(Number);
      const [endHour, endMin] = rule.end.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      for (let m = startMinutes; m + 30 <= endMinutes; m += 30) {
        const slotStart = new Date(date);
        slotStart.setUTCHours(Math.floor(m / 60), m % 60, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);
        allSlots.push({ start: slotStart.toISOString(), end: slotEnd.toISOString() });
      }
    }

    // Filter out past slots
    const now = new Date();
    const futureSlots = allSlots.filter((s) => new Date(s.start) > now);

    if (futureSlots.length === 0) {
      return res.json({ slots: [] });
    }

    // Check Google Calendar for busy times
    let availableSlots = futureSlots;
    try {
      const timeMin = futureSlots[0].start;
      const timeMax = futureSlots[futureSlots.length - 1].end;
      const busySlots = await getFreeBusy(mediator.googleCalendarId, timeMin, timeMax);

      availableSlots = futureSlots.filter((slot) => {
        const slotStart = new Date(slot.start).getTime();
        const slotEnd = new Date(slot.end).getTime();
        return !busySlots.some((busy) => {
          const busyStart = new Date(busy.start).getTime();
          const busyEnd = new Date(busy.end).getTime();
          return slotStart < busyEnd && slotEnd > busyStart;
        });
      });
    } catch (calendarError) {
      // If Google Calendar is unavailable, return all future slots based on rules only
      logger.warn('Google Calendar unavailable, returning rule-based slots', {
        error: calendarError.message,
      });
    }

    res.json({ slots: availableSlots });
  } catch (error) {
    logger.error('Failed to check availability', { error: error.message });
    next(error);
  }
});

/**
 * POST /api/meetings/schedule
 * Schedule a mediated meeting
 */
router.post('/schedule', authenticate, requirePremium, async (req, res, next) => {
  try {
    const { mediatorId, startTime } = req.body;

    if (!mediatorId || !startTime) {
      return res.status(400).json({ error: 'mediatorId and startTime are required' });
    }

    // Find relationship
    const relationship = await findUserRelationship(req.prisma, req.user.id);
    if (!relationship) {
      return res.status(400).json({ error: 'No relationship found' });
    }

    if (!relationship.user2Id) {
      return res.status(400).json({ error: 'Both partners must be connected to schedule a meeting' });
    }

    // Get course position for week number
    const position = getCoursePosition(req.user.createdAt || new Date());

    // Check for existing meeting this week
    const existingMeeting = await req.prisma.meeting.findUnique({
      where: { relationshipId_week: { relationshipId: relationship.id, week: position.week } },
    });

    if (existingMeeting && existingMeeting.status !== 'cancelled') {
      return res.status(400).json({ error: 'A meeting is already scheduled for this week' });
    }

    // Get mediator
    const mediator = await req.prisma.mediator.findUnique({ where: { id: mediatorId } });
    if (!mediator || mediator.status !== 'active') {
      return res.status(404).json({ error: 'Mediator not found or inactive' });
    }

    // Calculate end time (30 min)
    const start = new Date(startTime);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    // Create Google Calendar event with Meet link
    let meetLink = null;
    let calendarEventId = null;

    try {
      const attendeeEmails = [relationship.user1.email];
      if (relationship.user2?.email) {
        attendeeEmails.push(relationship.user2.email);
      }

      const calendarResult = await createCalendarEventWithMeet({
        calendarId: mediator.googleCalendarId,
        summary: 'Love Rescue — Mediated Meeting',
        description: `Facilitated discussion with ${mediator.name}. This is not therapy — it is a guided conversation with a neutral facilitator.`,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        attendees: attendeeEmails,
      });

      meetLink = calendarResult.meetLink;
      calendarEventId = calendarResult.eventId;
    } catch (calendarError) {
      logger.warn('Failed to create calendar event, proceeding without Meet link', {
        error: calendarError.message,
      });
    }

    // Create or update meeting record
    const meetingData = {
      relationshipId: relationship.id,
      mediatorId,
      scheduledAt: start,
      duration: 30,
      meetLink,
      calendarEventId,
      status: 'scheduled',
      week: position.week,
      createdBy: req.user.id,
      partnerConsent: false,
    };

    let meeting;
    if (existingMeeting && existingMeeting.status === 'cancelled') {
      meeting = await req.prisma.meeting.update({
        where: { id: existingMeeting.id },
        data: meetingData,
        include: { mediator: { select: { name: true, bio: true } } },
      });
    } else {
      meeting = await req.prisma.meeting.create({
        data: meetingData,
        include: { mediator: { select: { name: true, bio: true } } },
      });
    }

    logger.info('Meeting scheduled', { meetingId: meeting.id, userId: req.user.id });

    res.json({ meeting });
  } catch (error) {
    logger.error('Failed to schedule meeting', { error: error.message, userId: req.user.id });
    next(error);
  }
});

/**
 * GET /api/meetings/upcoming
 * Get upcoming meetings for user's relationship
 */
router.get('/upcoming', authenticate, requireSubscription, async (req, res, next) => {
  try {
    const relationship = await findUserRelationship(req.prisma, req.user.id);
    if (!relationship) {
      return res.json({ meetings: [] });
    }

    const meetings = await req.prisma.meeting.findMany({
      where: {
        relationshipId: relationship.id,
        status: 'scheduled',
        scheduledAt: { gte: new Date() },
      },
      include: {
        mediator: { select: { id: true, name: true, bio: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    res.json({
      meetings: meetings.map((m) => ({
        id: m.id,
        scheduledAt: m.scheduledAt,
        duration: m.duration,
        meetLink: m.meetLink,
        status: m.status,
        week: m.week,
        mediator: m.mediator,
        createdBy: m.createdBy,
        partnerConsent: m.partnerConsent,
        isCreator: m.createdBy === req.user.id,
      })),
    });
  } catch (error) {
    logger.error('Failed to fetch upcoming meetings', { error: error.message, userId: req.user.id });
    next(error);
  }
});

/**
 * POST /api/meetings/:id/cancel
 * Cancel a scheduled meeting
 */
router.post('/:id/cancel', authenticate, requirePremium, async (req, res, next) => {
  try {
    const { id } = req.params;

    const meeting = await req.prisma.meeting.findUnique({
      where: { id },
      include: {
        relationship: true,
        mediator: true,
      },
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Verify user belongs to this relationship
    const { relationship } = meeting;
    if (relationship.user1Id !== req.user.id && relationship.user2Id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (meeting.status !== 'scheduled') {
      return res.status(400).json({ error: 'Meeting cannot be cancelled' });
    }

    // Cancel Google Calendar event
    if (meeting.calendarEventId && meeting.mediator.googleCalendarId) {
      try {
        await cancelCalendarEvent(meeting.mediator.googleCalendarId, meeting.calendarEventId);
      } catch (calendarError) {
        logger.warn('Failed to cancel calendar event', { error: calendarError.message });
      }
    }

    const updated = await req.prisma.meeting.update({
      where: { id },
      data: { status: 'cancelled' },
    });

    logger.info('Meeting cancelled', { meetingId: id, userId: req.user.id });

    res.json({ meeting: updated });
  } catch (error) {
    logger.error('Failed to cancel meeting', { error: error.message });
    next(error);
  }
});

/**
 * POST /api/meetings/:id/consent
 * Partner consents to a scheduled meeting (only non-creator can consent)
 */
router.post('/:id/consent', authenticate, requirePremium, async (req, res, next) => {
  try {
    const { id } = req.params;

    const meeting = await req.prisma.meeting.findUnique({
      where: { id },
      include: { relationship: true },
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    const { relationship } = meeting;
    if (relationship.user1Id !== req.user.id && relationship.user2Id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (meeting.createdBy === req.user.id) {
      return res.status(400).json({ error: 'Only the non-creator partner can consent' });
    }

    if (meeting.status !== 'scheduled') {
      return res.status(400).json({ error: 'Meeting is not in a scheduled state' });
    }

    const updated = await req.prisma.meeting.update({
      where: { id },
      data: { partnerConsent: true },
    });

    logger.info('Partner consented to meeting', { meetingId: id, userId: req.user.id });

    res.json({ meeting: updated });
  } catch (error) {
    logger.error('Failed to record consent', { error: error.message });
    next(error);
  }
});

module.exports = router;
