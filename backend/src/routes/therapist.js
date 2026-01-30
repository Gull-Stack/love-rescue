const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const {
  authenticate,
  authenticateTherapist,
  requireTherapistAssignment,
  requireBothConsent,
  loadRelationship
} = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// ─── Therapist Registration & Management ─────────────────────────

/**
 * POST /api/therapist/register
 * Register a new therapist account (returns API key — show once)
 */
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, licenseNumber, licenseState } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Email, password, first name, and last name are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await req.prisma.therapist.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

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

    // Check consent
    if (!relationship.user1TherapistConsent || !relationship.user2TherapistConsent) {
      return res.status(403).json({
        error: 'Both partners must consent to therapist integration',
        code: 'CONSENT_REQUIRED'
      });
    }

    const task = await req.prisma.therapistTask.create({
      data: {
        relationshipId: relationship.id,
        therapistId: req.therapist.id !== 'legacy' ? req.therapist.id : null,
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

module.exports = router;
