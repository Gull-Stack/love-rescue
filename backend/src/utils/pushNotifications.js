/**
 * Push Notification Utility
 * Used by cron jobs and internal services to send notifications
 */

const webpush = require('web-push');
const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');
const apns = require('./apns');

const prisma = new PrismaClient();

// Configure VAPID (idempotent - safe to call multiple times)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@loverescue.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

/**
 * Send notification to a specific user
 * @param {string} userId - User UUID
 * @param {object} notification - { title, body, icon?, badge?, tag?, data? }
 * @returns {object} - { success: number, failed: number, errors: array }
 */
async function sendToUser(userId, notification) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId, enabled: true }
  });

  if (subscriptions.length === 0) {
    return { success: 0, failed: 0, errors: ['No active subscriptions'] };
  }

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    icon: notification.icon || '/logo192.png',
    badge: notification.badge || '/logo192.png',
    tag: notification.tag || 'love-rescue',
    data: notification.data || { url: '/dashboard' }
  });

  // Also send via APNs if user has iOS token
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushToken: true, pushPlatform: true },
  });

  if (user?.pushToken && user.pushPlatform === 'ios') {
    const apnsResult = await apns.sendToDevice(user.pushToken, {
      title: notification.title,
      body: notification.body,
      sound: 'default',
      data: notification.data,
    });
    if (!apnsResult.success) {
      logger.warn(`APNs send failed for user ${userId}: ${apnsResult.reason}`);
    }
  }

  const results = { success: 0, failed: 0, errors: [] };

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      }, payload);

      await prisma.pushSubscription.update({
        where: { id: sub.id },
        data: { lastUsed: new Date() }
      });

      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(error.message);

      // Remove invalid subscriptions
      if (error.statusCode === 410 || error.statusCode === 404) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } });
        logger.info(`Removed expired subscription ${sub.id} for user ${userId}`);
      }
    }
  }

  return results;
}

/**
 * Send daily reminder to all users who have it enabled
 * Should be called by a cron job at the start of each hour
 */
async function sendDailyReminders() {
  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();

  // Get all users with reminders enabled who should receive one now
  // We check users whose local time matches their reminder time
  const preferences = await prisma.notificationPreferences.findMany({
    where: { dailyReminderEnabled: true },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          dailyLogs: {
            where: {
              date: {
                gte: new Date(now.toISOString().split('T')[0]) // Today
              }
            },
            take: 1
          }
        }
      }
    }
  });

  const reminders = [
    "Run today's relationship maintenance protocol",
    "System check required — log today's data point",
    "Daily sync pending — maintain your operational streak",
    "Relationship OS requires input — run daily protocol",
    "Maintenance window open — time to process today's data"
  ];

  let sent = 0;
  let skipped = 0;

  for (const pref of preferences) {
    try {
      // Parse reminder time
      const [reminderHour, reminderMinute] = pref.dailyReminderTime.split(':').map(Number);

      // Convert user's local reminder time to UTC
      // This is a simplified version — production should use moment-timezone
      const tzOffset = getTimezoneOffset(pref.timezone);
      const reminderUTCHour = (reminderHour + tzOffset + 24) % 24;

      // Check if it's time (within 30-min window for hourly cron)
      if (Math.abs(currentHour - reminderUTCHour) > 0 || currentMinute > 30) {
        continue;
      }

      // Skip if user already logged today
      if (pref.user.dailyLogs && pref.user.dailyLogs.length > 0) {
        skipped++;
        continue;
      }

      // Pick a random reminder message
      const message = reminders[Math.floor(Math.random() * reminders.length)];

      const result = await sendToUser(pref.userId, {
        title: '⚙️ Daily Sync Required',
        body: message,
        tag: 'daily-reminder',
        data: { url: '/logs/new', type: 'daily-reminder' }
      });

      if (result.success > 0) sent++;
    } catch (error) {
      logger.error(`Error sending reminder to user ${pref.userId}:`, error);
    }
  }

  logger.info(`Daily reminders: ${sent} sent, ${skipped} skipped (already logged)`);
  return { sent, skipped };
}

/**
 * Notify partner of activity (e.g., gratitude shared, goal completed)
 */
async function notifyPartner(userId, type, message) {
  // Get user's relationship and partner
  const relationships = await prisma.relationship.findMany({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
      status: 'active'
    }
  });

  if (relationships.length === 0) return { success: 0, noPartner: true };

  const rel = relationships[0];
  const partnerId = rel.user1Id === userId ? rel.user2Id : rel.user1Id;

  // Check if partner wants these alerts
  const partnerPrefs = await prisma.notificationPreferences.findUnique({
    where: { userId: partnerId }
  });

  if (!partnerPrefs?.partnerActivityAlerts) {
    return { success: 0, disabled: true };
  }

  return await sendToUser(partnerId, {
    title: '🔄 Partner Sync Complete',
    body: 'Both instances operational.',
    tag: `partner-${type}`,
    data: { url: '/dashboard', type: `partner-${type}` }
  });
}

/**
 * Simple timezone offset helper (hours from UTC)
 * For production, use moment-timezone or similar
 */
function getTimezoneOffset(timezone) {
  const offsets = {
    'America/New_York': 5,
    'America/Chicago': 6,
    'America/Denver': 7,
    'America/Los_Angeles': 8,
    'America/Phoenix': 7,
    'Pacific/Honolulu': 10,
    'America/Anchorage': 9,
    'UTC': 0
  };
  return offsets[timezone] || 7; // Default to Denver
}

module.exports = {
  sendToUser,
  sendDailyReminders,
  notifyPartner
};
