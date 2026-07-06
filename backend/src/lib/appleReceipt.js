/**
 * Apple App Store receipt validation (legacy /verifyReceipt endpoint).
 *
 * Entitlement is ALWAYS derived from Apple's validated response — never from
 * anything the client claims. The flow:
 *   1. POST the base64 receipt to the PRODUCTION endpoint.
 *   2. If Apple returns status 21007 ("this receipt is from the sandbox but was
 *      sent to production"), retry against the SANDBOX endpoint. This is the
 *      Apple-recommended order so a single code path works for both review
 *      builds and live installs.
 *   3. A receipt is entitling only when status === 0 AND it contains an
 *      auto-renewable subscription whose expiry is in the future.
 *
 * Uses `password` = APPLE_SHARED_SECRET (App Store Connect shared secret),
 * required for auto-renewable subscription receipts.
 */

const logger = require('../utils/logger');

const PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

// Apple status code meaning "sandbox receipt sent to production" — retry sandbox.
const SANDBOX_STATUS = 21007;

// Only OUR auto-renewable subscription products may entitle. Any other
// product_id in the receipt (a different app's product, a consumable, or an
// unexpected identifier) is ignored for entitlement/expiry purposes.
const DEFAULT_ALLOWED_PRODUCT_IDS = 'com.loverescue.premium.monthly,com.loverescue.annual';

function allowedProductIds() {
  return new Set(
    (process.env.APPLE_PRODUCT_IDS || DEFAULT_ALLOWED_PRODUCT_IDS)
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  );
}

async function callApple(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(`Apple verifyReceipt HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Validate a base64-encoded App Store receipt.
 *
 * @param {string} receiptData - base64 `receipt-data` from StoreKit.
 * @returns {Promise<{
 *   valid: boolean,
 *   environment: ('production'|'sandbox'|null),
 *   status: (number|null),
 *   expiresAt: (Date|null),
 *   productId: (string|null),
 *   originalTransactionId: (string|null),
 *   latestReceipt: (string|null),
 *   raw: (object|null),
 *   error: (string|null)
 * }>}
 */
async function validateAppleReceipt(receiptData) {
  if (!receiptData || typeof receiptData !== 'string') {
    return {
      valid: false, environment: null, status: null, expiresAt: null,
      productId: null, originalTransactionId: null, latestReceipt: null, raw: null,
      error: 'Missing or invalid receipt data'
    };
  }

  const requestBody = {
    'receipt-data': receiptData,
    password: process.env.APPLE_SHARED_SECRET,
    'exclude-old-transactions': true
  };

  let response;
  let environment = 'production';
  try {
    response = await callApple(PRODUCTION_URL, requestBody);
    if (response && response.status === SANDBOX_STATUS) {
      environment = 'sandbox';
      response = await callApple(SANDBOX_URL, requestBody);
    }
  } catch (err) {
    logger.error('Apple receipt validation request failed', { error: err.message });
    return {
      valid: false, environment: null, status: null, expiresAt: null,
      productId: null, originalTransactionId: null, latestReceipt: null, raw: null,
      error: 'Could not reach Apple for receipt validation'
    };
  }

  if (!response || response.status !== 0) {
    return {
      valid: false,
      environment,
      status: response ? response.status : null,
      expiresAt: null,
      productId: null,
      originalTransactionId: null,
      latestReceipt: null,
      raw: response || null,
      error: `Apple rejected the receipt (status ${response ? response.status : 'unknown'})`
    };
  }

  // Prefer `latest_receipt_info` (auto-renewable subscriptions); fall back to
  // the top-level receipt's in-app purchases. Only entries whose product_id is
  // in our allowlist (APPLE_PRODUCT_IDS) count toward entitlement/expiry — a
  // valid receipt for someone else's product must grant nothing. Among the
  // allowed entries, choose the one with the furthest-future expiry so
  // renewals supersede earlier transactions.
  const infos =
    (Array.isArray(response.latest_receipt_info) && response.latest_receipt_info.length
      ? response.latest_receipt_info
      : response.receipt && Array.isArray(response.receipt.in_app)
        ? response.receipt.in_app
        : []) || [];

  const allowed = allowedProductIds();
  let bestExpiry = null;
  let bestProductId = null;
  let bestOriginalTransactionId = null;
  for (const info of infos) {
    if (!allowed.has(info.product_id)) continue;
    const expMs = Number(info.expires_date_ms || info.expires_date || 0);
    if (!expMs) continue;
    if (bestExpiry === null || expMs > bestExpiry) {
      bestExpiry = expMs;
      bestProductId = info.product_id || null;
      bestOriginalTransactionId = info.original_transaction_id || null;
    }
  }

  const expiresAt = bestExpiry ? new Date(bestExpiry) : null;
  const isActive = !!(expiresAt && expiresAt.getTime() > Date.now());

  return {
    valid: isActive,
    environment,
    status: 0,
    expiresAt,
    productId: bestProductId,
    originalTransactionId: bestOriginalTransactionId,
    latestReceipt: response.latest_receipt || receiptData,
    raw: response,
    error: isActive ? null : 'Subscription is expired or contains no active auto-renewable purchase for a recognized product'
  };
}

module.exports = {
  validateAppleReceipt,
  PRODUCTION_URL,
  SANDBOX_URL,
  SANDBOX_STATUS
};
