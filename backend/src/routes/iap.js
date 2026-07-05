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
 * IAP disabled — app is free. Returns a 200 for backward compatibility with
 * old app versions, but deliberately does NOT return a subscriptionStatus or
 * user object: no receipt validation is performed here, so the response must
 * never be interpretable as a verified entitlement.
 *
 * IMPORTANT(billing): before billing is ever re-enabled, this endpoint MUST
 * implement real Apple receipt validation (App Store Server API /
 * verifyReceipt) and derive entitlement from the validated receipt — never
 * from the client's claim.
 */
router.post('/verify', authenticate, async (req, res) => {
  res.json({
    success: true,
    free: true,
    message: 'LoveRescue is now free — no purchase verification required.',
  });
});

module.exports = router;
