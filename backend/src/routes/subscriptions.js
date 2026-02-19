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
 * Disabled — IAP is no longer used. Returns a no-op success.
 */
router.post('/verify-apple', authenticate, async (req, res) => {
  res.json({
    success: true,
    status: 'premium',
    source: 'FREE',
    message: 'App is free — no receipt verification required.',
  });
});

module.exports = router;
