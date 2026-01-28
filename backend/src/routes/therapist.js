const express = require('express');
const { authenticate, requireSubscription } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Middleware to verify therapist API key
 */
const verifyTherapistKey = (req, res, next) => {
  const apiKey = req.headers['x-therapist-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  // In production, validate against stored therapist API keys
  // For now, check against environment variable
  if (apiKey !== process.env.THERAPIST_API_KEY) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  next();
};

/**
 * POST /api/therapist/tasks/add
 * Add a task to a relationship (therapist endpoint)
 */
router.post('/tasks/add', verifyTherapistKey, async (req, res, next) => {
  try {
    const {
      relationshipId,
      userEmail,
      taskDescription,
      notes,
      dueDate,
      therapistEmail
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
            ]
          }
        });
      }
    }

    if (!relationship) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    // Check if users have consented to therapist integration
    if (!relationship.sharedConsent) {
      return res.status(403).json({
        error: 'Users have not consented to therapist integration',
        code: 'CONSENT_REQUIRED'
      });
    }

    const task = await req.prisma.therapistTask.create({
      data: {
        relationshipId: relationship.id,
        therapistEmail,
        taskDescription,
        notes,
        dueDate: dueDate ? new Date(dueDate) : null
      }
    });

    logger.info('Therapist task added', {
      taskId: task.id,
      relationshipId: relationship.id,
      therapistEmail
    });

    res.status(201).json({
      message: 'Task added successfully',
      task: {
        id: task.id,
        description: task.taskDescription,
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
        completed: t.completed,
        completedAt: t.completedAt,
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

/**
 * POST /api/therapist/consent
 * Grant consent for therapist integration
 */
router.post('/consent', authenticate, async (req, res, next) => {
  try {
    const { consent } = req.body;

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

    await req.prisma.relationship.update({
      where: { id: relationship.id },
      data: { sharedConsent: consent === true }
    });

    logger.info('Therapist consent updated', {
      relationshipId: relationship.id,
      consent
    });

    res.json({
      message: consent ? 'Consent granted' : 'Consent revoked',
      consent
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/therapist/consent
 * Check therapist integration consent status
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

    res.json({
      consent: relationship.sharedConsent
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
