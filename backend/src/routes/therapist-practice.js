/**
 * Therapist practice management: clinical session notes + appointments.
 *
 * Mounted at /api/therapist AFTER routes/therapist.js — none of the paths here
 * collide with that router (it has no /notes, /appointments or /my/* routes,
 * and its /clients/:id patterns never match the extra /notes segment), so
 * unmatched requests simply fall through to this router.
 *
 * Privacy rules (HIPAA-minded):
 *  - Session-note content is the therapist's work product. It is served ONLY
 *    by the therapist-authenticated note endpoints below — never in any
 *    client-facing endpoint, never in emails, never in access-log metadata.
 *  - Note content (and structured SOAP payloads) are encrypted at rest via the
 *    same AES-256-GCM path the journal uses (utils/encryption, gated on the
 *    same CONTENT_ENCRYPTION + ENCRYPTION_KEY switch lib/contentEncryption
 *    uses). Plaintext rows written before activation pass through untouched.
 *  - Every read/write that touches client data is access-logged via the
 *    shared logAccess helper (ids only — no content).
 *  - Notes are soft-deleted (deletedAt): clinical records are never destroyed.
 *  - Clients see appointment logistics + clientNote only.
 */

const express = require('express');
const { authenticate, authenticateTherapist } = require('../middleware/auth');
const { requireClientAccess, logAccess } = require('../middleware/therapistAccess');
const { encrypt, decrypt } = require('../utils/encryption');
const { sendEmail } = require('../utils/email');
const logger = require('../utils/logger');

const router = express.Router();

const APPOINTMENT_STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show'];
const LOCATION_TYPES = ['video', 'phone', 'in_person'];
const NOTE_FORMATS = ['freeform', 'soap'];
const SOAP_KEYS = ['subjective', 'objective', 'assessment', 'plan'];
const MAX_DURATION_MINUTES = 480; // bound also used by the overlap query window
const MIN_DURATION_MINUTES = 5;
const MAX_CONTENT_LENGTH = 50000;
const MAX_CLIENT_NOTE_LENGTH = 2000;

// ─── Content encryption (same switch as lib/contentEncryption) ─────────────

function contentEncryptionEnabled() {
  return process.env.CONTENT_ENCRYPTION === 'true' && !!process.env.ENCRYPTION_KEY;
}

function encryptNoteContent(value) {
  if (!contentEncryptionEnabled()) return value;
  return typeof value === 'string' && value.length > 0 ? encrypt(value) : value;
}

function decryptNoteContent(value) {
  if (!contentEncryptionEnabled()) return value;
  return typeof value === 'string' && value.length > 0 ? decrypt(value) : value;
}

/**
 * SOAP payloads are JSONB. When encryption is on, the whole object is stored
 * as { __enc: '<iv:tag:ciphertext>' } so the structured clinical text is
 * never at rest in plaintext. Decryption is backward compatible: plain
 * objects (written before activation) pass through untouched.
 */
function encryptSoap(soap) {
  if (soap == null) return soap;
  if (!contentEncryptionEnabled()) return soap;
  return { __enc: encrypt(JSON.stringify(soap)) };
}

function decryptSoap(soap) {
  if (soap == null) return soap;
  if (typeof soap === 'object' && typeof soap.__enc === 'string') {
    try {
      return JSON.parse(decrypt(soap.__enc));
    } catch (err) {
      logger.error('Failed to decrypt SOAP payload', { error: err.message });
      return null;
    }
  }
  return soap;
}

/** Shape a SessionNote row for the therapist (decrypted). */
function serializeNote(note) {
  return {
    id: note.id,
    therapistId: note.therapistId,
    clientId: note.clientId ?? null,
    relationshipId: note.relationshipId ?? null,
    appointmentId: note.appointmentId ?? null,
    sessionDate: note.sessionDate,
    content: decryptNoteContent(note.content),
    noteFormat: note.noteFormat ?? null,
    soap: decryptSoap(note.soap) ?? null,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

// ─── Shared validation helpers ──────────────────────────────────────────────

function validateSoap(soap) {
  if (soap == null) return { ok: true, value: undefined };
  if (typeof soap !== 'object' || Array.isArray(soap)) {
    return { ok: false, error: 'soap must be an object with subjective/objective/assessment/plan fields' };
  }
  const value = {};
  for (const key of SOAP_KEYS) {
    if (soap[key] == null) continue;
    if (typeof soap[key] !== 'string') {
      return { ok: false, error: `soap.${key} must be a string` };
    }
    if (soap[key].length > MAX_CONTENT_LENGTH) {
      return { ok: false, error: `soap.${key} is too long` };
    }
    value[key] = soap[key];
  }
  return { ok: true, value: Object.keys(value).length > 0 ? value : undefined };
}

function parseDurationMinutes(raw, fallback = 50) {
  if (raw === undefined || raw === null) return { ok: true, value: fallback };
  const n = Number(raw);
  if (!Number.isInteger(n) || n < MIN_DURATION_MINUTES || n > MAX_DURATION_MINUTES) {
    return { ok: false, error: `durationMinutes must be an integer between ${MIN_DURATION_MINUTES} and ${MAX_DURATION_MINUTES}` };
  }
  return { ok: true, value: n };
}

/**
 * Find a scheduled appointment of this therapist overlapping
 * [scheduledAt, scheduledAt + durationMinutes). Returns the conflicting
 * appointment or null. `excludeId` skips the appointment being rescheduled.
 */
async function findOverlappingAppointment(prisma, therapistId, scheduledAt, durationMinutes, excludeId = null) {
  const startMs = scheduledAt.getTime();
  const endMs = startMs + durationMinutes * 60000;
  // Candidate window: anything starting before our end and no earlier than
  // MAX_DURATION before our start (an appointment can't span longer than that).
  const candidates = await prisma.appointment.findMany({
    where: {
      therapistId,
      status: 'scheduled',
      scheduledAt: {
        lt: new Date(endMs),
        gt: new Date(startMs - MAX_DURATION_MINUTES * 60000),
      },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  for (const appt of (candidates || [])) {
    const apptStart = new Date(appt.scheduledAt).getTime();
    const apptEnd = apptStart + (appt.durationMinutes || 50) * 60000;
    if (apptStart < endMs && apptEnd > startMs) return appt;
  }
  return null;
}

/** Shape an Appointment row for the therapist. */
function serializeAppointment(appt, extra = {}) {
  return {
    id: appt.id,
    therapistId: appt.therapistId,
    clientId: appt.clientId,
    relationshipId: appt.relationshipId ?? null,
    scheduledAt: appt.scheduledAt,
    durationMinutes: appt.durationMinutes,
    status: appt.status,
    locationType: appt.locationType ?? null,
    clientNote: appt.clientNote ?? null,
    cancelledBy: appt.cancelledBy ?? null,
    reminderSentAt: appt.reminderSentAt ?? null,
    createdAt: appt.createdAt,
    updatedAt: appt.updatedAt,
    ...extra,
  };
}

function therapistDisplayName(therapist) {
  const name = [therapist?.firstName, therapist?.lastName].filter(Boolean).join(' ').trim();
  return name || therapist?.practiceName || 'your therapist';
}

function formatWhen(date) {
  try {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
    });
  } catch {
    return new Date(date).toISOString();
  }
}

// ─── Email notifications (fire-and-forget; logistics only, never note text) ─

function fireAndForget(promise, context) {
  Promise.resolve(promise).catch((err) => {
    logger.error(`Email notification failed (${context})`, { error: err.message });
  });
}

async function notifyClientAppointment(prisma, appointment, therapist, kind) {
  const client = await prisma.user.findUnique({
    where: { id: appointment.clientId },
    select: { email: true, firstName: true },
  });
  if (!client || !client.email) return;

  const tName = therapistDisplayName(therapist);
  const when = formatWhen(appointment.scheduledAt);
  const location = appointment.locationType ? ` (${appointment.locationType.replace('_', '-')})` : '';
  const subjects = {
    scheduled: `Appointment scheduled with ${tName}`,
    rescheduled: `Your appointment with ${tName} was rescheduled`,
    cancelled: `Your appointment with ${tName} was cancelled`,
    reminder: `Reminder: appointment with ${tName} tomorrow`,
  };
  const bodies = {
    scheduled: `Your appointment with ${tName} is scheduled for ${when}${location}.`,
    rescheduled: `Your appointment with ${tName} has been moved to ${when}${location}.`,
    cancelled: `Your appointment with ${tName} on ${when} has been cancelled.`,
    reminder: `This is a reminder of your upcoming appointment with ${tName} on ${when}${location}.`,
  };
  const name = client.firstName || 'there';
  await sendEmail({
    to: client.email,
    subject: subjects[kind],
    text: `Hi ${name},\n\n${bodies[kind]}\n\n— Love Rescue`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">Hi ${name},</h2>
        <p style="font-size: 16px; color: #1B2735;">${bodies[kind]}</p>
      </div>
    `,
  });
}

async function notifyTherapistClientCancelled(prisma, appointment, therapist) {
  if (!therapist || !therapist.email) return;
  const client = await prisma.user.findUnique({
    where: { id: appointment.clientId },
    select: { firstName: true, lastName: true },
  });
  const clientName = [client?.firstName, client?.lastName].filter(Boolean).join(' ') || 'A client';
  const when = formatWhen(appointment.scheduledAt);
  await sendEmail({
    to: therapist.email,
    subject: `${clientName} cancelled an appointment`,
    text: `${clientName} cancelled the appointment scheduled for ${when}.\n\n— Love Rescue`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">Appointment Cancelled</h2>
        <p style="font-size: 16px; color: #1B2735;"><strong>${clientName}</strong> cancelled the appointment scheduled for ${when}.</p>
      </div>
    `,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// THERAPIST ENDPOINTS — session notes
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/therapist/clients/:clientId/notes
 * Create a session note for a client. Notes are the therapist's own work
 * product, so the gate is link existence + GRANTED consent (any permission
 * tier) — requireClientAccess() with no category enforces exactly that.
 */
router.post('/clients/:clientId/notes', authenticateTherapist, requireClientAccess(), async (req, res, next) => {
  try {
    const clientId = req.params.clientId;
    const { content, sessionDate, noteFormat, soap, appointmentId, relationshipId } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Note content is required' });
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return res.status(400).json({ error: 'Note content is too long' });
    }
    if (noteFormat !== undefined && noteFormat !== null && !NOTE_FORMATS.includes(noteFormat)) {
      return res.status(400).json({ error: `noteFormat must be one of: ${NOTE_FORMATS.join(', ')}` });
    }
    const soapCheck = validateSoap(soap);
    if (!soapCheck.ok) {
      return res.status(400).json({ error: soapCheck.error });
    }
    let parsedSessionDate = new Date();
    if (sessionDate !== undefined && sessionDate !== null) {
      parsedSessionDate = new Date(sessionDate);
      if (Number.isNaN(parsedSessionDate.getTime())) {
        return res.status(400).json({ error: 'sessionDate must be a valid date' });
      }
    }

    // If linking to an appointment, it must be the therapist's own.
    if (appointmentId) {
      const appointment = await req.prisma.appointment.findFirst({
        where: { id: appointmentId, therapistId: req.therapist.id },
      });
      if (!appointment) {
        return res.status(400).json({ error: 'Appointment not found' });
      }
    }

    const note = await req.prisma.sessionNote.create({
      data: {
        therapistId: req.therapist.id,
        clientId,
        relationshipId: relationshipId || null,
        appointmentId: appointmentId || null,
        sessionDate: parsedSessionDate,
        content: encryptNoteContent(content),
        noteFormat: noteFormat || 'freeform',
        soap: soapCheck.value !== undefined ? encryptSoap(soapCheck.value) : undefined,
      },
    });

    await logAccess(req.prisma, {
      accessorId: req.therapist.id,
      resourceType: 'session_note',
      resourceId: note.id,
      resourceOwnerId: clientId,
      action: 'write',
      accessGranted: true,
      ipAddress: req.ip,
    });

    res.status(201).json({ note: serializeNote(note) });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/therapist/clients/:clientId/notes?limit&offset
 * Paginated list of the therapist's own notes on this client (newest first,
 * soft-deleted excluded, content decrypted). Consent-gated like create.
 */
router.get('/clients/:clientId/notes', authenticateTherapist, requireClientAccess(), async (req, res, next) => {
  try {
    const clientId = req.params.clientId;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const where = {
      therapistId: req.therapist.id,
      clientId,
      deletedAt: null,
    };
    const [notes, total] = await Promise.all([
      req.prisma.sessionNote.findMany({
        where,
        orderBy: { sessionDate: 'desc' },
        take: limit,
        skip: offset,
      }),
      req.prisma.sessionNote.count({ where }),
    ]);

    await logAccess(req.prisma, {
      accessorId: req.therapist.id,
      resourceType: 'session_note',
      resourceOwnerId: clientId,
      action: 'read',
      accessGranted: true,
      ipAddress: req.ip,
    });

    res.json({
      notes: (notes || []).map(serializeNote),
      pagination: { total: total || 0, limit, offset },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Load a note owned by the requesting therapist (not soft-deleted).
 * Own-note only: a therapist can never read another therapist's notes, and
 * these endpoints stay available even if consent is later revoked — the note
 * is the therapist's own clinical record.
 */
async function findOwnNote(req) {
  return req.prisma.sessionNote.findFirst({
    where: { id: req.params.id, therapistId: req.therapist.id, deletedAt: null },
  });
}

/**
 * GET /api/therapist/notes/:id — read one of the therapist's own notes.
 */
router.get('/notes/:id', authenticateTherapist, async (req, res, next) => {
  try {
    const note = await findOwnNote(req);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    await logAccess(req.prisma, {
      accessorId: req.therapist.id,
      resourceType: 'session_note',
      resourceId: note.id,
      resourceOwnerId: note.clientId,
      action: 'read',
      accessGranted: true,
      ipAddress: req.ip,
    });

    res.json({ note: serializeNote(note) });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/therapist/notes/:id — update one of the therapist's own notes.
 */
router.put('/notes/:id', authenticateTherapist, async (req, res, next) => {
  try {
    const note = await findOwnNote(req);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const { content, sessionDate, noteFormat, soap } = req.body;
    const data = {};

    if (content !== undefined) {
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ error: 'Note content cannot be empty' });
      }
      if (content.length > MAX_CONTENT_LENGTH) {
        return res.status(400).json({ error: 'Note content is too long' });
      }
      data.content = encryptNoteContent(content);
    }
    if (sessionDate !== undefined) {
      const parsed = new Date(sessionDate);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'sessionDate must be a valid date' });
      }
      data.sessionDate = parsed;
    }
    if (noteFormat !== undefined) {
      if (noteFormat !== null && !NOTE_FORMATS.includes(noteFormat)) {
        return res.status(400).json({ error: `noteFormat must be one of: ${NOTE_FORMATS.join(', ')}` });
      }
      data.noteFormat = noteFormat;
    }
    if (soap !== undefined) {
      const soapCheck = validateSoap(soap);
      if (!soapCheck.ok) {
        return res.status(400).json({ error: soapCheck.error });
      }
      data.soap = soapCheck.value !== undefined ? encryptSoap(soapCheck.value) : null;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' });
    }

    const updated = await req.prisma.sessionNote.update({
      where: { id: note.id },
      data,
    });

    await logAccess(req.prisma, {
      accessorId: req.therapist.id,
      resourceType: 'session_note',
      resourceId: note.id,
      resourceOwnerId: note.clientId,
      action: 'write',
      accessGranted: true,
      ipAddress: req.ip,
    });

    res.json({ note: serializeNote(updated) });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/therapist/notes/:id — SOFT delete (clinical records are never
 * hard-deleted). Sets deletedAt; the note disappears from all listings.
 */
router.delete('/notes/:id', authenticateTherapist, async (req, res, next) => {
  try {
    const note = await findOwnNote(req);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const deletedAt = new Date();
    await req.prisma.sessionNote.update({
      where: { id: note.id },
      data: { deletedAt },
    });

    await logAccess(req.prisma, {
      accessorId: req.therapist.id,
      resourceType: 'session_note',
      resourceId: note.id,
      resourceOwnerId: note.clientId,
      action: 'write',
      accessGranted: true,
      reason: 'soft delete',
      ipAddress: req.ip,
    });

    res.json({ message: 'Note deleted', id: note.id, deletedAt });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// THERAPIST ENDPOINTS — appointments
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/therapist/appointments
 * Create an appointment. Requires a GRANTED consent link to the client
 * (requireClientAccess reads clientId from the body). Rejects scheduling in
 * the past (400) and overlaps with the therapist's own scheduled
 * appointments (409).
 */
router.post('/appointments', authenticateTherapist, requireClientAccess(), async (req, res, next) => {
  try {
    const { clientId, scheduledAt, locationType, clientNote, relationshipId } = req.body;

    const parsedScheduledAt = new Date(scheduledAt);
    if (!scheduledAt || Number.isNaN(parsedScheduledAt.getTime())) {
      return res.status(400).json({ error: 'scheduledAt must be a valid date' });
    }
    if (parsedScheduledAt.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'Cannot schedule an appointment in the past', code: 'PAST_SCHEDULING' });
    }
    const duration = parseDurationMinutes(req.body.durationMinutes);
    if (!duration.ok) {
      return res.status(400).json({ error: duration.error });
    }
    if (locationType !== undefined && locationType !== null && !LOCATION_TYPES.includes(locationType)) {
      return res.status(400).json({ error: `locationType must be one of: ${LOCATION_TYPES.join(', ')}` });
    }
    if (clientNote && (typeof clientNote !== 'string' || clientNote.length > MAX_CLIENT_NOTE_LENGTH)) {
      return res.status(400).json({ error: 'clientNote must be a string of at most 2000 characters' });
    }

    const conflict = await findOverlappingAppointment(
      req.prisma, req.therapist.id, parsedScheduledAt, duration.value
    );
    if (conflict) {
      return res.status(409).json({
        error: 'This time overlaps an existing scheduled appointment',
        code: 'APPOINTMENT_OVERLAP',
        conflictingAppointmentId: conflict.id,
      });
    }

    const appointment = await req.prisma.appointment.create({
      data: {
        therapistId: req.therapist.id,
        clientId,
        relationshipId: relationshipId || null,
        scheduledAt: parsedScheduledAt,
        durationMinutes: duration.value,
        locationType: locationType || null,
        clientNote: clientNote || null,
        status: 'scheduled',
      },
    });

    await logAccess(req.prisma, {
      accessorId: req.therapist.id,
      resourceType: 'appointment',
      resourceId: appointment.id,
      resourceOwnerId: clientId,
      action: 'write',
      accessGranted: true,
      ipAddress: req.ip,
    });

    fireAndForget(
      notifyClientAppointment(req.prisma, appointment, req.therapist, 'scheduled'),
      'appointment scheduled'
    );

    res.status(201).json({ appointment: serializeAppointment(appointment) });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/therapist/appointments?from&to&status
 * The therapist's calendar (their own appointments only), oldest first,
 * with client display names.
 */
router.get('/appointments', authenticateTherapist, async (req, res, next) => {
  try {
    const { from, to, status } = req.query;
    if (status !== undefined && !APPOINTMENT_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${APPOINTMENT_STATUSES.join(', ')}` });
    }
    const scheduledAt = {};
    if (from) {
      const parsed = new Date(from);
      if (Number.isNaN(parsed.getTime())) return res.status(400).json({ error: 'from must be a valid date' });
      scheduledAt.gte = parsed;
    }
    if (to) {
      const parsed = new Date(to);
      if (Number.isNaN(parsed.getTime())) return res.status(400).json({ error: 'to must be a valid date' });
      scheduledAt.lte = parsed;
    }

    const appointments = await req.prisma.appointment.findMany({
      where: {
        therapistId: req.therapist.id,
        ...(status ? { status } : {}),
        ...(Object.keys(scheduledAt).length > 0 ? { scheduledAt } : {}),
      },
      orderBy: { scheduledAt: 'asc' },
      include: { client: { select: { firstName: true, lastName: true } } },
    });

    const rows = appointments || [];

    // HIPAA audit: one row per distinct client whose data appears in the list.
    // Fire-and-forget batch write, like therapist.js caseload reads.
    const distinctClientIds = [...new Set(rows.map((a) => a.clientId))];
    if (distinctClientIds.length > 0 && req.prisma.accessLog?.createMany) {
      Promise.resolve(req.prisma.accessLog.createMany({
        data: distinctClientIds.map((ownerId) => ({
          accessorId: req.therapist.id,
          accessorRole: 'therapist',
          resourceType: 'appointment',
          resourceId: null,
          resourceOwnerId: ownerId,
          action: 'read',
          accessGranted: true,
          reason: null,
          ipAddress: req.ip || null,
        })),
      })).catch((error) => logger.error('Failed to write bulk access log', { error: error.message }));
    }

    res.json({
      appointments: rows.map((a) => serializeAppointment(a, {
        clientName: [a.client?.firstName, a.client?.lastName].filter(Boolean).join(' ') || null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/therapist/appointments/:id
 * Reschedule (scheduledAt / durationMinutes / locationType / clientNote) or
 * transition status (completed | cancelled | no_show) on the therapist's own
 * appointment. Completing with { createNote: true } also creates a stub
 * SessionNote linked to the appointment.
 */
router.patch('/appointments/:id', authenticateTherapist, async (req, res, next) => {
  try {
    const appointment = await req.prisma.appointment.findFirst({
      where: { id: req.params.id, therapistId: req.therapist.id },
    });
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const { status, scheduledAt, locationType, clientNote, createNote } = req.body;
    const data = {};
    let notifyKind = null;

    if (status !== undefined) {
      if (!['completed', 'cancelled', 'no_show'].includes(status)) {
        return res.status(400).json({ error: 'status must be one of: completed, cancelled, no_show' });
      }
      if (appointment.status !== 'scheduled') {
        return res.status(409).json({
          error: `Cannot change status of a ${appointment.status} appointment`,
          code: 'INVALID_STATUS_TRANSITION',
        });
      }
      data.status = status;
      if (status === 'cancelled') {
        data.cancelledBy = 'therapist';
        notifyKind = 'cancelled';
      }
    }

    if (scheduledAt !== undefined) {
      if (appointment.status !== 'scheduled' || (data.status && data.status !== 'scheduled')) {
        return res.status(409).json({
          error: 'Only scheduled appointments can be rescheduled',
          code: 'INVALID_STATUS_TRANSITION',
        });
      }
      const parsed = new Date(scheduledAt);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'scheduledAt must be a valid date' });
      }
      if (parsed.getTime() <= Date.now()) {
        return res.status(400).json({ error: 'Cannot schedule an appointment in the past', code: 'PAST_SCHEDULING' });
      }
      const duration = parseDurationMinutes(req.body.durationMinutes, appointment.durationMinutes || 50);
      if (!duration.ok) {
        return res.status(400).json({ error: duration.error });
      }
      const conflict = await findOverlappingAppointment(
        req.prisma, req.therapist.id, parsed, duration.value, appointment.id
      );
      if (conflict) {
        return res.status(409).json({
          error: 'This time overlaps an existing scheduled appointment',
          code: 'APPOINTMENT_OVERLAP',
          conflictingAppointmentId: conflict.id,
        });
      }
      data.scheduledAt = parsed;
      data.durationMinutes = duration.value;
      data.reminderSentAt = null; // new time → a fresh 24h reminder is due
      notifyKind = 'rescheduled';
    } else if (req.body.durationMinutes !== undefined) {
      const duration = parseDurationMinutes(req.body.durationMinutes, appointment.durationMinutes || 50);
      if (!duration.ok) {
        return res.status(400).json({ error: duration.error });
      }
      data.durationMinutes = duration.value;
    }

    if (locationType !== undefined) {
      if (locationType !== null && !LOCATION_TYPES.includes(locationType)) {
        return res.status(400).json({ error: `locationType must be one of: ${LOCATION_TYPES.join(', ')}` });
      }
      data.locationType = locationType;
    }
    if (clientNote !== undefined) {
      if (clientNote !== null && (typeof clientNote !== 'string' || clientNote.length > MAX_CLIENT_NOTE_LENGTH)) {
        return res.status(400).json({ error: 'clientNote must be a string of at most 2000 characters' });
      }
      data.clientNote = clientNote;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided' });
    }

    const updated = await req.prisma.appointment.update({
      where: { id: appointment.id },
      data,
    });

    // Optionally seed a stub session note when completing.
    let note = null;
    if (data.status === 'completed' && createNote === true) {
      note = await req.prisma.sessionNote.create({
        data: {
          therapistId: req.therapist.id,
          clientId: appointment.clientId,
          relationshipId: appointment.relationshipId || null,
          appointmentId: appointment.id,
          sessionDate: appointment.scheduledAt,
          content: encryptNoteContent('Session completed — notes pending.'),
          noteFormat: 'freeform',
        },
      });
      await logAccess(req.prisma, {
        accessorId: req.therapist.id,
        resourceType: 'session_note',
        resourceId: note.id,
        resourceOwnerId: appointment.clientId,
        action: 'write',
        accessGranted: true,
        reason: 'stub note on completion',
        ipAddress: req.ip,
      });
    }

    await logAccess(req.prisma, {
      accessorId: req.therapist.id,
      resourceType: 'appointment',
      resourceId: appointment.id,
      resourceOwnerId: appointment.clientId,
      action: 'write',
      accessGranted: true,
      ipAddress: req.ip,
    });

    if (notifyKind) {
      fireAndForget(
        notifyClientAppointment(req.prisma, updated, req.therapist, notifyKind),
        `appointment ${notifyKind}`
      );
    }

    res.json({
      appointment: serializeAppointment(updated),
      ...(note ? { note: serializeNote(note) } : {}),
    });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// CLIENT ENDPOINTS — regular user auth. Logistics + clientNote ONLY: session
// notes never appear in any response here.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/therapist/my/appointments
 * The authenticated client's appointments, restricted to therapists they have
 * a GRANTED consent link with, newest first, with the therapist's name.
 */
router.get('/my/appointments', authenticate, async (req, res, next) => {
  try {
    const links = await req.prisma.therapistClient.findMany({
      where: { clientId: req.user.id, consentStatus: 'GRANTED' },
      select: { therapistId: true },
    });
    const therapistIds = (links || []).map((l) => l.therapistId);
    if (therapistIds.length === 0) {
      return res.json({ appointments: [] });
    }

    const appointments = await req.prisma.appointment.findMany({
      where: {
        clientId: req.user.id,
        therapistId: { in: therapistIds },
      },
      orderBy: { scheduledAt: 'desc' },
      include: {
        therapist: { select: { firstName: true, lastName: true, practiceName: true } },
      },
    });

    res.json({
      appointments: (appointments || []).map((a) => ({
        id: a.id,
        therapistId: a.therapistId,
        therapistName: therapistDisplayName(a.therapist),
        practiceName: a.therapist?.practiceName || null,
        scheduledAt: a.scheduledAt,
        durationMinutes: a.durationMinutes,
        status: a.status,
        locationType: a.locationType ?? null,
        clientNote: a.clientNote ?? null,
        cancelledBy: a.cancelledBy ?? null,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/therapist/my/appointments/:id/cancel
 * A client cancels their own scheduled appointment. Sets cancelledBy 'client'
 * and notifies the therapist (fire-and-forget).
 */
router.patch('/my/appointments/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const appointment = await req.prisma.appointment.findFirst({
      where: { id: req.params.id, clientId: req.user.id },
    });
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    if (appointment.status !== 'scheduled') {
      return res.status(409).json({
        error: `Cannot cancel a ${appointment.status} appointment`,
        code: 'INVALID_STATUS_TRANSITION',
      });
    }

    const updated = await req.prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: 'cancelled', cancelledBy: 'client' },
    });

    const therapist = await req.prisma.therapist.findUnique({
      where: { id: appointment.therapistId },
      select: { email: true, firstName: true, lastName: true },
    });
    fireAndForget(
      notifyTherapistClientCancelled(req.prisma, updated, therapist),
      'client cancellation'
    );

    res.json({
      appointment: {
        id: updated.id,
        scheduledAt: updated.scheduledAt,
        durationMinutes: updated.durationMinutes,
        status: updated.status,
        locationType: updated.locationType ?? null,
        clientNote: updated.clientNote ?? null,
        cancelledBy: updated.cancelledBy,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// REMINDER SCAN — called by the hourly scheduler in index.js.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send reminder emails for scheduled appointments starting within the next
 * 24 hours that have not been reminded yet. The reminderSentAt stamp is
 * written BEFORE the email via a conditional updateMany (reminderSentAt:
 * null), so concurrent/repeated scans can never double-send. Failures are
 * isolated per appointment.
 *
 * @returns {Promise<{scanned:number, sent:number, failures:number}>}
 */
async function scanAndSendAppointmentReminders(prisma) {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const due = await prisma.appointment.findMany({
    where: {
      status: 'scheduled',
      reminderSentAt: null,
      scheduledAt: { gte: now, lte: windowEnd },
    },
    include: {
      therapist: { select: { firstName: true, lastName: true, practiceName: true } },
    },
  });

  const summary = { scanned: (due || []).length, sent: 0, failures: 0 };
  for (const appt of (due || [])) {
    try {
      // Claim the reminder atomically; if another tick got there first, skip.
      const claim = await prisma.appointment.updateMany({
        where: { id: appt.id, reminderSentAt: null },
        data: { reminderSentAt: new Date() },
      });
      if (!claim || claim.count === 0) continue;

      await notifyClientAppointment(prisma, appt, appt.therapist, 'reminder');
      summary.sent += 1;
    } catch (err) {
      summary.failures += 1;
      logger.error('Appointment reminder failed', { appointmentId: appt.id, error: err.message });
    }
  }
  return summary;
}

module.exports = router;
module.exports.scanAndSendAppointmentReminders = scanAndSendAppointmentReminders;
