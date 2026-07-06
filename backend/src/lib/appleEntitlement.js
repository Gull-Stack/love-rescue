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
 *   code?: string, expiresAt?: (Date|null), productId?: (string|null),
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

  // Replay guard: one purchased receipt must not entitle unlimited accounts.
  // The entitling entry's original_transaction_id is bound to exactly one user
  // (unique column); a receipt already claimed by ANOTHER account is rejected,
  // while the same user re-verifying/restoring simply re-writes their own row.
  const originalTransactionId = result.originalTransactionId || null;
  if (originalTransactionId) {
    const holder = await prisma.user.findFirst({
      where: {
        appleOriginalTransactionId: originalTransactionId,
        id: { not: userId }
      },
      select: { id: true }
    });
    if (holder) {
      logger.warn('Apple receipt replay rejected — already linked to another account', {
        userId,
        holderId: holder.id,
        environment: result.environment
      });
      return {
        success: false,
        status: 409,
        error: 'This App Store purchase is already linked to another account',
        code: 'APPLE_RECEIPT_IN_USE',
        environment: result.environment
      };
    }
  }

  // Valid, active auto-renewable subscription → premium via Apple.
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: 'premium',
        subscriptionSource: 'APPLE',
        appleReceiptData: result.latestReceipt || receiptData,
        appleExpiresAt: result.expiresAt,
        // Only written when the receipt carried one — never clear a
        // previously-claimed transaction id on a re-verify.
        ...(originalTransactionId ? { appleOriginalTransactionId: originalTransactionId } : {})
      }
    });
  } catch (err) {
    // Unique-constraint backstop for a concurrent claim of the same receipt.
    if (err.code === 'P2002') {
      return {
        success: false,
        status: 409,
        error: 'This App Store purchase is already linked to another account',
        code: 'APPLE_RECEIPT_IN_USE',
        environment: result.environment
      };
    }
    throw err;
  }

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
