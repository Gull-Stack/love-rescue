/**
 * Apple Push Notification Service (APNs) Utility
 * Uses @parse/node-apn with the .p8 auth key
 */

const apn = require('@parse/node-apn');
const path = require('path');
const logger = require('./logger');

const APNS_KEY_ID = process.env.APNS_KEY_ID || 'V3FGPYWSFB';
const APNS_TEAM_ID = process.env.APNS_TEAM_ID || '2762667BPS';
const BUNDLE_ID = process.env.BUNDLE_ID || 'com.gullstack.loverescue';
const APNS_PRODUCTION = process.env.APNS_PRODUCTION === 'true' || process.env.NODE_ENV === 'production';

let apnProvider = null;

function getProvider() {
  if (apnProvider) return apnProvider;

  const keyPath = path.join(__dirname, '../../credentials/AuthKey_V3FGPYWSFB.p8');

  apnProvider = new apn.Provider({
    token: {
      key: keyPath,
      keyId: APNS_KEY_ID,
      teamId: APNS_TEAM_ID,
    },
    production: APNS_PRODUCTION,
  });

  logger.info(`APNs provider initialized (${APNS_PRODUCTION ? 'production' : 'sandbox'})`);
  return apnProvider;
}

/**
 * Send a push notification to an iOS device
 * @param {string} deviceToken - APNs device token
 * @param {object} options - { title, body, badge?, sound?, data? }
 */
async function sendToDevice(deviceToken, options) {
  const provider = getProvider();

  const notification = new apn.Notification();
  notification.topic = BUNDLE_ID;
  notification.expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  notification.sound = options.sound || 'default';
  notification.alert = {
    title: options.title,
    body: options.body,
  };

  if (options.badge !== undefined) {
    notification.badge = options.badge;
  }

  if (options.data) {
    notification.payload = options.data;
  }

  try {
    const result = await provider.send(notification, deviceToken);

    if (result.failed.length > 0) {
      const failure = result.failed[0];
      logger.error(`APNs send failed: ${failure.response?.reason || 'unknown'}`, {
        deviceToken: deviceToken.substring(0, 8) + '...',
        status: failure.status,
        reason: failure.response?.reason,
      });
      return { success: false, reason: failure.response?.reason };
    }

    logger.info(`APNs notification sent to ${deviceToken.substring(0, 8)}...`);
    return { success: true };
  } catch (error) {
    logger.error('APNs send error:', error);
    return { success: false, reason: error.message };
  }
}

/**
 * Send notification to a user's iOS device(s)
 * @param {object} prisma - Prisma client
 * @param {string} userId - User UUID
 * @param {object} options - { title, body, badge?, sound?, data? }
 */
async function sendToUser(prisma, userId, options) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushToken: true, pushPlatform: true },
  });

  if (!user?.pushToken || user.pushPlatform !== 'ios') {
    return { success: false, reason: 'No iOS push token' };
  }

  return sendToDevice(user.pushToken, options);
}

/**
 * Send notification to all iOS users
 * @param {object} prisma - Prisma client
 * @param {object} options - { title, body, badge?, sound?, data? }
 */
async function sendToAllIOS(prisma, options) {
  const users = await prisma.user.findMany({
    where: {
      pushPlatform: 'ios',
      pushToken: { not: null },
    },
    select: { id: true, pushToken: true },
  });

  const results = { sent: 0, failed: 0, errors: [] };

  for (const user of users) {
    const result = await sendToDevice(user.pushToken, options);
    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
      results.errors.push({ userId: user.id, reason: result.reason });

      // Clear invalid tokens
      if (['BadDeviceToken', 'Unregistered', 'DeviceTokenNotForTopic'].includes(result.reason)) {
        await prisma.user.update({
          where: { id: user.id },
          data: { pushToken: null, pushPlatform: null },
        });
        logger.info(`Cleared invalid APNs token for user ${user.id}`);
      }
    }
  }

  return results;
}

function shutdown() {
  if (apnProvider) {
    apnProvider.shutdown();
    apnProvider = null;
  }
}

module.exports = {
  sendToDevice,
  sendToUser,
  sendToAllIOS,
  shutdown,
};
