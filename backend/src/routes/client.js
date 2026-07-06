const express = require('express');
const { authenticate } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Consumer-facing "My Therapist" endpoints (Settings → My Therapist).
 *
 * Clients see every therapist link that concerns them, can dial the
 * permission level up or down, and can revoke access entirely. Revocation
 * NEVER hard-deletes the TherapistClient row — the record is the consent
 * audit trail — it flips consentStatus to REVOKED, which every therapist
 * access check treats as "no access".
 */

const PERMISSION_LEVELS = ['BASIC', 'STANDARD', 'FULL'];

/**
 * Write a consent-change audit entry. ConsentLog requires a relationshipId,
 * so when the client has no relationship we fall back to the generic
 * AuditLog table — the change is always recorded somewhere durable.
 */
async function recordConsentChange(prisma, { userId, relationshipId, consentType, granted, metadata, ipAddress }) {
  try {
    if (relationshipId) {
      await prisma.consentLog.create({
        data: {
          userId,
          relationshipId,
          consentType,
          granted,
          ipAddress: ipAddress || null,
        },
      });
    } else {
      await prisma.auditLog.create({
        data: {
          userId,
          action: consentType,
          resource: 'therapist_client',
          metadata: metadata || undefined,
          ipAddress: ipAddress || null,
        },
      });
    }
  } catch (error) {
    // Never block the consent change itself on audit-write failure — but log it
    logger.error('Failed to record consent change', { error: error.message, userId, consentType });
  }
}

/**
 * Kill every grant surface that could give this therapist access to this
 * client's data. Revocation is not just a TherapistClient flag flip — legacy
 * couples are gated by TherapistAssignment rows + the relationship's per-user
 * consent flags (user1/user2TherapistConsent), and those read paths
 * (GET /api/therapist/couple/:relationshipId, POST /assign) stay OPEN if we
 * only touch the TherapistClient row. This helper closes all of them so a
 * revoke means a revoke everywhere.
 *
 * @param {object} prisma
 * @param {string} clientId - the revoking user
 * @param {string} therapistId - the therapist losing access
 */
async function revokeTherapistAccess(prisma, clientId, therapistId) {
  const now = new Date();

  // 1. Live model: soft-revoke every non-revoked TherapistClient link for this
  //    pair. The row stays as the consent audit trail; a pending invite code is
  //    cleared so it can't be accepted after revocation.
  await prisma.therapistClient.updateMany({
    where: { clientId, therapistId, consentStatus: { not: 'REVOKED' } },
    data: { consentStatus: 'REVOKED', consentRevokedAt: now, inviteCode: null },
  });

  // 2. Legacy surface: the client's relationships. Clear THIS user's consent
  //    flag (requireBothConsent then denies) and drop sharedConsent, then revoke
  //    the therapist's active assignments on those relationships (so
  //    requireTherapistAssignment denies too).
  const relationships = await prisma.relationship.findMany({
    where: { OR: [{ user1Id: clientId }, { user2Id: clientId }] },
    select: { id: true, user1Id: true },
  });

  await Promise.all(relationships.map((rel) => prisma.relationship.update({
    where: { id: rel.id },
    data: rel.user1Id === clientId
      ? { user1TherapistConsent: false, sharedConsent: false }
      : { user2TherapistConsent: false, sharedConsent: false },
  })));

  if (relationships.length > 0) {
    await prisma.therapistAssignment.updateMany({
      where: {
        therapistId,
        relationshipId: { in: relationships.map((r) => r.id) },
        status: 'active',
      },
      data: { status: 'revoked', revokedAt: now },
    });
  }

  // 3. Appointments: a revoked pair must not leave dangling 'scheduled'
  //    appointments — they vanish from the client's view (GRANTED-gated) but
  //    the reminder scan would keep emailing the client. Cancel every future
  //    scheduled appointment between the pair and tell the therapist
  //    (fire-and-forget: email failure never blocks the revoke).
  const cancelledAppointments = (await prisma.appointment.findMany({
    where: { therapistId, clientId, status: 'scheduled', scheduledAt: { gt: now } },
    select: { id: true, scheduledAt: true },
  })) || [];
  if (cancelledAppointments.length > 0) {
    await prisma.appointment.updateMany({
      where: { id: { in: cancelledAppointments.map((a) => a.id) } },
      data: { status: 'cancelled', cancelledBy: 'client' },
    });
    notifyTherapistAppointmentsCancelled(prisma, therapistId, clientId, cancelledAppointments)
      .catch((error) => logger.error('Failed to notify therapist of revocation cancellations', {
        therapistId,
        error: error.message,
      }));
  }
}

/**
 * Tell the therapist their upcoming appointments with a revoking client were
 * cancelled. Logistics only — dates and a count, no clinical data.
 */
async function notifyTherapistAppointmentsCancelled(prisma, therapistId, clientId, appointments) {
  const [therapist, client] = await Promise.all([
    prisma.therapist.findUnique({
      where: { id: therapistId },
      select: { email: true, firstName: true, lastName: true },
    }),
    prisma.user.findUnique({
      where: { id: clientId },
      select: { firstName: true, lastName: true },
    }),
  ]);
  if (!therapist || !therapist.email) return;

  const clientName = [client?.firstName, client?.lastName].filter(Boolean).join(' ') || 'A client';
  const count = appointments.length;
  const plural = count === 1 ? 'appointment was' : `${count} appointments were`;
  const dates = appointments
    .map((a) => new Date(a.scheduledAt).toISOString())
    .join(', ');
  await sendEmail({
    to: therapist.email,
    subject: `${clientName} revoked access — upcoming ${count === 1 ? 'appointment' : 'appointments'} cancelled`,
    text: `${clientName} revoked their Love Rescue sharing access, so your upcoming ${plural} cancelled (${dates}).\n\n— Love Rescue`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">Appointments Cancelled</h2>
        <p style="font-size: 16px; color: #1B2735;"><strong>${clientName}</strong> revoked their Love Rescue sharing access, so your upcoming ${plural} cancelled.</p>
      </div>
    `,
  });
}

/**
 * GET /api/client/therapists
 * List the client's therapist links (pending + granted) with therapist
 * name/practice, permission level, and consent status/dates.
 */
router.get('/therapists', authenticate, async (req, res, next) => {
  try {
    const links = await req.prisma.therapistClient.findMany({
      where: {
        clientId: req.user.id,
        consentStatus: { in: ['PENDING', 'GRANTED'] },
      },
      include: {
        therapist: {
          select: { id: true, firstName: true, lastName: true, practiceName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      therapists: links.map((link) => ({
        id: link.id, // link id — used by PATCH/DELETE below
        therapistId: link.therapistId,
        therapistName: [link.therapist.firstName, link.therapist.lastName].filter(Boolean).join(' '),
        practiceName: link.therapist.practiceName || null,
        permissionLevel: link.permissionLevel,
        consentStatus: link.consentStatus,
        connectedAt: link.consentGrantedAt,
        invitedAt: link.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/client/therapists/:id/permission
 * Change the permission level on one of the client's own links.
 * Body: { permissionLevel: 'basic' | 'standard' | 'full' } (case-insensitive)
 */
router.patch('/therapists/:id/permission', authenticate, async (req, res, next) => {
  try {
    const level = String(req.body.permissionLevel || '').toUpperCase();
    if (!PERMISSION_LEVELS.includes(level)) {
      return res.status(400).json({ error: 'permissionLevel must be BASIC, STANDARD, or FULL' });
    }

    // Scope to the client's own links — never someone else's
    const link = await req.prisma.therapistClient.findFirst({
      where: { id: req.params.id, clientId: req.user.id },
    });

    if (!link) {
      return res.status(404).json({ error: 'Therapist link not found' });
    }

    if (link.consentStatus !== 'GRANTED') {
      return res.status(400).json({
        error: 'Permissions can only be changed on an active connection',
        code: 'CONSENT_NOT_ACTIVE',
      });
    }

    const updated = await req.prisma.therapistClient.update({
      where: { id: link.id },
      data: { permissionLevel: level },
    });

    await recordConsentChange(req.prisma, {
      userId: req.user.id,
      relationshipId: link.coupleId,
      consentType: 'therapist_permission',
      granted: true,
      metadata: { linkId: link.id, therapistId: link.therapistId, from: link.permissionLevel, to: level },
      ipAddress: req.ip,
    });

    logger.info('Client changed therapist permission level', {
      linkId: link.id,
      clientId: req.user.id,
      therapistId: link.therapistId,
      from: link.permissionLevel,
      to: level,
    });

    res.json({
      message: 'Permission level updated',
      therapist: { id: updated.id, permissionLevel: updated.permissionLevel },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/client/therapists/:id
 * Revoke a therapist's access. Soft revoke only: the row is the consent
 * audit trail, so we flip consentStatus to REVOKED instead of deleting.
 */
router.delete('/therapists/:id', authenticate, async (req, res, next) => {
  try {
    const link = await req.prisma.therapistClient.findFirst({
      where: { id: req.params.id, clientId: req.user.id },
    });

    if (!link) {
      return res.status(404).json({ error: 'Therapist link not found' });
    }

    if (link.consentStatus === 'REVOKED') {
      return res.json({ message: 'Therapist access already revoked' });
    }

    // Revoke across EVERY grant surface (TherapistClient + legacy assignments +
    // relationship consent flags) — not just this one link.
    await revokeTherapistAccess(req.prisma, req.user.id, link.therapistId);

    await recordConsentChange(req.prisma, {
      userId: req.user.id,
      relationshipId: link.coupleId,
      consentType: 'therapist_access',
      granted: false,
      metadata: { linkId: link.id, therapistId: link.therapistId },
      ipAddress: req.ip,
    });

    logger.info('Client revoked therapist access', {
      linkId: link.id,
      clientId: req.user.id,
      therapistId: link.therapistId,
    });

    res.json({ message: 'Therapist access revoked' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/client/therapist-sharing-history?page=&limit=
 * Real access-log history: which therapist read what data, and when.
 */
router.get('/therapist-sharing-history', authenticate, async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

    const where = {
      resourceOwnerId: req.user.id,
      accessorRole: 'therapist',
      accessGranted: true,
    };

    const [logs, total] = await Promise.all([
      req.prisma.accessLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      req.prisma.accessLog.count({ where }),
    ]);

    // Resolve therapist names for the accessor ids in this page
    const accessorIds = [...new Set(logs.map((l) => l.accessorId))];
    const therapists = accessorIds.length > 0
      ? await req.prisma.therapist.findMany({
          where: { id: { in: accessorIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const nameById = Object.fromEntries(
      therapists.map((t) => [t.id, [t.firstName, t.lastName].filter(Boolean).join(' ')])
    );

    res.json({
      entries: logs.map((log) => ({
        id: log.id,
        timestamp: log.createdAt,
        therapistName: nameById[log.accessorId] || 'Therapist',
        dataType: log.resourceType,
        action: log.action,
      })),
      total,
      page,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
