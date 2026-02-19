/**
 * Upgrade routes — DISABLED
 *
 * The app is now fully free. Checkout sessions and upgrade email links
 * are no longer available. All endpoints return a clear "not applicable" response.
 *
 * The Stripe webhook is still handled in routes/payments.js.
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/upgrade/send-link
 * Disabled — app is free.
 */
router.post('/send-link', authenticate, (req, res) => {
  res.status(410).json({
    error: 'LoveRescue is now free. No upgrade required.',
    code: 'APP_IS_FREE',
  });
});

/**
 * POST /api/upgrade/checkout
 * Disabled — app is free.
 */
router.post('/checkout', authenticate, (req, res) => {
  res.status(410).json({
    error: 'LoveRescue is now free. No checkout required.',
    code: 'APP_IS_FREE',
  });
});

module.exports = router;
