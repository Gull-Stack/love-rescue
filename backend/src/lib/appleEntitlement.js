/**
 * Apply an Apple receipt to a user's entitlement.
 *
 * Shared by POST /api/iap/verify and POST /api/subscriptions/verify-apple (and
 * their "restore" variants — restore is just re-validation of a receipt). The
 * entitlement written to the User is ALWAYS derived from Apple's validated
 * response, never from anything the client claims.
 */

const { validateAppleReceipt } = require('./appleReceipt');
const logger = require('../utils/logger');

/**
 * @param {object} prisma
 * @param {string} userId
 * @param {string} receiptData - base64 App Store receipt.
 * @returns {Promise<{ success: boolean, status?: number, error?: string,
 *   expiresAt?: (Date|null), productId?: (string|null),
 *   environment?: string }>}
 */
async function applyAppleReceipt(prisma, userId, receiptData) {
  if (!receiptData) {
    return { success: false, status: 400, error: 'Receipt is required' };
  }

  const result = await validateAppleReceipt(receiptData);

  if (!result.valid) {
    // Invalid, expired, or unreachable — grant NOTHING and do not touch the user.
    logger.info('Apple receipt rejected — no entitlement granted', {
      userId,
      status: result.status,
      environment: result.environment
    });
    return {
      success: false,
      status: 402,
      error: result.error || 'Receipt is not valid or has expired',
      environment: result.environment
    };
  }

  // Valid, active auto-renewable subscription → premium via Apple.
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: 'premium',
      subscriptionSource: 'APPLE',
      appleReceiptData: result.latestReceipt || receiptData,
      appleExpiresAt: result.expiresAt
    }
  });

  logger.info('Apple entitlement applied', {
    userId,
    environment: result.environment,
    expiresAt: result.expiresAt,
    productId: result.productId
  });

  return {
    success: true,
    expiresAt: result.expiresAt,
    productId: result.productId,
    environment: result.environment
  };
}

module.exports = { applyAppleReceipt };
