const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const {
  authenticate,
  authenticateTherapist,
  requireTherapistAssignment,
  requireBothConsent,
  loadRelationship
} = require('../middleware/auth');
const {
  requireClientAccess,
  requireCoupleAccess,
  filterByPermission,
  logAccess,
} = require('../middleware/therapistAccess');
const { generateSessionPrepReport } = require('../utils/sessionPrep');
const logger = require('../utils/logger');

const router = express.Router();

// CRIT-05: Aggressive rate limiting for therapist registration (3/hour/IP)
const therapistRegisterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { error: 'Too many registration attempts. Please try again later.' }
});

// ─── Admin: Generate Therapist Invite Tokens ─────────────────────

/**
 * POST /api/therapist/admin/generate-invite
 * Generate a therapist invite token (requires admin role)
 */
router.post('/admin/generate-invite', authenticate, async (req, res, next) => {
  try {
    // Check if user is admin
    const user = await req.prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { email } = req.body; // Optional: pre-assign to a specific email

    const inviteToken = uuidv4();
    await req.prisma.token.create({
      data: {
        email: email ? email.toLowerCase() : 'therapist_invite',
        token: inviteToken,
        type: 'therapist_invite',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 day expiry
      }
    });

    logger.info('Therapist invite token generated', { adminId: req.user.id, email });

    res.status(201).json({
      message: 'Therapist invite token generated',
      inviteToken,
      expiresIn: '7 days'
    });
  } catch (error) {
    next(error);
  }
});

// ─── Therapist Registration & Management ─────────────────────────

/**
 * POST /api/therapist/register
 * Register a new therapist account (returns API key — show once)
 * CRIT-05: Requires a valid invite token and has aggressive rate limiting
 */
router.post('/register', therapistRegisterLimiter, async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, licenseNumber, licenseState, inviteToken } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Email, password, first name, and last name are required' });
    }

    if (!inviteToken) {
      return res.status(400).json({ error: 'An invitation token is required to register as a therapist' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Verify the invite token
    const tokenRecord = await req.prisma.token.findFirst({
      where: {
        token: inviteToken,
        type: 'therapist_invite',
        usedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    if (!tokenRecord) {
      return res.status(403).json({ error: 'Invalid or expired invitation token' });
    }

    // If the token was pre-assigned to an email, verify it matches
    if (tokenRecord.email !== 'therapist_invite' && tokenRecord.email !== email.toLowerCase()) {
      return res.status(403).json({ error: 'This invitation token is not valid for this email' });
    }

    const existing = await req.prisma.therapist.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Mark invite token as used
    await req.prisma.token.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() }
    });

    // Generate API key and hash it
    const apiKey = `mrt_${uuidv4().replace(/-/g, '')}`;
    const apiKeyHash = await bcrypt.hash(apiKey, 12);
    const passwordHash = await bcrypt.hash(password, 12);

    const therapist = await req.prisma.therapist.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        licenseNumber,
        licenseState,
        apiKeyHash
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true
      }
    });

    logger.info('Therapist registered', { therapistId: therapist.id });

    res.status(201).json({
      message: 'Therapist registered. Save your API key — it cannot be retrieved later.',
      therapist,
      apiKey
    });
  } catch (error) {
    next(error);
  }
});

// ─── Therapist Assignment ─────────────────────────────────────────

/**
 * POST /api/therapist/assign
 * Assign therapist to a couple (therapist-initiated)
 */
router.post('/assign', authenticateTherapist, async (req, res, next) => {
  try {
    const { relationshipId, userEmail } = req.body;

    let relId = relationshipId;

    // Look up by user email if no relationship ID
    if (!relId && userEmail) {
      const user = await req.prisma.user.findUnique({
        where: { email: userEmail.toLowerCase() }
      });
      if (user) {
        const rel = await req.prisma.relationship.findFirst({
          where: {
            OR: [{ user1Id: user.id }, { user2Id: user.id }],
            status: 'active'
          }
        });
        relId = rel?.id;
      }
    }

    if (!relId) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    const relationship = await req.prisma.relationship.findUnique({
      where: { id: relId }
    });

    if (!relationship || relationship.status !== 'active') {
      return res.status(400).json({ error: 'Relationship is not active' });
    }

    if (!relationship.user1TherapistConsent || !relationship.user2TherapistConsent) {
      return res.status(403).json({
        error: 'Both partners must consent to therapist access before assignment',
        code: 'CONSENT_REQUIRED'
      });
    }

    // Create or reactivate assignment
    const existing = await req.prisma.therapistAssignment.findFirst({
      where: { therapistId: req.therapist.id, relationshipId: relId }
    });

    let assignment;
    if (existing) {
      assignment = await req.prisma.therapistAssignment.update({
        where: { id: existing.id },
        data: { status: 'active', revokedAt: null }
      });
    } else {
      assignment = await req.prisma.therapistAssignment.create({
        data: {
          therapistId: req.therapist.id,
          relationshipId: relId
        }
      });
    }

    logger.info('Therapist assigned to couple', {
      therapistId: req.therapist.id,
      relationshipId: relId
    });

    res.status(201).json({
      message: 'Assigned to couple',
      assignment: { id: assignment.id, status: assignment.status }
    });
  } catch (error) {
    next(error);
  }
});

// ─── Therapist Read-Only Couple View ──────────────────────────────

/**
 * GET /api/therapist/couple/:relationshipId
 * Read-only view of couple data for assigned therapist
 */
router.get(
  '/couple/:relationshipId',
  authenticateTherapist,
  requireTherapistAssignment,
  requireBothConsent,
  async (req, res, next) => {
    try {
      const { relationshipId } = req.params;

      const relationship = await req.prisma.relationship.findUnique({
        where: { id: relationshipId },
        include: {
          user1: { select: { id: true, firstName: true, lastName: true } },
          user2: { select: { id: true, firstName: true, lastName: true } }
        }
      });

      // Fetch aggregated data (no private journals)
      const [assessments, matchups, logs1, logs2, tasks, sharedGoals] = await Promise.all([
        req.prisma.assessment.findMany({
          where: { userId: { in: [relationship.user1Id, relationship.user2Id].filter(Boolean) } },
          select: { userId: true, type: true, score: true, completedAt: true }
        }),
        req.prisma.matchup.findMany({
          where: { relationshipId },
          orderBy: { generatedAt: 'desc' },
          take: 5
        }),
        req.prisma.dailyLog.findMany({
          where: { userId: relationship.user1Id, therapistVisible: true },
          select: { date: true, mood: true, closenessScore: true, positiveCount: true, negativeCount: true },
          orderBy: { date: 'desc' },
          take: 30
        }),
        relationship.user2Id ? req.prisma.dailyLog.findMany({
          where: { userId: relationship.user2Id, therapistVisible: true },
          select: { date: true, mood: true, closenessScore: true, positiveCount: true, negativeCount: true },
          orderBy: { date: 'desc' },
          take: 30
        }) : Promise.resolve([]),
        req.prisma.therapistTask.findMany({
          where: { relationshipId },
          orderBy: { createdAt: 'desc' }
        }),
        req.prisma.sharedGoal.findMany({
          where: { relationshipId },
          orderBy: { createdAt: 'desc' }
        })
      ]);

      // Log successful access
      await req.prisma.accessLog.create({
        data: {
          accessorId: req.therapist.id,
          accessorRole: 'therapist',
          resourceType: 'couple_data',
          resourceId: relationshipId,
          resourceOwnerId: relationshipId,
          action: 'read',
          accessGranted: true,
          ipAddress: req.ip
        }
      });

      res.json({
        relationship: {
          id: relationship.id,
          user1: relationship.user1,
          user2: relationship.user2,
          status: relationship.status
        },
        assessments,
        matchups,
        logs: { user1: logs1, user2: logs2 },
        tasks: tasks.map(t => ({
          id: t.id,
          description: t.taskDescription,
          notes: t.notes,
          dueDate: t.dueDate,
          priority: t.priority,
          completed: t.completed,
          completedAt: t.completedAt,
          createdAt: t.createdAt
        })),
        sharedGoals
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── Task Management ──────────────────────────────────────────────

/**
 * POST /api/therapist/tasks/add
 * Add a task to a relationship (therapist endpoint)
 */
router.post('/tasks/add', authenticateTherapist, async (req, res, next) => {
  try {
    const {
      relationshipId,
      userEmail,
      taskDescription,
      notes,
      dueDate,
      priority,
      assignToUserId
    } = req.body;

    if (!taskDescription) {
      return res.status(400).json({ error: 'Task description required' });
    }

    // Find relationship by ID or user email
    let relationship;
    if (relationshipId) {
      relationship = await req.prisma.relationship.findUnique({
        where: { id: relationshipId }
      });
    } else if (userEmail) {
      const user = await req.prisma.user.findUnique({
        where: { email: userEmail.toLowerCase() }
      });

      if (user) {
        relationship = await req.prisma.relationship.findFirst({
          where: {
            OR: [
              { user1Id: user.id },
              { user2Id: user.id }
            ],
            status: 'active'
          }
        });
      }
    }

    if (!relationship) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    // Check for active TherapistClient link (preferred over legacy consent)
    const userIds = [relationship.user1Id, relationship.user2Id].filter(Boolean);
    const activeLink = await req.prisma.therapistClient.findFirst({
      where: {
        therapistId: req.therapist.id,
        clientId: { in: userIds },
        consentStatus: 'GRANTED',
      },
    });

    if (!activeLink) {
      // Fallback to legacy consent check
      if (!relationship.user1TherapistConsent || !relationship.user2TherapistConsent) {
        return res.status(403).json({
          error: 'Both partners must consent to therapist integration',
          code: 'CONSENT_REQUIRED'
        });
      }
    }

    const task = await req.prisma.therapistTask.create({
      data: {
        relationshipId: relationship.id,
        therapistId: req.therapist.id,
        therapistEmail: req.therapist.email,
        assignedToUserId: assignToUserId || null,
        taskDescription,
        notes,
        priority: priority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : null
      }
    });

    logger.info('Therapist task added', {
      taskId: task.id,
      relationshipId: relationship.id,
      therapistId: req.therapist.id
    });

    res.status(201).json({
      message: 'Task added successfully',
      task: {
        id: task.id,
        description: task.taskDescription,
        priority: task.priority,
        dueDate: task.dueDate,
        createdAt: task.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/therapist/tasks
 * Get tasks for current user's relationship
 */
router.get('/tasks', authenticate, async (req, res, next) => {
  try {
    const { status } = req.query; // 'pending', 'completed', 'all'

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

    const whereClause = {
      relationshipId: relationship.id
    };

    if (status === 'pending') {
      whereClause.completed = false;
    } else if (status === 'completed') {
      whereClause.completed = true;
    }

    const tasks = await req.prisma.therapistTask.findMany({
      where: whereClause,
      orderBy: [
        { completed: 'asc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({
      tasks: tasks.map(t => ({
        id: t.id,
        description: t.taskDescription,
        notes: t.notes,
        dueDate: t.dueDate,
        priority: t.priority,
        completed: t.completed,
        completedAt: t.completedAt,
        assignedToUserId: t.assignedToUserId,
        createdAt: t.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/therapist/tasks/:id/complete
 * Mark a therapist task as complete
 */
router.patch('/tasks/:id/complete', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await req.prisma.therapistTask.findUnique({
      where: { id },
      include: { relationship: true }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Verify user is part of the relationship
    if (task.relationship.user1Id !== req.user.id &&
        task.relationship.user2Id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updated = await req.prisma.therapistTask.update({
      where: { id },
      data: {
        completed: true,
        completedAt: new Date()
      }
    });

    logger.info('Therapist task completed', {
      taskId: id,
      userId: req.user.id
    });

    res.json({
      message: 'Task completed',
      task: {
        id: updated.id,
        completed: updated.completed,
        completedAt: updated.completedAt
      }
    });
  } catch (error) {
    next(error);
  }
});

// ─── Consent Management ───────────────────────────────────────────

/**
 * POST /api/therapist/consent
 * Grant/revoke individual therapist consent
 */
router.post('/consent', authenticate, async (req, res, next) => {
  try {
    const { consent } = req.body;

    const relationship = await req.prisma.relationship.findFirst({
      where: {
        OR: [
          { user1Id: req.user.id },
          { user2Id: req.user.id }
        ],
        status: 'active'
      }
    });

    if (!relationship) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    // Determine which user field to update
    const isUser1 = relationship.user1Id === req.user.id;
    const updateData = isUser1
      ? { user1TherapistConsent: consent === true }
      : { user2TherapistConsent: consent === true };

    // Also update legacy sharedConsent for backward compat
    const updatedRel = await req.prisma.relationship.update({
      where: { id: relationship.id },
      data: updateData
    });

    // Update sharedConsent based on both individual consents
    const bothConsented = updatedRel.user1TherapistConsent && updatedRel.user2TherapistConsent;
    await req.prisma.relationship.update({
      where: { id: relationship.id },
      data: { sharedConsent: bothConsented }
    });

    // Log consent change
    await req.prisma.consentLog.create({
      data: {
        userId: req.user.id,
        relationshipId: relationship.id,
        consentType: 'therapist_access',
        granted: consent === true,
        ipAddress: req.ip
      }
    });

    // If revoking, also revoke therapist assignments
    if (!consent) {
      await req.prisma.therapistAssignment.updateMany({
        where: { relationshipId: relationship.id, status: 'active' },
        data: { status: 'revoked', revokedAt: new Date() }
      });
    }

    logger.info('Therapist consent updated', {
      userId: req.user.id,
      relationshipId: relationship.id,
      consent,
      isUser1
    });

    res.json({
      message: consent ? 'Consent granted' : 'Consent revoked',
      consent,
      bothConsented
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/therapist/consent
 * Check therapist integration consent status (per-user)
 */
router.get('/consent', authenticate, async (req, res, next) => {
  try {
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

    const isUser1 = relationship.user1Id === req.user.id;

    res.json({
      consent: relationship.sharedConsent,
      myConsent: isUser1 ? relationship.user1TherapistConsent : relationship.user2TherapistConsent,
      partnerConsent: isUser1 ? relationship.user2TherapistConsent : relationship.user1TherapistConsent,
      bothConsented: relationship.user1TherapistConsent && relationship.user2TherapistConsent
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/therapist/consent/history
 * View consent change history
 */
router.get('/consent/history', authenticate, async (req, res, next) => {
  try {
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

    const history = await req.prisma.consentLog.findMany({
      where: { relationshipId: relationship.id },
      orderBy: { grantedAt: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    res.json({ history });
  } catch (error) {
    next(error);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// THERAPIST DASHBOARD — Phase 1 MVP Endpoints
// ═══════════════════════════════════════════════════════════════════════════

// ─── Client Linking (Invite / Accept) ─────────────────────────────

/**
 * POST /api/therapist/clients/link
 * Therapist sends an invite code to a client. Client accepts with a consent level.
 * If called by therapist: creates a PENDING link with an invite code.
 * If called by client (with inviteCode + permissionLevel): accepts the link.
 */
router.post('/clients/link', async (req, res, next) => {
  try {
    const { inviteCode, permissionLevel, clientEmail } = req.body;

    // ── Client accepting an invite ──
    if (inviteCode) {
      // Run authenticate middleware inline for the client-accept branch
      await new Promise((resolve, reject) => {
        authenticate(req, res, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const link = await req.prisma.therapistClient.findFirst({
        where: { inviteCode, consentStatus: 'PENDING' },
      });

      if (!link) {
        return res.status(404).json({ error: 'Invalid or expired invite code' });
      }

      // Client must match the link's clientId OR we update it
      const level = permissionLevel || 'BASIC';
      if (!['BASIC', 'STANDARD', 'FULL'].includes(level)) {
        return res.status(400).json({ error: 'permissionLevel must be BASIC, STANDARD, or FULL' });
      }

      // Find the client's relationship for couple linking
      const relationship = await req.prisma.relationship.findFirst({
        where: {
          OR: [{ user1Id: req.user.id }, { user2Id: req.user.id }],
          status: 'active',
        },
      });

      const updated = await req.prisma.therapistClient.update({
        where: { id: link.id },
        data: {
          clientId: req.user.id,
          coupleId: relationship?.id || null,
          consentStatus: 'GRANTED',
          consentGrantedAt: new Date(),
          permissionLevel: level,
          inviteCode: null, // Clear invite code after use
        },
      });

      logger.info('Client accepted therapist link', {
        linkId: updated.id,
        clientId: req.user.id,
        therapistId: updated.therapistId,
        permissionLevel: level,
      });

      return res.json({
        message: 'Therapist link accepted',
        link: {
          id: updated.id,
          therapistId: updated.therapistId,
          permissionLevel: updated.permissionLevel,
          consentStatus: updated.consentStatus,
        },
      });
    }

    // ── Therapist creating an invite ──
    // Run authenticateTherapist middleware inline for the therapist-invite branch
    await new Promise((resolve, reject) => {
      authenticateTherapist(req, res, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    if (!req.therapist) {
      return res.status(401).json({ error: 'Therapist authentication required to create invite links' });
    }

    if (!clientEmail) {
      return res.status(400).json({ error: 'clientEmail is required to create an invite' });
    }

    // Find the client user
    const clientUser = await req.prisma.user.findUnique({
      where: { email: clientEmail.toLowerCase() },
    });

    if (!clientUser) {
      return res.status(404).json({ error: 'No user found with that email' });
    }

    // Check for existing link
    const existing = await req.prisma.therapistClient.findFirst({
      where: { therapistId: req.therapist.id, clientId: clientUser.id },
    });

    if (existing && existing.consentStatus === 'GRANTED') {
      return res.status(409).json({ error: 'Already linked to this client' });
    }

    const code = `tc_${uuidv4().replace(/-/g, '').substring(0, 12)}`;

    let link;
    if (existing) {
      link = await req.prisma.therapistClient.update({
        where: { id: existing.id },
        data: { inviteCode: code, consentStatus: 'PENDING', consentRevokedAt: null },
      });
    } else {
      link = await req.prisma.therapistClient.create({
        data: {
          therapistId: req.therapist.id,
          clientId: clientUser.id,
          inviteCode: code,
          consentStatus: 'PENDING',
        },
      });
    }

    logger.info('Therapist invite created', {
      linkId: link.id,
      therapistId: req.therapist.id,
      clientEmail,
    });

    res.status(201).json({
      message: 'Invite created. Share this code with your client.',
      inviteCode: code,
      linkId: link.id,
    });
  } catch (error) {
    next(error);
  }
});

// ─── List Linked Clients ──────────────────────────────────────────

/**
 * GET /api/therapist/clients
 * List all linked clients/couples with latest stats
 */
router.get('/clients', authenticateTherapist, async (req, res, next) => {
  try {
    const links = await req.prisma.therapistClient.findMany({
      where: { therapistId: req.therapist.id, consentStatus: 'GRANTED' },
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

    // Fetch latest stats for each client
    const clientsWithStats = await Promise.all(
      links.map(async (link) => {
        const [latestLog, courseProgress, alertCount] = await Promise.all([
          req.prisma.dailyLog.findFirst({
            where: { userId: link.clientId, therapistVisible: true },
            orderBy: { date: 'desc' },
            select: { date: true, mood: true, closenessScore: true, positiveCount: true, negativeCount: true },
          }),
          req.prisma.courseProgress.findFirst({
            where: { userId: link.clientId },
            select: { currentWeek: true, isActive: true },
          }),
          req.prisma.therapistAlert.count({
            where: { therapistId: req.therapist.id, clientId: link.clientId, readAt: null },
          }),
        ]);

        return {
          linkId: link.id,
          permissionLevel: link.permissionLevel,
          consentGrantedAt: link.consentGrantedAt,
          client: link.client,
          couple: link.couple,
          latestLog,
          courseProgress,
          unreadAlerts: alertCount,
        };
      })
    );

    res.json({ clients: clientsWithStats });
  } catch (error) {
    next(error);
  }
});

// ─── Client Progress Dashboard ────────────────────────────────────

/**
 * GET /api/therapist/clients/:id/progress
 * Full progress dashboard: assessment scores over time, activity completion, streaks
 */
router.get(
  '/clients/:id/progress',
  authenticateTherapist,
  requireClientAccess('assessment_scores'),
  async (req, res, next) => {
    try {
      const clientId = req.params.id;
      const permLevel = req.therapistClient.permissionLevel;

      const [assessments, logs, courseProgress, tasks] = await Promise.all([
        // Assessment scores over time
        req.prisma.assessment.findMany({
          where: { userId: clientId },
          select: { type: true, score: true, completedAt: true },
          orderBy: { completedAt: 'asc' },
        }),
        // Daily logs (last 90 days)
        req.prisma.dailyLog.findMany({
          where: {
            userId: clientId,
            therapistVisible: true,
            date: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
          },
          orderBy: { date: 'asc' },
        }),
        // Course progress
        req.prisma.courseProgress.findFirst({
          where: { userId: clientId },
          include: { weeklyStrategies: { orderBy: { weekNumber: 'asc' } } },
        }),
        // Task completion
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
      const logDates = new Set(logs.map(l => new Date(l.date).toISOString().split('T')[0]));
      for (let i = 0; i < 90; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        if (logDates.has(d.toISOString().split('T')[0])) {
          streak++;
        } else if (i > 0) break;
      }

      // Build response, filtering by permission
      const response = {
        assessmentScores: assessments.map(a => ({
          type: a.type,
          score: a.score,
          completedAt: a.completedAt,
        })),
        activityCompletion: {
          totalDays: 90,
          daysActive: logs.length,
          completionRate: Math.round((logs.length / 90) * 100),
          streak,
          tasksCompleted: tasks.filter(t => t.completed).length,
          tasksPending: tasks.filter(t => !t.completed).length,
        },
        courseProgress: courseProgress
          ? {
              currentWeek: courseProgress.currentWeek,
              isActive: courseProgress.isActive,
              completedWeeks: courseProgress.completedWeeks,
              weeklyStrategies: courseProgress.weeklyStrategies.map(ws => ({
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
          .filter(l => l.mood != null)
          .map(l => ({ date: l.date, mood: l.mood, closeness: l.closenessScore }));
        response.ratioTrends = logs.map(l => ({
          date: l.date,
          positive: l.positiveCount,
          negative: l.negativeCount,
          ratio: l.negativeCount > 0 ? (l.positiveCount / l.negativeCount) : null,
        }));
      }

      res.json(filterByPermission(response, permLevel));
    } catch (error) {
      next(error);
    }
  }
);

// ─── Session Prep Report ──────────────────────────────────────────

/**
 * GET /api/therapist/clients/:id/session-prep
 * Auto-generated session prep report with expert insights
 */
router.get(
  '/clients/:id/session-prep',
  authenticateTherapist,
  requireClientAccess('session_prep'),
  async (req, res, next) => {
    try {
      const clientId = req.params.id;
      const lastSessionDate = req.query.lastSessionDate || null;

      const report = await generateSessionPrepReport(
        req.prisma,
        req.therapist.id,
        clientId,
        lastSessionDate
      );

      res.json({ report });
    } catch (error) {
      next(error);
    }
  }
);

// ─── Couple Dynamics View ─────────────────────────────────────────

/**
 * GET /api/therapist/couples/:id/dynamics
 * Side-by-side partner view with interaction patterns
 */
router.get(
  '/couples/:id/dynamics',
  authenticateTherapist,
  requireCoupleAccess('assessment_scores'),
  async (req, res, next) => {
    try {
      const coupleId = req.params.id;
      const permLevel = req.effectivePermissionLevel;

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

      const [assessments, logs, matchups, strategies] = await Promise.all([
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
        req.prisma.strategy.findMany({
          where: { relationshipId: coupleId },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

      // Split data by partner
      const user1Assessments = assessments.filter(a => a.userId === relationship.user1Id);
      const user2Assessments = assessments.filter(a => a.userId === relationship.user2Id);
      const user1Logs = logs.filter(l => l.userId === relationship.user1Id);
      const user2Logs = logs.filter(l => l.userId === relationship.user2Id);

      // Build side-by-side view
      const buildPartnerView = (user, userAssessments, userLogs) => {
        const view = {
          user,
          assessmentScores: userAssessments.map(a => ({
            type: a.type,
            score: a.score,
            completedAt: a.completedAt,
          })),
          activityDays: userLogs.length,
        };

        if (permLevel !== 'BASIC') {
          view.moodAvg = userLogs.filter(l => l.mood != null).length > 0
            ? userLogs.filter(l => l.mood != null).reduce((s, l) => s + l.mood, 0) / userLogs.filter(l => l.mood != null).length
            : null;
          view.ratioAvg = userLogs.length > 0
            ? (() => {
                const pos = userLogs.reduce((s, l) => s + (l.positiveCount || 0), 0);
                const neg = userLogs.reduce((s, l) => s + (l.negativeCount || 0), 0);
                return neg > 0 ? +(pos / neg).toFixed(2) : pos > 0 ? 99 : 0;
              })()
            : null;
        }

        return view;
      };

      const response = {
        couple: {
          id: relationship.id,
          status: relationship.status,
        },
        partner1: buildPartnerView(relationship.user1, user1Assessments, user1Logs),
        partner2: relationship.user2
          ? buildPartnerView(relationship.user2, user2Assessments, user2Logs)
          : null,
        matchups: matchups.map(m => ({
          score: m.score,
          alignments: m.alignments,
          generatedAt: m.generatedAt,
        })),
        activeStrategy: strategies.length > 0
          ? { week: strategies[0].week, progress: strategies[0].progress, isActive: strategies[0].isActive }
          : null,
      };

      res.json(filterByPermission(response, permLevel));
    } catch (error) {
      next(error);
    }
  }
);

// ─── Alerts ───────────────────────────────────────────────────────

/**
 * GET /api/therapist/alerts
 * All active (unread) alerts for the therapist — crisis, risk, milestone, stagnation
 */
router.get('/alerts', authenticateTherapist, async (req, res, next) => {
  try {
    const { type, unreadOnly } = req.query;

    const where = { therapistId: req.therapist.id };
    if (type) where.alertType = type;
    if (unreadOnly === 'true') where.readAt = null;

    const alerts = await req.prisma.therapistAlert.findMany({
      where,
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: [{ readAt: 'asc' }, { severity: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });

    res.json({
      alerts: alerts.map(a => ({
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
      unreadCount: alerts.filter(a => !a.readAt).length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/therapist/alerts/:id/read
 * Mark an alert as read
 */
router.put('/alerts/:id/read', authenticateTherapist, async (req, res, next) => {
  try {
    const alert = await req.prisma.therapistAlert.findUnique({
      where: { id: req.params.id },
    });

    if (!alert || alert.therapistId !== req.therapist.id) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const updated = await req.prisma.therapistAlert.update({
      where: { id: req.params.id },
      data: { readAt: new Date() },
    });

    res.json({ message: 'Alert marked as read', alert: { id: updated.id, readAt: updated.readAt } });
  } catch (error) {
    next(error);
  }
});

// ─── Assign Modules/Activities ────────────────────────────────────

/**
 * POST /api/therapist/clients/:id/assign
 * Assign specific LoveRescue modules/activities to a client
 */
router.post(
  '/clients/:id/assign',
  authenticateTherapist,
  requireClientAccess(),
  async (req, res, next) => {
    try {
      const clientId = req.params.id;
      const { taskDescription, notes, dueDate, priority, module, activities } = req.body;

      if (!taskDescription && !module) {
        return res.status(400).json({ error: 'taskDescription or module is required' });
      }

      // Find relationship for the client
      const relationship = await req.prisma.relationship.findFirst({
        where: {
          OR: [{ user1Id: clientId }, { user2Id: clientId }],
          status: 'active',
        },
      });

      if (!relationship) {
        return res.status(404).json({ error: 'No active relationship found for this client' });
      }

      // Build task description from module if provided
      const description = taskDescription || `Complete module: ${module}${activities ? ` — Activities: ${activities.join(', ')}` : ''}`;

      const task = await req.prisma.therapistTask.create({
        data: {
          relationshipId: relationship.id,
          therapistId: req.therapist.id,
          therapistEmail: req.therapist.email,
          assignedToUserId: clientId,
          taskDescription: description,
          notes: notes || (activities ? JSON.stringify({ module, activities }) : null),
          priority: priority || 'medium',
          dueDate: dueDate ? new Date(dueDate) : null,
        },
      });

      await logAccess(req.prisma, {
        accessorId: req.therapist.id,
        resourceType: 'task_assignment',
        resourceId: task.id,
        resourceOwnerId: clientId,
        action: 'write',
        accessGranted: true,
        ipAddress: req.ip,
      });

      logger.info('Therapist assigned activity to client', {
        taskId: task.id,
        therapistId: req.therapist.id,
        clientId,
      });

      res.status(201).json({
        message: 'Activity assigned',
        task: {
          id: task.id,
          description: task.taskDescription,
          priority: task.priority,
          dueDate: task.dueDate,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─── Longitudinal Outcomes ────────────────────────────────────────

/**
 * GET /api/therapist/outcomes
 * Longitudinal outcome data across entire caseload
 */
router.get('/outcomes', authenticateTherapist, async (req, res, next) => {
  try {
    // Get all active client links
    const links = await req.prisma.therapistClient.findMany({
      where: { therapistId: req.therapist.id, consentStatus: 'GRANTED' },
      select: { clientId: true, permissionLevel: true, consentGrantedAt: true },
    });

    const clientIds = links.map(l => l.clientId);

    if (clientIds.length === 0) {
      return res.json({ outcomes: { totalClients: 0, data: [] } });
    }

    // Aggregate data across caseload
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
        where: { therapistId: req.therapist.id, clientId: { in: clientIds } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    // Aggregate outcomes
    const outcomesByClient = clientIds.map(cid => {
      const clientAssessments = assessments.filter(a => a.userId === cid);
      const cp = courseProgressList.find(c => c.userId === cid);
      const alerts = recentAlerts.filter(a => a.clientId === cid);

      // Get first and latest assessment scores by type for delta
      const byType = {};
      for (const a of clientAssessments) {
        if (!byType[a.type]) byType[a.type] = { first: a, latest: a };
        if (new Date(a.completedAt) < new Date(byType[a.type].first.completedAt)) byType[a.type].first = a;
        if (new Date(a.completedAt) > new Date(byType[a.type].latest.completedAt)) byType[a.type].latest = a;
      }

      return {
        clientId: cid,
        assessmentTypes: Object.keys(byType).length,
        courseWeek: cp?.currentWeek || null,
        courseCompleted: cp?.completedAt != null,
        crisisAlerts: alerts.filter(a => a.alertType === 'CRISIS').length,
        milestones: alerts.filter(a => a.alertType === 'MILESTONE').length,
      };
    });

    // Caseload summary
    const summary = {
      totalClients: clientIds.length,
      activeInCourse: courseProgressList.filter(c => c.isActive).length,
      courseCompleted: courseProgressList.filter(c => c.completedAt != null).length,
      totalCrisisAlerts: recentAlerts.filter(a => a.alertType === 'CRISIS').length,
      totalMilestones: recentAlerts.filter(a => a.alertType === 'MILESTONE').length,
      avgCourseWeek: courseProgressList.length > 0
        ? +(courseProgressList.reduce((s, c) => s + c.currentWeek, 0) / courseProgressList.length).toFixed(1)
        : null,
    };

    res.json({
      outcomes: {
        summary,
        clients: outcomesByClient,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
