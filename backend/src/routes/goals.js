const express = require('express');
const { authenticate, requireSubscription, loadRelationship } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/goals
 * Get shared goals for the couple
 */
router.get('/', authenticate, loadRelationship, async (req, res, next) => {
  try {
    const { status } = req.query; // 'active', 'completed', 'abandoned', or omit for all

    const where = { relationshipId: req.relationship.id };
    if (status) {
      where.status = status;
    }

    const goals = await req.prisma.sharedGoal.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        creator: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    res.json({ goals });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/goals
 * Create a new shared goal
 */
router.post('/', authenticate, requireSubscription, loadRelationship, async (req, res, next) => {
  try {
    const { title, description, targetDate } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Goal title is required' });
    }

    const goal = await req.prisma.sharedGoal.create({
      data: {
        relationshipId: req.relationship.id,
        title,
        description,
        targetDate: targetDate ? new Date(targetDate) : null,
        createdBy: req.user.id
      },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    logger.info('Shared goal created', {
      goalId: goal.id,
      userId: req.user.id,
      relationshipId: req.relationship.id
    });

    res.status(201).json({ goal });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/goals/:id
 * Update a shared goal (status, title, description)
 */
router.patch('/:id', authenticate, loadRelationship, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, targetDate, status } = req.body;

    const goal = await req.prisma.sharedGoal.findUnique({ where: { id } });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    if (goal.relationshipId !== req.relationship.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (targetDate !== undefined) updateData.targetDate = targetDate ? new Date(targetDate) : null;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'completed') updateData.completedAt = new Date();
    }

    const updated = await req.prisma.sharedGoal.update({
      where: { id },
      data: updateData,
      include: {
        creator: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    logger.info('Shared goal updated', { goalId: id, userId: req.user.id, status });

    res.json({ goal: updated });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/goals/:id
 * Delete a shared goal
 */
router.delete('/:id', authenticate, loadRelationship, async (req, res, next) => {
  try {
    const { id } = req.params;

    const goal = await req.prisma.sharedGoal.findUnique({ where: { id } });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    if (goal.relationshipId !== req.relationship.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await req.prisma.sharedGoal.delete({ where: { id } });

    logger.info('Shared goal deleted', { goalId: id, userId: req.user.id });

    res.json({ message: 'Goal deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
