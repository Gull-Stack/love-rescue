const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /api/notifications/register
 * Store native push token for a user (iOS/Android via Capacitor).
 * Body: { token: string, platform: 'ios' | 'android' | 'web' }
 */
router.post('/register', authenticate, async (req, res) => {
  try {
    const { token, platform } = req.body;

    if (!token || !platform) {
      return res.status(400).json({ error: 'token and platform are required' });
    }

    if (!['ios', 'android', 'web'].includes(platform)) {
      return res.status(400).json({ error: 'platform must be ios, android, or web' });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        pushToken: token,
        pushPlatform: platform,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Push token registration error:', error);
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

/**
 * POST /api/notifications/send
 * Send a push notification to a specific user. Admin only.
 * Body: { userId: string, title: string, body: string, data?: object }
 *
 * NOTE: For iOS, you need to configure APNs. See CAPACITOR-SETUP.md.
 * This route currently supports web push via web-push library.
 * For native iOS push, integrate @parse/node-apn with your APNs key.
 */
router.post('/send', authenticate, async (req, res) => {
  try {
    // Admin check
    if (!req.user.isPlatformAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId, title, body, data } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({ error: 'userId, title, and body are required' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true, pushPlatform: true },
    });

    if (!targetUser || !targetUser.pushToken) {
      return res.status(404).json({ error: 'User has no registered push token' });
    }

    if (targetUser.pushPlatform === 'ios') {
      // TODO: Implement APNs push via @parse/node-apn
      // Requires: APNs Auth Key (.p8), Key ID, Team ID
      // See CAPACITOR-SETUP.md for configuration details
      return res.status(501).json({
        error: 'iOS native push not yet configured',
        hint: 'Configure APNs key in environment. See CAPACITOR-SETUP.md',
      });
    }

    if (targetUser.pushPlatform === 'web') {
      // Use existing web-push infrastructure
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId, enabled: true },
      });

      const webpush = require('web-push');
      const payload = JSON.stringify({ title, body, data });

      const results = await Promise.allSettled(
        subscriptions.map((sub) =>
          webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          )
        )
      );

      const sent = results.filter((r) => r.status === 'fulfilled').length;
      res.json({ success: true, sent });
    } else {
      res.status(501).json({ error: `Push for platform '${targetUser.pushPlatform}' not implemented` });
    }
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

module.exports = router;
