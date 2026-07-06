/**
 * Subscriptions routes.
 *
 * GET /status          — real couple-aware subscription state.
 * POST /verify-apple   — real Apple App Store receipt validation; entitlement
 *                        is derived from Apple's validated response, never the
 *                        client's claim. Also serves iOS "restore purchases".
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { resolveEntitlement } = require('../lib/entitlement');
const { applyAppleReceipt } = require('../lib/appleEntitlement');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/subscriptions/status
 * Returns { status, source, isActive, isTrial, trialDaysLeft, coveredByPartner }.
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        subscriptionStatus: true,
        subscriptionSource: true,
        appleExpiresAt: true, // resolver needs it to expire lapsed Apple entitlements
        trialEndsAt: true
      }
    });

    const entitlement = req.entitlement
      || await resolveEntitlement(req.prisma, { id: req.user.id, ...user });

    res.json({
      status: entitlement.status,
      source: user.subscriptionSource || 'NONE',
      isActive: entitlement.isEntitled,
      isTrial: entitlement.isTrial,
      trialDaysLeft: entitlement.trialDaysRemaining,
      coveredByPartner: entitlement.coveredByPartner
    });
  } catch (error) {
    logger.error('Subscription status error', { error: error.message });
    res.status(500).json({ error: 'Failed to check subscription status' });
  }
});

/**
 * POST /api/subscriptions/verify-apple  { receipt }
 * Real Apple receipt validation (production, sandbox fallback on 21007). On a
 * valid active auto-renewable receipt, sets the user's entitlement to premium
 * with subscriptionSource APPLE. Rejects invalid/expired receipts with no
 * entitlement. Supports restore (same validation path).
 */
router.post('/verify-apple', authenticate, async (req, res, next) => {
  try {
    const receipt = req.body?.receipt || req.body?.receiptData;
    const result = await applyAppleReceipt(req.prisma, req.user.id, receipt);

    if (!result.success) {
      return res.status(result.status || 400).json({
        error: result.error,
        ...(result.code ? { code: result.code } : {})
      });
    }

    return res.json({
      success: true,
      subscriptionStatus: 'premium',
      source: 'APPLE',
      expiresAt: result.expiresAt
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
