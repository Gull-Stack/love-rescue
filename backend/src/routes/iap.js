/**
 * Apple In-App Purchase (IAP) routes.
 *
 * POST /verify — real Apple App Store receipt validation. Posts the receipt to
 * the production verifyReceipt endpoint and, on status 21007, retries against
 * sandbox. On a valid active auto-renewable receipt the user is granted premium
 * with subscriptionSource APPLE; invalid/expired receipts grant nothing. The
 * same path serves "restore purchases" (client re-sends the receipt). The
 * client's claimed status is never trusted.
 *
 * The Stripe webhook remains the Stripe entitlement writer in routes/payments.js.
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { applyAppleReceipt } = require('../lib/appleEntitlement');

const router = express.Router();

/**
 * POST /api/iap/verify  { receipt }  (optional { restore: true } — same path)
 * Returns { success, subscriptionStatus, source, expiresAt } on success, or an
 * error with the appropriate status on rejection.
 */
router.post('/verify', authenticate, async (req, res) => {
  const receipt = req.body?.receipt || req.body?.receiptData;
  const result = await applyAppleReceipt(req.prisma, req.user.id, receipt);

  if (!result.success) {
    return res.status(result.status || 400).json({ error: result.error });
  }

  return res.json({
    success: true,
    subscriptionStatus: 'premium',
    source: 'APPLE',
    expiresAt: result.expiresAt
  });
});

module.exports = router;
