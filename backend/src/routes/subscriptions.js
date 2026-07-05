/**
 * Subscriptions routes — SIMPLIFIED
 *
 * The app is now fully free. All subscription status checks return "premium"
 * for all users. The verify-apple endpoint is retained but does nothing
 * meaningful since IAP is disabled.
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/subscriptions/status
 * Always returns premium status — all features are free.
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    res.json({
      status: 'premium',
      source: 'FREE',
      isActive: true,
      isTrial: false,
      trialDaysLeft: 0,
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    res.status(500).json({ error: 'Failed to check subscription status' });
  }
});

/**
 * POST /api/subscriptions/verify-apple
 * Disabled — IAP is no longer used. Returns a 200 for backward compatibility
 * with old app versions, but deliberately does NOT return a subscription
 * status: no receipt validation happens here, so the response must never be
 * interpretable as a verified entitlement.
 *
 * IMPORTANT(billing): before billing is ever re-enabled, this endpoint MUST
 * implement real Apple receipt validation (App Store Server API /
 * verifyReceipt) and derive entitlement from the validated receipt — never
 * from the client's claim.
 */
router.post('/verify-apple', authenticate, async (req, res) => {
  res.json({
    success: true,
    free: true,
    message: 'App is free — no receipt verification required.',
  });
});

module.exports = router;
