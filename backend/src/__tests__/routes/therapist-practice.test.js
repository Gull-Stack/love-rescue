/**
 * Therapist practice backend (routes/therapist-practice.js):
 *  - session note CRUD with consent gating (link existence + GRANTED)
 *  - own-note-only access and soft delete (clinical records)
 *  - appointment create / past-reject / overlap-409 / calendar / PATCH
 *  - client endpoints (own appointments only, cancel)
 *  - reminder scan (stamps reminderSentAt, no double-send, error isolation)
 *  - privacy: session-note content never reaches client responses or emails
 */

const express = require('express');
const request = require('supertest');
const bcrypt = require('bcryptjs');

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

jest.mock('../../utils/email', () => ({
  sendEmail: jest.fn(() => Promise.resolve(true)),
  isEmailConfigured: jest.fn(() => true)
}));

const { sendEmail } = require('../../utils/email');
const { errorHandler } = require('../../middleware/errorHandler');
const { createMockPrisma } = require('../helpers/mockPrisma');
const { getAuthHeader } = require('../helpers/tokenHelper');
const practiceRoutes = require('../../routes/therapist-practice');
const { scanAndSendAppointmentReminders } = practiceRoutes;

const THERAPIST_API_KEY = process.env.THERAPIST_API_KEY;

const THERAPIST_ID = 'therapist-1';
const CLIENT_ID = 'client-1';
const OTHER_CLIENT_ID = 'client-2';

const THERAPIST = {
  id: THERAPIST_ID,
  email: 'dr@example.com',
  firstName: 'Dana',
  lastName: 'Therapist',
  practiceName: 'Dana Family Therapy',
  isActive: true
};

const CLIENT_USER = {
  id: CLIENT_ID,
  email: 'client@example.com',
  firstName: 'Alex',
  lastName: 'Client',
  role: 'user',
  subscriptionStatus: 'paid',
  tokenVersion: 0
};

const GRANTED_LINK = {
  id: 'link-1',
  therapistId: THERAPIST_ID,
  clientId: CLIENT_ID,
  consentStatus: 'GRANTED',
  permissionLevel: 'BASIC'
};

function futureDate(hoursFromNow = 48) {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
}

function makeNote(overrides = {}) {
  return {
    id: 'note-1',
    therapistId: THERAPIST_ID,
    clientId: CLIENT_ID,
    relationshipId: null,
    appointmentId: null,
    sessionDate: new Date('2026-07-01T10:00:00Z'),
    content: 'Client reported improved communication this week.',
    noteFormat: 'freeform',
    soap: null,
    deletedAt: null,
    createdAt: new Date('2026-07-01T11:00:00Z'),
    updatedAt: new Date('2026-07-01T11:00:00Z'),
    ...overrides
  };
}

function makeAppointment(overrides = {}) {
  return {
    id: 'appt-1',
    therapistId: THERAPIST_ID,
    clientId: CLIENT_ID,
    relationshipId: null,
    scheduledAt: futureDate(48),
    durationMinutes: 50,
    status: 'scheduled',
    locationType: 'video',
    clientNote: 'Bring your worksheet',
    cancelledBy: null,
    reminderSentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
}

function createApp(mockPrisma) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.prisma = mockPrisma;
    next();
  });
  app.use('/api/therapist', practiceRoutes);
  app.use(errorHandler);
  return app;
}

// Flush fire-and-forget promises (email notifications)
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('Therapist practice routes', () => {
  let mockPrisma;
  let app;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();
    app = createApp(mockPrisma);

    const hashedApiKey = await bcrypt.hash(THERAPIST_API_KEY, 10);
    mockPrisma.therapist.findMany.mockResolvedValue([
      { ...THERAPIST, apiKeyHash: hashedApiKey }
    ]);
    mockPrisma.accessLog.create.mockResolvedValue({});
    mockPrisma.accessLog.createMany.mockResolvedValue({ count: 1 });
  });

  const asTherapist = (req) => req.set('x-therapist-api-key', THERAPIST_API_KEY);

  // ── Session notes: consent gating ─────────────────────────────────────────

  describe('note consent gating', () => {
    test('POST note → 403 CONSENT_REQUIRED with no link', async () => {
      mockPrisma.therapistClient.findFirst.mockResolvedValue(null);

      const res = await asTherapist(
        request(app).post(`/api/therapist/clients/${CLIENT_ID}/notes`)
      ).send({ content: 'text' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CONSENT_REQUIRED');
      expect(mockPrisma.sessionNote.create).not.toHaveBeenCalled();
      // Denied access is audit-logged
      expect(mockPrisma.accessLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ accessGranted: false })
        })
      );
    });

    test('POST note → 403 when consent is REVOKED (GRANTED filter finds nothing)', async () => {
      // requireClientAccess queries with consentStatus: 'GRANTED', so a
      // REVOKED link yields null.
      mockPrisma.therapistClient.findFirst.mockImplementation(({ where }) =>
        Promise.resolve(where.consentStatus === 'GRANTED' ? null : { ...GRANTED_LINK, consentStatus: 'REVOKED' })
      );

      const res = await asTherapist(
        request(app).post(`/api/therapist/clients/${CLIENT_ID}/notes`)
      ).send({ content: 'text' });

      expect(res.status).toBe(403);
      expect(mockPrisma.therapistClient.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ consentStatus: 'GRANTED' })
        })
      );
      expect(mockPrisma.sessionNote.create).not.toHaveBeenCalled();
    });

    test('GET notes list → 403 with no GRANTED link', async () => {
      mockPrisma.therapistClient.findFirst.mockResolvedValue(null);

      const res = await asTherapist(
        request(app).get(`/api/therapist/clients/${CLIENT_ID}/notes`)
      );

      expect(res.status).toBe(403);
      expect(mockPrisma.sessionNote.findMany).not.toHaveBeenCalled();
    });
  });

  // ── Session notes: CRUD ───────────────────────────────────────────────────

  describe('note CRUD', () => {
    beforeEach(() => {
      mockPrisma.therapistClient.findFirst.mockResolvedValue(GRANTED_LINK);
    });

    test('POST creates a note and writes a write access log', async () => {
      mockPrisma.sessionNote.create.mockImplementation(({ data }) =>
        Promise.resolve(makeNote({ ...data, id: 'note-new' }))
      );

      const res = await asTherapist(
        request(app).post(`/api/therapist/clients/${CLIENT_ID}/notes`)
      ).send({
        content: 'Session went well.',
        sessionDate: '2026-07-01T10:00:00Z',
        noteFormat: 'soap',
        soap: { subjective: 'S', objective: 'O', assessment: 'A', plan: 'P' }
      });

      expect(res.status).toBe(201);
      expect(res.body.note).toMatchObject({
        id: 'note-new',
        therapistId: THERAPIST_ID,
        clientId: CLIENT_ID,
        content: 'Session went well.',
        noteFormat: 'soap',
        soap: { subjective: 'S', objective: 'O', assessment: 'A', plan: 'P' }
      });
      expect(mockPrisma.sessionNote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ therapistId: THERAPIST_ID, clientId: CLIENT_ID })
        })
      );
      // Explicit 'write' access log with no note content in it
      const writeLog = mockPrisma.accessLog.create.mock.calls.find(
        ([args]) => args.data.action === 'write' && args.data.resourceType === 'session_note'
      );
      expect(writeLog).toBeDefined();
      expect(JSON.stringify(writeLog[0])).not.toContain('Session went well');
    });

    test('POST rejects empty content and bad noteFormat', async () => {
      const empty = await asTherapist(
        request(app).post(`/api/therapist/clients/${CLIENT_ID}/notes`)
      ).send({ content: '   ' });
      expect(empty.status).toBe(400);

      const badFormat = await asTherapist(
        request(app).post(`/api/therapist/clients/${CLIENT_ID}/notes`)
      ).send({ content: 'x', noteFormat: 'haiku' });
      expect(badFormat.status).toBe(400);
    });

    test('GET list is paginated newest-first and excludes soft-deleted notes', async () => {
      mockPrisma.sessionNote.findMany.mockResolvedValue([makeNote()]);
      mockPrisma.sessionNote.count.mockResolvedValue(7);

      const res = await asTherapist(
        request(app).get(`/api/therapist/clients/${CLIENT_ID}/notes?limit=5&offset=5`)
      );

      expect(res.status).toBe(200);
      expect(res.body.notes).toHaveLength(1);
      expect(res.body.pagination).toEqual({ total: 7, limit: 5, offset: 5 });
      expect(mockPrisma.sessionNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            therapistId: THERAPIST_ID,
            clientId: CLIENT_ID,
            deletedAt: null
          }),
          orderBy: { sessionDate: 'desc' },
          take: 5,
          skip: 5
        })
      );
    });

    test('GET /notes/:id enforces own-note only (404 for other therapist notes)', async () => {
      mockPrisma.sessionNote.findFirst.mockResolvedValue(null);

      const res = await asTherapist(request(app).get('/api/therapist/notes/note-x'));

      expect(res.status).toBe(404);
      expect(mockPrisma.sessionNote.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'note-x',
            therapistId: THERAPIST_ID,
            deletedAt: null
          })
        })
      );
    });

    test('PUT updates own note', async () => {
      mockPrisma.sessionNote.findFirst.mockResolvedValue(makeNote());
      mockPrisma.sessionNote.update.mockImplementation(({ data }) =>
        Promise.resolve(makeNote({ ...data }))
      );

      const res = await asTherapist(
        request(app).put('/api/therapist/notes/note-1')
      ).send({ content: 'Updated content.' });

      expect(res.status).toBe(200);
      expect(res.body.note.content).toBe('Updated content.');
      expect(mockPrisma.sessionNote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'note-1' },
          data: expect.objectContaining({ content: 'Updated content.' })
        })
      );
    });

    test('DELETE soft-deletes (sets deletedAt, never calls delete)', async () => {
      mockPrisma.sessionNote.findFirst.mockResolvedValue(makeNote());
      mockPrisma.sessionNote.update.mockResolvedValue(makeNote({ deletedAt: new Date() }));

      const res = await asTherapist(request(app).delete('/api/therapist/notes/note-1'));

      expect(res.status).toBe(200);
      expect(res.body.deletedAt).toBeDefined();
      expect(mockPrisma.sessionNote.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'note-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) })
        })
      );
      expect(mockPrisma.sessionNote.delete).not.toHaveBeenCalled();
    });

    test('deleted note is not readable (findFirst filters deletedAt null)', async () => {
      mockPrisma.sessionNote.findFirst.mockResolvedValue(null);
      const res = await asTherapist(request(app).get('/api/therapist/notes/note-1'));
      expect(res.status).toBe(404);
    });
  });

  // ── Appointments: therapist side ──────────────────────────────────────────

  describe('appointments (therapist)', () => {
    beforeEach(() => {
      mockPrisma.therapistClient.findFirst.mockResolvedValue(GRANTED_LINK);
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.user.findUnique.mockResolvedValue(CLIENT_USER);
    });

    test('POST creates an appointment and emails the client', async () => {
      const scheduledAt = futureDate(72);
      mockPrisma.appointment.create.mockImplementation(({ data }) =>
        Promise.resolve(makeAppointment({ ...data, id: 'appt-new' }))
      );

      const res = await asTherapist(
        request(app).post('/api/therapist/appointments')
      ).send({
        clientId: CLIENT_ID,
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes: 50,
        locationType: 'video',
        clientNote: 'First intake session'
      });
      await flush();

      expect(res.status).toBe(201);
      expect(res.body.appointment).toMatchObject({
        id: 'appt-new',
        therapistId: THERAPIST_ID,
        clientId: CLIENT_ID,
        status: 'scheduled',
        durationMinutes: 50,
        locationType: 'video',
        clientNote: 'First intake session'
      });
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: CLIENT_USER.email,
          subject: expect.stringContaining('Dana Therapist')
        })
      );
    });

    test('POST requires GRANTED link → 403 otherwise', async () => {
      mockPrisma.therapistClient.findFirst.mockResolvedValue(null);

      const res = await asTherapist(
        request(app).post('/api/therapist/appointments')
      ).send({ clientId: CLIENT_ID, scheduledAt: futureDate().toISOString() });

      expect(res.status).toBe(403);
      expect(mockPrisma.appointment.create).not.toHaveBeenCalled();
    });

    test('POST rejects scheduling in the past', async () => {
      const res = await asTherapist(
        request(app).post('/api/therapist/appointments')
      ).send({
        clientId: CLIENT_ID,
        scheduledAt: new Date(Date.now() - 60 * 60 * 1000).toISOString()
      });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('PAST_SCHEDULING');
      expect(mockPrisma.appointment.create).not.toHaveBeenCalled();
    });

    test('POST detects overlap with an existing scheduled appointment → 409', async () => {
      const scheduledAt = futureDate(48);
      // Existing appointment starting 20 minutes before the new one (50 min long)
      mockPrisma.appointment.findMany.mockResolvedValue([
        makeAppointment({
          id: 'appt-existing',
          scheduledAt: new Date(scheduledAt.getTime() - 20 * 60000),
          durationMinutes: 50
        })
      ]);

      const res = await asTherapist(
        request(app).post('/api/therapist/appointments')
      ).send({ clientId: CLIENT_ID, scheduledAt: scheduledAt.toISOString() });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('APPOINTMENT_OVERLAP');
      expect(res.body.conflictingAppointmentId).toBe('appt-existing');
      expect(mockPrisma.appointment.create).not.toHaveBeenCalled();
    });

    test('POST allows back-to-back (non-overlapping) appointments', async () => {
      const scheduledAt = futureDate(48);
      // Existing appointment ends exactly when the new one starts
      mockPrisma.appointment.findMany.mockResolvedValue([
        makeAppointment({
          id: 'appt-before',
          scheduledAt: new Date(scheduledAt.getTime() - 50 * 60000),
          durationMinutes: 50
        })
      ]);
      mockPrisma.appointment.create.mockImplementation(({ data }) =>
        Promise.resolve(makeAppointment({ ...data, id: 'appt-new' }))
      );

      const res = await asTherapist(
        request(app).post('/api/therapist/appointments')
      ).send({ clientId: CLIENT_ID, scheduledAt: scheduledAt.toISOString() });

      expect(res.status).toBe(201);
    });

    test('GET /appointments filters by from/to/status and scopes to own calendar', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([
        { ...makeAppointment(), client: { firstName: 'Alex', lastName: 'Client' } }
      ]);

      const res = await asTherapist(
        request(app).get('/api/therapist/appointments?from=2026-07-01&to=2026-08-01&status=scheduled')
      );

      expect(res.status).toBe(200);
      expect(res.body.appointments[0].clientName).toBe('Alex Client');
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            therapistId: THERAPIST_ID,
            status: 'scheduled',
            scheduledAt: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) })
          })
        })
      );
    });

    test('PATCH cancel sets cancelledBy therapist and emails the client', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(makeAppointment());
      mockPrisma.appointment.update.mockImplementation(({ data }) =>
        Promise.resolve(makeAppointment({ ...data }))
      );

      const res = await asTherapist(
        request(app).patch('/api/therapist/appointments/appt-1')
      ).send({ status: 'cancelled' });
      await flush();

      expect(res.status).toBe(200);
      expect(res.body.appointment.status).toBe('cancelled');
      expect(res.body.appointment.cancelledBy).toBe('therapist');
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: CLIENT_USER.email, subject: expect.stringContaining('cancelled') })
      );
    });

    test('PATCH reschedule resets reminderSentAt and re-checks overlap', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(
        makeAppointment({ reminderSentAt: new Date() })
      );
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.appointment.update.mockImplementation(({ data }) =>
        Promise.resolve(makeAppointment({ ...data }))
      );

      const newTime = futureDate(96);
      const res = await asTherapist(
        request(app).patch('/api/therapist/appointments/appt-1')
      ).send({ scheduledAt: newTime.toISOString() });

      expect(res.status).toBe(200);
      expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ reminderSentAt: null })
        })
      );
      // Overlap check excluded the appointment being rescheduled
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { not: 'appt-1' } })
        })
      );
    });

    test('PATCH complete with createNote:true creates a stub session note', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(makeAppointment());
      mockPrisma.appointment.update.mockImplementation(({ data }) =>
        Promise.resolve(makeAppointment({ ...data }))
      );
      mockPrisma.sessionNote.create.mockImplementation(({ data }) =>
        Promise.resolve(makeNote({ ...data, id: 'note-stub' }))
      );

      const res = await asTherapist(
        request(app).patch('/api/therapist/appointments/appt-1')
      ).send({ status: 'completed', createNote: true });

      expect(res.status).toBe(200);
      expect(res.body.appointment.status).toBe('completed');
      expect(res.body.note.id).toBe('note-stub');
      expect(mockPrisma.sessionNote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            therapistId: THERAPIST_ID,
            clientId: CLIENT_ID,
            appointmentId: 'appt-1'
          })
        })
      );
    });

    test('PATCH is own-appointments only → 404 otherwise', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(null);

      const res = await asTherapist(
        request(app).patch('/api/therapist/appointments/appt-other')
      ).send({ status: 'cancelled' });

      expect(res.status).toBe(404);
      expect(mockPrisma.appointment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ therapistId: THERAPIST_ID })
        })
      );
    });

    test('PATCH rejects double status transition (already cancelled)', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(
        makeAppointment({ status: 'cancelled', cancelledBy: 'client' })
      );

      const res = await asTherapist(
        request(app).patch('/api/therapist/appointments/appt-1')
      ).send({ status: 'completed' });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('INVALID_STATUS_TRANSITION');
    });
  });

  // ── Client endpoints ──────────────────────────────────────────────────────

  describe('client endpoints', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(CLIENT_USER);
      mockPrisma.relationship.findFirst.mockResolvedValue(null);
    });

    test('GET /my/appointments returns only the client\'s own appointments from GRANTED therapists', async () => {
      mockPrisma.therapistClient.findMany.mockResolvedValue([
        { therapistId: THERAPIST_ID }
      ]);
      mockPrisma.appointment.findMany.mockResolvedValue([
        { ...makeAppointment(), therapist: THERAPIST }
      ]);

      const res = await request(app)
        .get('/api/therapist/my/appointments')
        .set(getAuthHeader(CLIENT_ID));

      expect(res.status).toBe(200);
      expect(res.body.appointments).toHaveLength(1);
      expect(res.body.appointments[0]).toMatchObject({
        id: 'appt-1',
        therapistName: 'Dana Therapist',
        status: 'scheduled',
        clientNote: 'Bring your worksheet'
      });
      // Scoped to the requesting client AND GRANTED-linked therapists
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clientId: CLIENT_ID,
            therapistId: { in: [THERAPIST_ID] }
          })
        })
      );
      expect(mockPrisma.therapistClient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clientId: CLIENT_ID, consentStatus: 'GRANTED' })
        })
      );
      // Privacy: no session-note fields in the client payload
      const payload = JSON.stringify(res.body);
      expect(payload).not.toContain('"content"');
      expect(payload).not.toContain('soap');
    });

    test('GET /my/appointments → empty when no GRANTED therapist links', async () => {
      mockPrisma.therapistClient.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/therapist/my/appointments')
        .set(getAuthHeader(CLIENT_ID));

      expect(res.status).toBe(200);
      expect(res.body.appointments).toEqual([]);
      expect(mockPrisma.appointment.findMany).not.toHaveBeenCalled();
    });

    test('PATCH /my/appointments/:id/cancel cancels own appointment and notifies therapist', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(makeAppointment());
      mockPrisma.appointment.update.mockImplementation(({ data }) =>
        Promise.resolve(makeAppointment({ ...data }))
      );
      mockPrisma.therapist.findUnique.mockResolvedValue(THERAPIST);

      const res = await request(app)
        .patch('/api/therapist/my/appointments/appt-1/cancel')
        .set(getAuthHeader(CLIENT_ID));
      await flush();

      expect(res.status).toBe(200);
      expect(res.body.appointment.status).toBe('cancelled');
      expect(res.body.appointment.cancelledBy).toBe('client');
      expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'cancelled', cancelledBy: 'client' }
        })
      );
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: THERAPIST.email,
          subject: expect.stringContaining('cancelled')
        })
      );
      // Own-appointment scoping in the lookup
      expect(mockPrisma.appointment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clientId: CLIENT_ID })
        })
      );
    });

    test('client cannot cancel another client\'s appointment → 404', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/therapist/my/appointments/appt-1/cancel')
        .set(getAuthHeader(OTHER_CLIENT_ID));

      expect(res.status).toBe(404);
      expect(mockPrisma.appointment.update).not.toHaveBeenCalled();
    });

    test('client cannot cancel an already-completed appointment → 409', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(
        makeAppointment({ status: 'completed' })
      );

      const res = await request(app)
        .patch('/api/therapist/my/appointments/appt-1/cancel')
        .set(getAuthHeader(CLIENT_ID));

      expect(res.status).toBe(409);
      expect(mockPrisma.appointment.update).not.toHaveBeenCalled();
    });

    test('note endpoints are not reachable with client (user) auth', async () => {
      const res = await request(app)
        .get(`/api/therapist/clients/${CLIENT_ID}/notes`)
        .set(getAuthHeader(CLIENT_ID));

      // authenticateTherapist rejects a non-therapist user JWT
      expect(res.status).toBe(403);
      expect(mockPrisma.sessionNote.findMany).not.toHaveBeenCalled();
    });
  });

  // ── Reminder scan ─────────────────────────────────────────────────────────

  describe('scanAndSendAppointmentReminders', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue(CLIENT_USER);
    });

    test('sends reminder and stamps reminderSentAt for appointments in the next 24h', async () => {
      const appt = {
        ...makeAppointment({ scheduledAt: futureDate(5) }),
        therapist: THERAPIST
      };
      mockPrisma.appointment.findMany.mockResolvedValue([appt]);
      mockPrisma.appointment.updateMany.mockResolvedValue({ count: 1 });

      const summary = await scanAndSendAppointmentReminders(mockPrisma);

      expect(summary).toEqual({ scanned: 1, sent: 1, failures: 0 });
      // Query window: scheduled, un-reminded, within 24h
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'scheduled',
            reminderSentAt: null,
            scheduledAt: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) })
          })
        })
      );
      // Stamp is conditional on reminderSentAt still being null (no double-send)
      expect(mockPrisma.appointment.updateMany).toHaveBeenCalledWith({
        where: { id: 'appt-1', reminderSentAt: null },
        data: { reminderSentAt: expect.any(Date) }
      });
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: CLIENT_USER.email,
          subject: expect.stringContaining('Reminder')
        })
      );
    });

    test('does not double-send when another tick already claimed the reminder', async () => {
      const appt = { ...makeAppointment({ scheduledAt: futureDate(5) }), therapist: THERAPIST };
      mockPrisma.appointment.findMany.mockResolvedValue([appt]);
      mockPrisma.appointment.updateMany.mockResolvedValue({ count: 0 });

      const summary = await scanAndSendAppointmentReminders(mockPrisma);

      expect(summary).toEqual({ scanned: 1, sent: 0, failures: 0 });
      expect(sendEmail).not.toHaveBeenCalled();
    });

    test('isolates per-appointment failures', async () => {
      const appt1 = { ...makeAppointment({ id: 'appt-a', scheduledAt: futureDate(3) }), therapist: THERAPIST };
      const appt2 = { ...makeAppointment({ id: 'appt-b', scheduledAt: futureDate(6) }), therapist: THERAPIST };
      mockPrisma.appointment.findMany.mockResolvedValue([appt1, appt2]);
      mockPrisma.appointment.updateMany.mockResolvedValue({ count: 1 });
      sendEmail.mockRejectedValueOnce(new Error('smtp down'));

      const summary = await scanAndSendAppointmentReminders(mockPrisma);

      expect(summary).toEqual({ scanned: 2, sent: 1, failures: 1 });
      // Both appointments were attempted despite the first failing
      expect(mockPrisma.appointment.updateMany).toHaveBeenCalledTimes(2);
    });

    test('reminder emails never contain note content fields', async () => {
      const appt = { ...makeAppointment({ scheduledAt: futureDate(5) }), therapist: THERAPIST };
      mockPrisma.appointment.findMany.mockResolvedValue([appt]);
      mockPrisma.appointment.updateMany.mockResolvedValue({ count: 1 });

      await scanAndSendAppointmentReminders(mockPrisma);

      const emailPayload = JSON.stringify(sendEmail.mock.calls[0][0]);
      expect(emailPayload).not.toContain('Bring your worksheet'); // clientNote stays out of email too
      expect(emailPayload).toContain('Dana Therapist');
    });
  });
});
