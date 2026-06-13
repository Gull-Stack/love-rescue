'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

const BILLING_URL = process.env.BILLING_URL || 'https://billing.loverescue.app';

/**
 * GET /api/billing/sso-url
 * Mints a short-lived SSO token and returns the redirect URL for billing.loverescue.app.
 * Requires the caller to be logged in as a therapist (role === 'therapist').
 */
router.get('/sso-url', authenticate, async (req, res, next) => {
  try {
    const secret = process.env.BILLING_SSO_SECRET;
    if (!secret) {
      logger.error('BILLING_SSO_SECRET is not set');
      return res.status(503).json({ error: 'Billing SSO is not configured' });
    }

    const user = req.user;
    if (user.role !== 'therapist' && !user.isPlatformAdmin) {
      return res.status(403).json({ error: 'Therapist role required to access billing' });
    }

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
        // practiceId is derived server-side by the billing app from the email; we do NOT assert it here.
      },
      secret,
      { expiresIn: '5m', issuer: 'loverescue-app' }
    );

    const url = `${BILLING_URL}/api/auth/sso?token=${encodeURIComponent(token)}`;
    logger.info('Billing SSO token issued', { userId: user.id, email: user.email });

    res.json({ url });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
