/**
 * Apple In-App Purchase (IAP) routes — DISABLED
 *
 * The app is now fully free. Apple IAP receipt validation is no longer performed.
 * This endpoint is retained for backward compatibility with older app versions
 * but simply returns a success response.
 *
 * The Stripe webhook remains active in routes/payments.js.
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/iap/verify
 * IAP disabled — app is free. Returns success without performing any validation.
 */
router.post('/verify', authenticate, async (req, res) => {
  res.json({
    success: true,
    message: 'LoveRescue is now free — no purchase verification required.',
    user: {
      id: req.user.id,
      email: req.user.email,
      subscriptionStatus: 'premium',
    },
  });
});

module.exports = router;
