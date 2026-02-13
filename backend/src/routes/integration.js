/**
 * @fileoverview External Integration API for LoveRescue.
 * Provides OAuth2 client-credentials-style auth and consent-filtered data access
 * for integration partners (e.g., SuperTool).
 *
 * All endpoints are rate-limited, API key authenticated, HIPAA audit logged,
 * and consent-checked.
 *
 * @module routes/integration
 */

'use strict';

const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { integrationMiddleware, logIntegrationAccess } = require('../middleware/integrationAuth');
const { filterByPermission } = require('../middleware/therapistAccess');
const { generateSessionPrepReport } = require('../utils/sessionPrep');
const { generateCoupleProfile } = require('../utils/coupleDynamics');
const logger = require('../utils/logger');

const router = express.Router();

// C3 fix: require dedicated secret, never fall back
if (!process.env.INTEGRATION_JWT_SECRET) {
  throw new Error('FATAL: INTEGRATION_JWT_SECRET environment variable is required.');
}
const INTEGRATION_JWT_SECRET = process.env.INTEGRATION_JWT_SECRET;
const INTEGRATION_TOKEN_EXPIRY = '1h';

// ═══════════════════════════════════════════════════════════════
// POST /api/integration/auth
// Exchange API key + secret for integration token
// ═══════════════════════════════════════════════════════════════

router.post('/auth', async (req, res, next) => {
  try {
    const { apiKey, apiSecret, therapistId } = req.body;

    if (!apiKey || !apiSecret) {
      return res.status(400).json({ error: 'apiKey and apiSecret are required' });
    }

    if (!therapistId) {
      return res.status(400).json({ error: 'therapistId is required' });
    }

    // Find partner by API key
    const partner = await req.prisma.integrationPartner.findFirst({
      where: { apiKey, status: 'active' },
    });

    if (!partner) {
      await logIntegrationAccess(req.prisma, {
        partnerId: 'unknown',
        endpoint: 'POST /api/integration/auth',
        clientId: null,
        responseCode: 401,
        ipAddress: req.ip,
      });
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Verify secret
    const secretValid = await bcrypt.compare(apiSecret, partner.apiSecret);
    if (!secretValid) {
      await logIntegrationAccess(req.prisma, {
        partnerId: partner.id,
        endpoint: 'POST /api/integration/auth',
        clientId: null,
        responseCode: 401,
        ipAddress: req.ip,
      });
      return res.status(401).json({ error: 'Invalid API secret' });
    }

    // Verify therapist exists
    const therapist = await req.prisma.therapist.findUnique({
      where: { id: therapistId },
      select: { id: true, isActive: true },
    });

    if (!therapist || !therapist.isActive) {
      return res.status(404).json({ error: 'Therapist not found or inactive' });
    }

    // Issue integration JWT
    const token = jwt.sign(
      {
        type: 'integration',
        partnerId: partner.id,
        partnerName: partner.name,
        therapistId: therapist.id,
      },
      INTEGRATION_JWT_SECRET,
      { expiresIn: INTEGRATION_TOKEN_EXPIRY, algorithm: 'HS256' }
    );

    await logIntegrationAccess(req.prisma, {
      partnerId: partner.id,
      endpoint: 'POST /api/integration/auth',
      clientId: null,
      responseCode: 200,
      ipAddress: req.ip,
    });

    logger.info('Integration token issued', { partnerId: partner.id, therapistId });

    res.json({
      token,
      expiresIn: 3600,
      tokenType: 'Bearer',
    });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════
// All subsequent endpoints use the full integration middleware stack
// ═══════════════════════════════════════════════════════════════

// GET /api/integration/clients
// List therapist's linked LoveRescue clients (filtered by consent)
router.get('/clients', ...integrationMiddleware, async (req, res, next) => {
  try {
    const therapistId = req.integrationTherapist.id;

    const links = await req.prisma.therapistClient.findMany({
      where: { therapistId, consentStatus: 'GRANTED' },
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        couple: {
          select: {
            id: true,
            status: true,
            user1: { select: { id: true, firstName: true, lastName: true } },
            user2: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    const clients = await Promise.all(
      links.map(async (link) => {
        const [latestLog, courseProgress, alertCount] = await Promise.all([
          req.prisma.dailyLog.findFirst({
            where: { userId: link.clientId, therapistVisible: true },
            orderBy: { date: 'desc' },
            select: { date: true, mood: true, closenessScore: true },
          }),
          req.prisma.courseProgress.findFirst({
            where: { userId: link.clientId },
            select: { currentWeek: true, isActive: true },
          }),
          req.prisma.therapistAlert.count({
            where: { therapistId, clientId: link.clientId, readAt: null },
          }),
        ]);

        return {
          id: link.client.id,
          linkId: link.id,
          firstName: link.client.firstName,
          lastName: link.client.lastName,
          email: link.client.email,
          permissionLevel: link.permissionLevel,
          consentGrantedAt: link.consentGrantedAt,
          couple: link.couple
            ? {
                id: link.couple.id,
                status: link.couple.status,
                partner1: link.couple.user1,
                partner2: link.couple.user2,
              }
            : null,
          latestActivity: latestLog?.date || null,
          latestMood: latestLog?.mood || null,
          courseWeek: courseProgress?.currentWeek || null,
          courseActive: courseProgress?.isActive || false,
          unreadAlerts: alertCount,
        };
      })
    );

    res.json({ clients, total: clients.length });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════
// HELPER: verify client access + get permission level
// ═══════════════════════════════════════════════════════════════

async function requireIntegrationClientAccess(req, res) {
  const therapistId = req.integrationTherapist.id;
  const clientId = req.params.id;

  const link = await req.prisma.therapistClient.findFirst({
    where: { therapistId, clientId, consentStatus: 'GRANTED' },
  });

  if (!link) {
    res.status(403).json({ error: 'No active consent for this client', code: 'NO_CONSENT' });
    return null;
  }

  return link;
}

// GET /api/integration/clients/:id/progress
router.get('/clients/:id/progress', ...integrationMiddleware, async (req, res, next) => {
  try {
    const link = await requireIntegrationClientAccess(req, res);
    if (!link) return;

    const clientId = req.params.id;
    const permLevel = link.permissionLevel;

    const [assessments, logs, courseProgress, tasks] = await Promise.all([
      req.prisma.assessment.findMany({
        where: { userId: clientId },
        select: { type: true, score: true, completedAt: true },
        orderBy: { completedAt: 'asc' },
      }),
      req.prisma.dailyLog.findMany({
        where: {
          userId: clientId,
          therapistVisible: true,
          date: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { date: 'asc' },
      }),
      req.prisma.courseProgress.findFirst({
        where: { userId: clientId },
        include: { weeklyStrategies: { orderBy: { weekNumber: 'asc' } } },
      }),
      req.prisma.therapistTask.findMany({
        where: { assignedToUserId: clientId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    // Compute streak
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const logDates = new Set(logs.map((l) => new Date(l.date).toISOString().split('T')[0]));
    for (let i = 0; i < 90; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (logDates.has(d.toISOString().split('T')[0])) {
        streak++;
      } else if (i > 0) break;
    }

    const response = {
      clientId,
      assessmentScores: assessments.map((a) => ({
        type: a.type,
        score: a.score,
        completedAt: a.completedAt,
      })),
      activityCompletion: {
        totalDays: 90,
        daysActive: logs.length,
        completionRate: Math.round((logs.length / 90) * 100),
        streak,
        tasksCompleted: tasks.filter((t) => t.completed).length,
        tasksPending: tasks.filter((t) => !t.completed).length,
      },
      courseProgress: courseProgress
        ? {
            currentWeek: courseProgress.currentWeek,
            isActive: courseProgress.isActive,
            completedWeeks: courseProgress.completedWeeks,
            weeklyStrategies: courseProgress.weeklyStrategies.map((ws) => ({
              weekNumber: ws.weekNumber,
              theme: ws.theme,
              completedDays: ws.completedDays,
              completedAt: ws.completedAt,
            })),
          }
        : null,
    };

    // Add mood data if permission allows
    if (permLevel !== 'BASIC') {
      response.moodTrends = logs
        .filter((l) => l.mood != null)
        .map((l) => ({ date: l.date, mood: l.mood, closeness: l.closenessScore }));
      response.ratioTrends = logs.map((l) => ({
        date: l.date,
        positive: l.positiveCount,
        negative: l.negativeCount,
        ratio: l.negativeCount > 0 ? l.positiveCount / l.negativeCount : null,
      }));
    }

    res.json(filterByPermission(response, permLevel));
  } catch (error) {
    next(error);
  }
});

// GET /api/integration/clients/:id/session-prep
router.get('/clients/:id/session-prep', ...integrationMiddleware, async (req, res, next) => {
  try {
    const link = await requireIntegrationClientAccess(req, res);
    if (!link) return;

    // Session prep requires at least STANDARD permission
    if (link.permissionLevel === 'BASIC') {
      return res.status(403).json({
        error: 'Session prep requires STANDARD or FULL permission level',
        code: 'INSUFFICIENT_PERMISSION',
      });
    }

    const clientId = req.params.id;
    const lastSessionDate = req.query.lastSessionDate || null;

    const report = await generateSessionPrepReport(
      req.prisma,
      req.integrationTherapist.id,
      clientId,
      lastSessionDate
    );

    res.json({ report });
  } catch (error) {
    next(error);
  }
});

// GET /api/integration/couples/:id/dynamics
router.get('/couples/:id/dynamics', ...integrationMiddleware, async (req, res, next) => {
  try {
    const therapistId = req.integrationTherapist.id;
    const coupleId = req.params.id;

    // Verify therapist has access to this couple via at least one linked client
    const links = await req.prisma.therapistClient.findMany({
      where: { therapistId, coupleId, consentStatus: 'GRANTED' },
    });

    if (links.length === 0) {
      return res.status(403).json({ error: 'No active consent for this couple', code: 'NO_CONSENT' });
    }

    // Use lowest permission level among linked partners
    const permHierarchy = { BASIC: 1, STANDARD: 2, FULL: 3 };
    const effectiveLevel = links.reduce(
      (min, l) => (permHierarchy[l.permissionLevel] < permHierarchy[min] ? l.permissionLevel : min),
      links[0].permissionLevel
    );

    const relationship = await req.prisma.relationship.findUnique({
      where: { id: coupleId },
      include: {
        user1: { select: { id: true, firstName: true, lastName: true } },
        user2: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!relationship) {
      return res.status(404).json({ error: 'Couple not found' });
    }

    const userIds = [relationship.user1Id, relationship.user2Id].filter(Boolean);

    const [assessments, logs, matchups] = await Promise.all([
      req.prisma.assessment.findMany({
        where: { userId: { in: userIds } },
        orderBy: { completedAt: 'desc' },
      }),
      req.prisma.dailyLog.findMany({
        where: { userId: { in: userIds }, therapistVisible: true },
        orderBy: { date: 'desc' },
        take: 60,
      }),
      req.prisma.matchup.findMany({
        where: { relationshipId: coupleId },
        orderBy: { generatedAt: 'desc' },
        take: 10,
      }),
    ]);

    // Generate couple profile using the dynamics engine
    const p1Assessments = assessments.filter((a) => a.userId === relationship.user1Id);
    const p2Assessments = assessments.filter((a) => a.userId === relationship.user2Id);

    let coupleProfile = null;
    if (p1Assessments.length > 0 && p2Assessments.length > 0) {
      try {
        coupleProfile = generateCoupleProfile(p1Assessments, p2Assessments, {
          partner1Name: relationship.user1?.firstName || 'Partner A',
          partner2Name: relationship.user2?.firstName || 'Partner B',
        });
      } catch (err) {
        logger.warn('Couple profile generation failed', { err: err.message, coupleId });
      }
    }

    // Build side-by-side view
    const buildPartnerView = (user, userAssessments, userLogs) => {
      const view = {
        user,
        assessmentScores: userAssessments.map((a) => ({
          type: a.type,
          score: a.score,
          completedAt: a.completedAt,
        })),
        activityDays: userLogs.length,
      };

      if (effectiveLevel !== 'BASIC') {
        const moodLogs = userLogs.filter((l) => l.mood != null);
        view.moodAvg = moodLogs.length > 0
          ? moodLogs.reduce((s, l) => s + l.mood, 0) / moodLogs.length
          : null;
      }

      return view;
    };

    const user1Logs = logs.filter((l) => l.userId === relationship.user1Id);
    const user2Logs = logs.filter((l) => l.userId === relationship.user2Id);

    const response = {
      couple: { id: relationship.id, status: relationship.status },
      partner1: buildPartnerView(relationship.user1, p1Assessments, user1Logs),
      partner2: relationship.user2
        ? buildPartnerView(relationship.user2, p2Assessments, user2Logs)
        : null,
      matchups: matchups.map((m) => ({
        score: m.score,
        alignments: m.alignments,
        generatedAt: m.generatedAt,
      })),
      coupleProfile,
    };

    res.json(filterByPermission(response, effectiveLevel));
  } catch (error) {
    next(error);
  }
});

// GET /api/integration/alerts
router.get('/alerts', ...integrationMiddleware, async (req, res, next) => {
  try {
    const therapistId = req.integrationTherapist.id;
    const { type, unreadOnly, since, limit } = req.query;

    // H4 fix: get list of clients with active consent, filter alerts to only those clients
    const consentedLinks = await req.prisma.therapistClient.findMany({
      where: { therapistId, consentStatus: 'GRANTED' },
      select: { clientId: true },
    });
    const consentedClientIds = consentedLinks.map((l) => l.clientId);

    if (consentedClientIds.length === 0) {
      return res.json({ alerts: [], unreadCount: 0, total: 0 });
    }

    const where = { therapistId, clientId: { in: consentedClientIds } };
    if (type) where.alertType = type;
    if (unreadOnly === 'true') where.readAt = null;
    if (since) where.createdAt = { gte: new Date(since) };

    const alerts = await req.prisma.therapistAlert.findMany({
      where,
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ readAt: 'asc' }, { severity: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(parseInt(limit) || 100, 500),
    });

    res.json({
      alerts: alerts.map((a) => ({
        id: a.id,
        clientId: a.clientId,
        client: a.client,
        alertType: a.alertType,
        severity: a.severity,
        message: a.message,
        metadata: a.metadata,
        readAt: a.readAt,
        createdAt: a.createdAt,
      })),
      unreadCount: alerts.filter((a) => !a.readAt).length,
      total: alerts.length,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/integration/clients/:id/assign
router.post('/clients/:id/assign', ...integrationMiddleware, async (req, res, next) => {
  try {
    const link = await requireIntegrationClientAccess(req, res);
    if (!link) return;

    const clientId = req.params.id;
    const { taskDescription, module, activities, notes, dueDate, priority } = req.body;

    if (!taskDescription && !module) {
      return res.status(400).json({ error: 'taskDescription or module is required' });
    }

    // Find client's relationship
    const relationship = await req.prisma.relationship.findFirst({
      where: {
        OR: [{ user1Id: clientId }, { user2Id: clientId }],
        status: 'active',
      },
    });

    if (!relationship) {
      return res.status(404).json({ error: 'No active relationship found for this client' });
    }

    const description =
      taskDescription ||
      `Complete module: ${module}${activities ? ` — Activities: ${activities.join(', ')}` : ''}`;

    const task = await req.prisma.therapistTask.create({
      data: {
        relationshipId: relationship.id,
        therapistId: req.integrationTherapist.id,
        assignedToUserId: clientId,
        taskDescription: description,
        notes: notes || (activities ? JSON.stringify({ module, activities }) : null),
        priority: priority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    // Audit log
    await req.prisma.accessLog.create({
      data: {
        accessorId: req.integrationTherapist.id,
        accessorRole: 'integration',
        resourceType: 'task_assignment',
        resourceId: task.id,
        resourceOwnerId: clientId,
        action: 'write',
        accessGranted: true,
        ipAddress: req.ip,
      },
    });

    logger.info('Module assigned via integration', {
      taskId: task.id,
      partnerId: req.integrationPartner.id,
      therapistId: req.integrationTherapist.id,
      clientId,
    });

    res.status(201).json({
      message: 'Activity assigned',
      task: {
        id: task.id,
        description: task.taskDescription,
        priority: task.priority,
        dueDate: task.dueDate,
        createdAt: task.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/integration/outcomes
router.get('/outcomes', ...integrationMiddleware, async (req, res, next) => {
  try {
    const therapistId = req.integrationTherapist.id;

    const links = await req.prisma.therapistClient.findMany({
      where: { therapistId, consentStatus: 'GRANTED' },
      select: { clientId: true, permissionLevel: true, consentGrantedAt: true },
    });

    const clientIds = links.map((l) => l.clientId);

    if (clientIds.length === 0) {
      return res.json({ outcomes: { summary: { totalClients: 0 }, clients: [] } });
    }

    const [assessments, courseProgressList, recentAlerts] = await Promise.all([
      req.prisma.assessment.findMany({
        where: { userId: { in: clientIds } },
        select: { userId: true, type: true, score: true, completedAt: true },
        orderBy: { completedAt: 'asc' },
      }),
      req.prisma.courseProgress.findMany({
        where: { userId: { in: clientIds } },
        select: { userId: true, currentWeek: true, isActive: true, completedAt: true },
      }),
      req.prisma.therapistAlert.findMany({
        where: { therapistId, clientId: { in: clientIds } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    const outcomesByClient = clientIds.map((cid) => {
      const clientAssessments = assessments.filter((a) => a.userId === cid);
      const cp = courseProgressList.find((c) => c.userId === cid);
      const alerts = recentAlerts.filter((a) => a.clientId === cid);

      return {
        clientId: cid,
        assessmentTypes: new Set(clientAssessments.map((a) => a.type)).size,
        courseWeek: cp?.currentWeek || null,
        courseCompleted: cp?.completedAt != null,
        crisisAlerts: alerts.filter((a) => a.alertType === 'CRISIS').length,
        milestones: alerts.filter((a) => a.alertType === 'MILESTONE').length,
      };
    });

    const summary = {
      totalClients: clientIds.length,
      activeInCourse: courseProgressList.filter((c) => c.isActive).length,
      courseCompleted: courseProgressList.filter((c) => c.completedAt != null).length,
      totalCrisisAlerts: recentAlerts.filter((a) => a.alertType === 'CRISIS').length,
      totalMilestones: recentAlerts.filter((a) => a.alertType === 'MILESTONE').length,
      avgCourseWeek:
        courseProgressList.length > 0
          ? +(
              courseProgressList.reduce((s, c) => s + c.currentWeek, 0) / courseProgressList.length
            ).toFixed(1)
          : null,
    };

    res.json({ outcomes: { summary, clients: outcomesByClient } });
  } catch (error) {
    next(error);
  }
});

// POST /api/integration/webhook/register
router.post('/webhook/register', ...integrationMiddleware, async (req, res, next) => {
  try {
    const { webhookUrl, events } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({ error: 'webhookUrl is required' });
    }

    // Validate URL format
    try {
      new URL(webhookUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid webhookUrl format' });
    }

    // Generate webhook secret for HMAC signing
    const webhookSecret = crypto.randomBytes(32).toString('hex');

    await req.prisma.integrationPartner.update({
      where: { id: req.integrationPartner.id },
      data: {
        webhookUrl,
        webhookSecret,
      },
    });

    logger.info('Webhook registered', {
      partnerId: req.integrationPartner.id,
      webhookUrl,
    });

    res.json({
      message: 'Webhook registered successfully',
      webhookUrl,
      webhookSecret, // Return once — partner must store this for signature verification
      events: events || ['alert.created', 'alert.critical', 'milestone.achieved'],
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
