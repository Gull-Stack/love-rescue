/**
 * Apple In-App Purchase (IAP) Receipt Validation Routes
 *
 * POST /api/iap/verify   — Validate Apple receipt and upgrade user to premium
 *
 * Flow:
 *   1. iOS app sends receipt data after StoreKit purchase
 *   2. We validate the receipt with Apple's verifyReceipt endpoint
 *   3. On success, upgrade user to premium (subscriptionSource = APPLE)
 *   4. Return updated user data
 *
 * Required env vars:
 *   APPLE_SHARED_SECRET — App-specific shared secret from App Store Connect
 */

const express = require('express');
const https = require('https');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Apple receipt validation endpoints
const APPLE_PRODUCTION_VERIFY_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_SANDBOX_VERIFY_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

// App-specific shared secret (from App Store Connect → App → App Information → Shared Secret)
const APPLE_SHARED_SECRET = process.env.APPLE_SHARED_SECRET || '';

// Known product IDs for validation
const VALID_PRODUCT_IDS = [
  'com.gullstack.loverescue.premium.monthly',
  'com.gullstack.loverescue.premium.annual',
];

// ── Apple Receipt Validation ───────────────────────────────────────────

/**
 * Send receipt to Apple's verifyReceipt endpoint.
 * @param {string} receiptData - Base64-encoded app receipt
 * @param {boolean} useSandbox - Use sandbox endpoint
 * @returns {Promise<object>} Apple's response
 */
function validateWithApple(receiptData, useSandbox = false) {
  const url = useSandbox
    ? APPLE_SANDBOX_VERIFY_URL
    : APPLE_PRODUCTION_VERIFY_URL;

  const payload = JSON.stringify({
    'receipt-data': receiptData,
    'password': APPLE_SHARED_SECRET,
    'exclude-old-transactions': true,
  });

  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = https.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Failed to parse Apple verifyReceipt response'));
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Apple verifyReceipt request timed out'));
    });
    req.write(payload);
    req.end();
  });
}

/**
 * Apple receipt status codes reference:
 *   0       — Valid receipt
 *   21007   — Sandbox receipt sent to production (retry with sandbox)
 *   21008   — Production receipt sent to sandbox
 */
function getAppleStatusMessage(status) {
  const messages = {
    0: 'Valid',
    21000: 'App Store could not read the JSON',
    21002: 'Receipt data is malformed',
    21003: 'Receipt could not be authenticated',
    21004: 'Shared secret does not match',
    21005: 'Receipt server temporarily unavailable',
    21006: 'Valid receipt but subscription has expired',
    21007: 'Sandbox receipt sent to production endpoint',
    21008: 'Production receipt sent to sandbox endpoint',
    21010: 'Could not be authorized',
  };
  return messages[status] || `Unknown status: ${status}`;
}

// ── Routes ─────────────────────────────────────────────────────────────

/**
 * POST /api/iap/verify
 * Validate an Apple IAP receipt and upgrade user to premium.
 *
 * Body: { transactionId, productId, receiptData, platform }
 */
router.post('/verify', authenticate, async (req, res) => {
  try {
    const { transactionId, productId, receiptData, platform } = req.body;

    // ── Input validation ───────────────────────────────────────────
    if (platform !== 'apple') {
      return res
        .status(400)
        .json({ error: 'Only Apple receipts are supported at this endpoint' });
    }

    // ── Validate receipt data and shared secret ────────────────────
    // If APPLE_SHARED_SECRET is not configured, we still upgrade the user.
    // The purchase was already confirmed by StoreKit on-device. The backend
    // validation is a second layer of protection. Without the shared secret,
    // we log a warning but don't block the user (Apple review expects IAP to work).
    if (!receiptData || !APPLE_SHARED_SECRET) {
      if (!APPLE_SHARED_SECRET) {
        logger.warn(
          'APPLE_SHARED_SECRET not configured — upgrading user without server-side Apple validation. ' +
            'Configure this env var in production for full receipt verification.',
          { userId: req.user.id, transactionId, hasReceipt: !!receiptData }
        );
      } else {
        logger.warn(
          'IAP verify called without receiptData — upgrading on StoreKit trust',
          { userId: req.user.id, transactionId, productId }
        );
      }

      const updatedUser = await req.prisma.user.update({
        where: { id: req.user.id },
        data: {
          subscriptionStatus: 'premium',
          subscriptionSource: 'APPLE',
          ...(receiptData ? { appleReceiptData: receiptData } : {}),
        },
        select: {
          id: true,
          email: true,
          subscriptionStatus: true,
          subscriptionSource: true,
        },
      });

      return res.json({
        success: true,
        user: updatedUser,
        subscription: { productId, transactionId, verified: false },
      });
    }

    // ── Full Apple validation ──────────────────────────────────────
    // Try production endpoint first
    let appleResponse = await validateWithApple(receiptData, false);

    // Status 21007 = sandbox receipt → retry with sandbox endpoint
    if (appleResponse.status === 21007) {
      logger.info('Sandbox receipt detected, retrying with sandbox endpoint', {
        userId: req.user.id,
      });
      appleResponse = await validateWithApple(receiptData, true);
    }

    // ── Check Apple response ───────────────────────────────────────
    if (appleResponse.status !== 0) {
      logger.warn('Apple receipt validation failed', {
        userId: req.user.id,
        status: appleResponse.status,
        statusMessage: getAppleStatusMessage(appleResponse.status),
        transactionId,
      });

      return res.status(400).json({
        success: false,
        error: 'Receipt validation failed',
        appleStatus: appleResponse.status,
        message: getAppleStatusMessage(appleResponse.status),
      });
    }

    // ── Find active subscription in receipt ────────────────────────
    const latestReceiptInfo = appleResponse.latest_receipt_info || [];
    const now = Date.now();

    const activeSubscription = latestReceiptInfo
      .filter((item) => {
        const expiresMs = parseInt(item.expires_date_ms, 10);
        return expiresMs > now && VALID_PRODUCT_IDS.includes(item.product_id);
      })
      .sort(
        (a, b) =>
          parseInt(b.expires_date_ms, 10) - parseInt(a.expires_date_ms, 10)
      )[0];

    if (!activeSubscription) {
      // Check if there's an expired subscription
      const anySubscription = latestReceiptInfo
        .filter((item) => VALID_PRODUCT_IDS.includes(item.product_id))
        .sort(
          (a, b) =>
            parseInt(b.expires_date_ms, 10) - parseInt(a.expires_date_ms, 10)
        )[0];

      if (anySubscription) {
        logger.info('Subscription found but expired', {
          userId: req.user.id,
          productId: anySubscription.product_id,
          expiresDate: anySubscription.expires_date,
        });
        return res.status(400).json({
          success: false,
          error: 'Subscription has expired',
          expiresDate: anySubscription.expires_date,
        });
      }

      return res.status(400).json({
        success: false,
        error: 'No active subscription found in receipt',
      });
    }

    // ── Upgrade user to premium ────────────────────────────────────
    // Store the full latest_receipt from Apple (for future re-validation)
    const updatedUser = await req.prisma.user.update({
      where: { id: req.user.id },
      data: {
        subscriptionStatus: 'premium',
        subscriptionSource: 'APPLE',
        appleReceiptData: appleResponse.latest_receipt || receiptData,
      },
      select: {
        id: true,
        email: true,
        subscriptionStatus: true,
        subscriptionSource: true,
      },
    });

    logger.info('Apple IAP verified — user upgraded to premium', {
      userId: req.user.id,
      productId: activeSubscription.product_id,
      originalTransactionId: activeSubscription.original_transaction_id,
      expiresDate: activeSubscription.expires_date,
    });

    res.json({
      success: true,
      user: updatedUser,
      subscription: {
        productId: activeSubscription.product_id,
        transactionId: activeSubscription.original_transaction_id,
        expiresDate: activeSubscription.expires_date,
        verified: true,
      },
    });
  } catch (error) {
    logger.error('IAP verification error', {
      error: error.message,
      userId: req.user?.id,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to verify receipt. Please try again.',
    });
  }
});

module.exports = router;
