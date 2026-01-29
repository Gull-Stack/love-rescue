const express = require('express');
const { authenticate, requirePremium } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/mediators/available
 * Return active mediators with profile info and availability rules
 */
router.get('/available', authenticate, requirePremium, async (req, res, next) => {
  try {
    const mediators = await req.prisma.mediator.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        name: true,
        bio: true,
        availabilityRules: true,
        rate: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json({ mediators });
  } catch (error) {
    logger.error('Failed to fetch mediators', { error: error.message });
    next(error);
  }
});

module.exports = router;
