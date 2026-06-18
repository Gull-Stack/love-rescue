/**
 * Push Notification Utility
 * Used by cron jobs and internal services to send notifications
 */

const webpush = require('web-push');
const logger = require('./logger');
const apns = require('./apns');

const prisma = require('../lib/prisma');

// In-memory same-day dedup so a process restart within the reminder hour
// (single Railway instance) can't double-send a reminder to the same user.
const remindedToday = new Set();
let remindedDate = null;

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

  // Reset the same-day dedup set once per (UTC) day.
  const todayUtc = now.toISOString().split('T')[0];
  if (remindedDate !== todayUtc) {
    remindedToday.clear();
    remindedDate = todayUtc;
  }

  // Get all users with reminders enabled who should receive one now.
  // We compare each user's *local* time to their chosen reminder time.
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
                gte: new Date(todayUtc) // Today
              }
            },
            take: 1
          }
        }
      }
    }
  });

  // Warm, direct nudges written for the actual user (a man working on his
  // marriage), not robotic "system protocol" copy. Varied so the daily ping
  // never feels like the same canned alert.
  const reminders = [
    "One small move today. 60 seconds for your marriage.",
    "She won't see the work — but she'll feel it. Take your check-in.",
    "Showing up daily is the whole game. Your check-in is ready.",
    "Don't break the chain. A quick check-in keeps your momentum.",
    "Big change is built one day at a time. Log today.",
    "Your future self will thank you for the next 60 seconds.",
  ];

  let sent = 0;
  let skipped = 0;

  for (const pref of preferences) {
    try {
      const [reminderHour] = (pref.dailyReminderTime || '19:00').split(':').map(Number);
      const local = getUserLocalTime(pref.timezone);

      // The scheduler ticks a few times per hour; fire during the local hour
      // that matches the user's chosen reminder time (DST-safe via Intl).
      if (local.hour !== reminderHour) continue;

      // Skip if the user already logged today.
      if (pref.user.dailyLogs && pref.user.dailyLogs.length > 0) {
        skipped++;
        continue;
      }

      // Same-day dedup (keyed by the user's local date).
      const dedupeKey = `${pref.userId}:${local.dateStr}`;
      if (remindedToday.has(dedupeKey)) continue;
      remindedToday.add(dedupeKey);

      // Pick a random reminder message (variable reward in the copy itself).
      const message = reminders[Math.floor(Math.random() * reminders.length)];

      const result = await sendToUser(pref.userId, {
        title: 'Love Rescue',
        body: message,
        tag: 'daily-reminder',
        data: { url: '/daily', type: 'daily-reminder' }
      });

      if (result.success > 0) sent++;
    } catch (error) {
      logger.error(`Error sending reminder to user ${pref.userId}:`, error);
    }
  }

  logger.info(`Daily reminders: ${sent} sent, ${skipped} skipped (already logged)`);
  return { sent, skipped };
}

// Track email nudges separately from push so we don't double-send.
const emailNudgedToday = new Set();
let emailNudgedDate = null;

/**
 * Evening email fallback nudge. Reaches users regardless of push permission.
 * Self-activating: does nothing (not even a DB query) until email is configured.
 * Sends only to users who (a) have reminders enabled, (b) are at ~8pm local,
 * (c) haven't logged today, and (d) have NO active push subscription — so push
 * users aren't double-nudged.
 */
async function sendEmailNudges() {
  const { isEmailConfigured, sendStreakBreakNudge } = require('./email');
  if (!isEmailConfigured()) return { sent: 0, skipped: 0, disabled: true };

  const EVENING_HOUR = 20; // 8pm local — a fallback well after the push reminder
  const now = new Date();
  const todayUtc = now.toISOString().split('T')[0];
  if (emailNudgedDate !== todayUtc) {
    emailNudgedToday.clear();
    emailNudgedDate = todayUtc;
  }

  const preferences = await prisma.notificationPreferences.findMany({
    where: { dailyReminderEnabled: true },
    include: {
      user: {
        select: {
          id: true, email: true, firstName: true,
          dailyLogs: { where: { date: { gte: new Date(todayUtc) } }, take: 1 },
          pushSubscriptions: { where: { enabled: true }, take: 1 },
        },
      },
    },
  });

  let sent = 0;
  let skipped = 0;
  for (const pref of preferences) {
    try {
      const local = getUserLocalTime(pref.timezone);
      if (local.hour !== EVENING_HOUR) continue;
      if (pref.user.dailyLogs?.length > 0) { skipped++; continue; }
      if (pref.user.pushSubscriptions?.length > 0) { skipped++; continue; } // push covers them
      if (!pref.user.email) continue;

      const dedupeKey = `${pref.userId}:${local.dateStr}`;
      if (emailNudgedToday.has(dedupeKey)) continue;
      emailNudgedToday.add(dedupeKey);

      const ok = await sendStreakBreakNudge(pref.user.email, pref.user.firstName, 0);
      if (ok) sent++;
    } catch (error) {
      logger.error(`Error sending email nudge to user ${pref.userId}:`, error);
    }
  }
  logger.info(`Email nudges: ${sent} sent, ${skipped} skipped`);
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
 * Get a user's current local time for any IANA timezone, DST-aware.
 * Uses the built-in Intl API (no external dependency) so daylight-saving
 * transitions and arbitrary zones are handled correctly.
 * @param {string} timezone - IANA tz id (e.g. "America/New_York")
 * @returns {{ hour: number, minute: number, dateStr: string }}
 */
function getUserLocalTime(timezone) {
  const tz = timezone || 'America/Denver';
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit', minute: '2-digit',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t)?.value;
    const hour = Number(get('hour')) % 24; // Intl can emit '24' for midnight
    return { hour, minute: Number(get('minute')), dateStr: `${get('year')}-${get('month')}-${get('day')}` };
  } catch (err) {
    // Invalid/unknown timezone → fall back to UTC rather than crash.
    const now = new Date();
    return { hour: now.getUTCHours(), minute: now.getUTCMinutes(), dateStr: now.toISOString().split('T')[0] };
  }
}

module.exports = {
  sendToUser,
  sendDailyReminders,
  notifyPartner
};
