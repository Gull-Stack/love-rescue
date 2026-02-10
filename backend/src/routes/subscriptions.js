const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Apple IAP prices are 40% higher than Stripe web prices.
 * Web: $9.99/mo, $79.99/yr
 * iOS: $13.99/mo, $109.99/yr
 */
const PRICING = {
  stripe: {
    monthly: 9.99,
    yearly: 79.99,
  },
  apple: {
    monthly: 13.99,  // ~40% higher
    yearly: 109.99,  // ~40% higher
  },
};

/**
 * GET /api/subscriptions/status
 * Unified subscription status check — works for both Stripe and Apple.
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        subscriptionStatus: true,
        subscriptionSource: true,
        trialEndsAt: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isActive = ['paid', 'premium'].includes(user.subscriptionStatus);
    const isTrial = user.subscriptionStatus === 'trial';
    const trialDaysLeft = isTrial && user.trialEndsAt
      ? Math.max(0, Math.ceil((new Date(user.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24)))
      : 0;

    res.json({
      status: user.subscriptionStatus,
      source: user.subscriptionSource,
      isActive,
      isTrial,
      trialDaysLeft,
      pricing: PRICING,
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    res.status(500).json({ error: 'Failed to check subscription status' });
  }
});

/**
 * POST /api/subscriptions/verify-apple
 * Verify an Apple IAP receipt with Apple's servers.
 * Body: { receiptData: string (base64 encoded receipt) }
 *
 * NOTE: In production, use Apple's /verifyReceipt endpoint.
 * For StoreKit 2, use the App Store Server API instead.
 */
router.post('/verify-apple', authenticate, async (req, res) => {
  try {
    const { receiptData } = req.body;

    if (!receiptData) {
      return res.status(400).json({ error: 'receiptData is required' });
    }

    // Verify with Apple
    const verificationResult = await verifyAppleReceipt(receiptData);

    if (!verificationResult.valid) {
      return res.status(400).json({ error: 'Invalid receipt', details: verificationResult.error });
    }

    // Update user subscription
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        subscriptionStatus: 'paid',
        subscriptionSource: 'APPLE',
        appleReceiptData: receiptData,
      },
    });

    res.json({
      success: true,
      status: 'paid',
      source: 'APPLE',
      expiresAt: verificationResult.expiresAt,
    });
  } catch (error) {
    console.error('Apple receipt verification error:', error);
    res.status(500).json({ error: 'Failed to verify Apple receipt' });
  }
});

/**
 * Verify receipt with Apple's servers.
 * Uses the /verifyReceipt endpoint (legacy). 
 * For StoreKit 2, migrate to App Store Server API.
 */
async function verifyAppleReceipt(receiptData) {
  const APPLE_VERIFY_URL_PROD = 'https://buy.itunes.apple.com/verifyReceipt';
  const APPLE_VERIFY_URL_SANDBOX = 'https://sandbox.itunes.apple.com/verifyReceipt';
  const APPLE_SHARED_SECRET = process.env.APPLE_SHARED_SECRET;

  if (!APPLE_SHARED_SECRET) {
    console.warn('APPLE_SHARED_SECRET not set — cannot verify receipts');
    return { valid: false, error: 'Server not configured for Apple IAP verification' };
  }

  const payload = {
    'receipt-data': receiptData,
    password: APPLE_SHARED_SECRET,
    'exclude-old-transactions': true,
  };

  try {
    // Try production first
    let response = await fetch(APPLE_VERIFY_URL_PROD, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    let result = await response.json();

    // Status 21007 means sandbox receipt sent to production — retry with sandbox
    if (result.status === 21007) {
      response = await fetch(APPLE_VERIFY_URL_SANDBOX, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      result = await response.json();
    }

    if (result.status !== 0) {
      return { valid: false, error: `Apple status code: ${result.status}` };
    }

    // Extract latest receipt info
    const latestReceipt = result.latest_receipt_info?.[0];
    if (!latestReceipt) {
      return { valid: false, error: 'No receipt info found' };
    }

    const expiresAt = new Date(parseInt(latestReceipt.expires_date_ms));
    const isExpired = expiresAt < new Date();

    if (isExpired) {
      return { valid: false, error: 'Subscription expired' };
    }

    return { valid: true, expiresAt: expiresAt.toISOString() };
  } catch (error) {
    console.error('Apple verification request failed:', error);
    return { valid: false, error: 'Network error verifying receipt' };
  }
}

module.exports = router;
