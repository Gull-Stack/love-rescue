const express = require('express');
const webpush = require('web-push');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// VAPID keys - in production, use environment variables
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BMm9QUx-G1gYCF9nkzVy5ctEmcFlCsYumIYEOuoZwUJOPQeRvAFHPQnC22bBulKcyINOVj4NqdMn4_oKUQAXZ5M';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'GPorgU6PgXgbCNcUTRhfxtNibjUJgj8_5kNvMYmx03Q';

webpush.setVapidDetails(
  'mailto:support@loverescue.app',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Get VAPID public key for frontend
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Subscribe to push notifications
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.user.id;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }

    const userAgent = req.headers['user-agent'] || null;

    // Store or update subscription
    await prisma.pushSubscription.upsert({
      where: {
        endpoint: subscription.endpoint,
      },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId,
        userAgent,
        enabled: true,
        updatedAt: new Date(),
      },
      create: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId,
        userAgent,
      },
    });

    res.json({ success: true, message: 'Subscribed to push notifications' });
  } catch (error) {
    console.error('Push subscribe error:', error);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const { endpoint } = req.body;

    await prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });

    res.json({ success: true, message: 'Unsubscribed from push notifications' });
  } catch (error) {
    console.error('Push unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// Send test notification (for user)
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId, enabled: true },
    });

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'No push subscriptions found. Enable notifications first.' });
    }

    const payload = JSON.stringify({
      title: '💝 Love Rescue',
      body: 'Test notification - push is working!',
      icon: '/logo192.png',
      badge: '/logo192.png',
      data: { url: '/dashboard' },
    });

    const results = await Promise.allSettled(
      subscriptions.map(sub => 
        webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        }, payload)
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.json({ success: true, sent, failed });
  } catch (error) {
    console.error('Push test error:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// Send daily reminder to all users (called by cron)
router.post('/send-daily-reminder', async (req, res) => {
  // Simple auth check - in production use proper API key
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.PUSH_API_KEY && apiKey !== 'loverescue-push-2026') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get all enabled subscriptions with user notification preferences
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { enabled: true },
      include: { 
        user: {
          include: {
            notificationPreferences: true,
          }
        } 
      },
    });

    // Filter to users who have daily reminder enabled
    const eligibleSubs = subscriptions.filter(sub => 
      !sub.user.notificationPreferences || 
      sub.user.notificationPreferences.dailyReminderEnabled
    );

    const messages = [
      "Time to reflect on your relationship 💭",
      "Your daily log is waiting! Keep your streak alive 🔥",
      "A moment of reflection = a stronger connection ❤️",
      "Check in with yourself tonight 🌙",
      "Small daily actions create big relationship wins 🏆",
      "How was your connection today? Log it! 📝",
      "Don't break the streak! 3 mins to reflect 💪",
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    const payload = JSON.stringify({
      title: '💝 Love Rescue',
      body: randomMessage,
      icon: '/logo192.png',
      badge: '/logo192.png',
      data: { url: '/daily' },
      tag: 'daily-reminder',
      renotify: false,
    });

    const results = await Promise.allSettled(
      eligibleSubs.map(sub => 
        webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        }, payload).catch(async (err) => {
          // Remove invalid subscriptions (expired or unsubscribed)
          if (err.statusCode === 404 || err.statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
          throw err;
        })
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Daily reminder: ${sent} sent, ${failed} failed, ${eligibleSubs.length} eligible`);
    res.json({ success: true, sent, failed, total: eligibleSubs.length });
  } catch (error) {
    console.error('Daily reminder error:', error);
    res.status(500).json({ error: 'Failed to send daily reminders' });
  }
});

// Check subscription status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId, enabled: true },
      select: { id: true, endpoint: true, createdAt: true },
    });

    res.json({ 
      enabled: subscriptions.length > 0,
      count: subscriptions.length,
    });
  } catch (error) {
    console.error('Push status error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Get notification preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const prefs = await prisma.notificationPreferences.findUnique({
      where: { userId },
    });

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId, enabled: true },
    });

    res.json({
      dailyReminderEnabled: prefs?.dailyReminderEnabled ?? true,
      dailyReminderTime: prefs?.dailyReminderTime ?? '20:00',
      timezone: prefs?.timezone ?? 'America/Denver',
      partnerActivityAlerts: prefs?.partnerActivityAlerts ?? true,
      weeklyDigest: prefs?.weeklyDigest ?? true,
      hasActiveSubscriptions: subscriptions.length > 0,
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

// Update notification preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      dailyReminderEnabled, 
      dailyReminderTime, 
      timezone,
      partnerActivityAlerts, 
      weeklyDigest 
    } = req.body;

    await prisma.notificationPreferences.upsert({
      where: { userId },
      update: {
        dailyReminderEnabled,
        dailyReminderTime,
        timezone,
        partnerActivityAlerts,
        weeklyDigest,
        updatedAt: new Date(),
      },
      create: {
        userId,
        dailyReminderEnabled: dailyReminderEnabled ?? true,
        dailyReminderTime: dailyReminderTime ?? '20:00',
        timezone: timezone ?? 'America/Denver',
        partnerActivityAlerts: partnerActivityAlerts ?? true,
        weeklyDigest: weeklyDigest ?? true,
      },
    });

    res.json({ success: true, message: 'Preferences saved' });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

module.exports = router;
