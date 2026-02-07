/**
 * Push Notification Routes for PWA
 * Handles subscription management and notification delivery
 */

const express = require('express');
const webpush = require('web-push');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// Configure web-push with VAPID keys
// Generate once: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@loverescue.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  logger.warn('VAPID keys not configured - push notifications disabled');
}

/**
 * GET /api/push/vapid-public-key
 * Returns the public VAPID key for the frontend to subscribe
 */
router.get('/vapid-public-key', (req, res) => {
  if (!VAPID_PUBLIC_KEY) {
    return res.status(503).json({ error: 'Push notifications not configured' });
  }
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

/**
 * POST /api/push/subscribe
 * Save a push subscription for the authenticated user
 */
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.user.id;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid subscription object' });
    }

    // Upsert subscription (update if endpoint exists, otherwise create)
    const pushSub = await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: req.headers['user-agent'] || null,
        enabled: true,
        updatedAt: new Date()
      },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: req.headers['user-agent'] || null,
        enabled: true
      }
    });

    // Also ensure notification preferences exist
    await prisma.notificationPreferences.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        dailyReminderEnabled: true,
        dailyReminderTime: '09:00',
        timezone: 'America/Denver'
      }
    });

    logger.info(`Push subscription saved for user ${userId}`);
    res.json({ success: true, subscriptionId: pushSub.id });
  } catch (error) {
    logger.error('Error saving push subscription:', error);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

/**
 * DELETE /api/push/unsubscribe
 * Remove a push subscription
 */
router.delete('/unsubscribe', authenticate, async (req, res) => {
  try {
    const { endpoint } = req.body;
    const userId = req.user.id;

    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint required' });
    }

    await prisma.pushSubscription.deleteMany({
      where: {
        userId,
        endpoint
      }
    });

    logger.info(`Push subscription removed for user ${userId}`);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error removing push subscription:', error);
    res.status(500).json({ error: 'Failed to remove subscription' });
  }
});

/**
 * GET /api/push/preferences
 * Get notification preferences for the authenticated user
 */
router.get('/preferences', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    let prefs = await prisma.notificationPreferences.findUnique({
      where: { userId }
    });

    // Return defaults if not set
    if (!prefs) {
      prefs = {
        dailyReminderEnabled: true,
        dailyReminderTime: '09:00',
        timezone: 'America/Denver',
        partnerActivityAlerts: true,
        weeklyDigest: true
      };
    }

    // Get subscription count
    const subscriptionCount = await prisma.pushSubscription.count({
      where: { userId, enabled: true }
    });

    res.json({
      ...prefs,
      hasActiveSubscriptions: subscriptionCount > 0,
      subscriptionCount
    });
  } catch (error) {
    logger.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

/**
 * PUT /api/push/preferences
 * Update notification preferences
 */
router.put('/preferences', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      dailyReminderEnabled,
      dailyReminderTime,
      timezone,
      partnerActivityAlerts,
      weeklyDigest
    } = req.body;

    // Validate time format if provided
    if (dailyReminderTime && !/^\d{2}:\d{2}$/.test(dailyReminderTime)) {
      return res.status(400).json({ error: 'Invalid time format. Use HH:MM' });
    }

    const prefs = await prisma.notificationPreferences.upsert({
      where: { userId },
      update: {
        ...(dailyReminderEnabled !== undefined && { dailyReminderEnabled }),
        ...(dailyReminderTime && { dailyReminderTime }),
        ...(timezone && { timezone }),
        ...(partnerActivityAlerts !== undefined && { partnerActivityAlerts }),
        ...(weeklyDigest !== undefined && { weeklyDigest })
      },
      create: {
        userId,
        dailyReminderEnabled: dailyReminderEnabled ?? true,
        dailyReminderTime: dailyReminderTime || '09:00',
        timezone: timezone || 'America/Denver',
        partnerActivityAlerts: partnerActivityAlerts ?? true,
        weeklyDigest: weeklyDigest ?? true
      }
    });

    res.json(prefs);
  } catch (error) {
    logger.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * POST /api/push/test
 * Send a test notification to the authenticated user
 */
router.post('/test', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId, enabled: true }
    });

    if (subscriptions.length === 0) {
      return res.status(400).json({ error: 'No active push subscriptions found' });
    }

    const payload = JSON.stringify({
      title: '💕 Love Rescue Test',
      body: 'Push notifications are working! You\'ll get daily reminders now.',
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: 'test-notification',
      data: {
        url: '/dashboard',
        type: 'test'
      }
    });

    let successCount = 0;
    let failCount = 0;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }, payload);

        // Update last used timestamp
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { lastUsed: new Date() }
        });

        successCount++;
      } catch (error) {
        failCount++;
        logger.error(`Failed to send test notification to subscription ${sub.id}:`, error);

        // If subscription is invalid (410 Gone), remove it
        if (error.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
          logger.info(`Removed expired subscription ${sub.id}`);
        }
      }
    }

    res.json({
      success: true,
      sent: successCount,
      failed: failCount,
      message: `Test notification sent to ${successCount} device(s)`
    });
  } catch (error) {
    logger.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

module.exports = router;
