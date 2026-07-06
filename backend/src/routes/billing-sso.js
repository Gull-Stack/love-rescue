'use strict';

const crypto = require('crypto');
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

    // Token contract with the billing app (billing.loverescue.app). The
    // billing side MUST:
    //   (a) validate BOTH `iss` ('loverescue-app') and `aud`
    //       ('loverescue-billing') — never accept a token minted for another
    //       audience;
    //   (b) enforce one-time redemption of `jti`: record each redeemed jti
    //       until its `exp` and reject replays;
    //   (c) prefer receiving the token via POST body (`redeemUrl` below)
    //       rather than a query-param GET — query strings leak into server
    //       logs, proxies, and browser history. The query-param `url` is kept
    //       only for compatibility until the frontend migrates to the POST
    //       handoff.
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
        jti: crypto.randomUUID(), // single-use id — billing side enforces one-time redemption
        // practiceId is derived server-side by the billing app from the email; we do NOT assert it here.
      },
      secret,
      { expiresIn: '120s', issuer: 'loverescue-app', audience: 'loverescue-billing' }
    );

    // Legacy handoff (GET with token in query string) — kept for compatibility.
    const url = `${BILLING_URL}/api/auth/sso?token=${encodeURIComponent(token)}`;
    // Preferred handoff: frontend POSTs { token } to redeemUrl.
    const redeemUrl = `${BILLING_URL}/api/auth/sso`;
    logger.info('Billing SSO token issued', { userId: user.id, email: user.email });

    res.json({ url, token, redeemUrl });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
