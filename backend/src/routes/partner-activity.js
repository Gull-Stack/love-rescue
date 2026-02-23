const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// Helper: find active relationship for user
async function findRelationship(prisma, userId) {
  return prisma.relationship.findFirst({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
      status: 'active'
    }
  });
}

// Check if partner completed today's log
router.get('/partner-status', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const relationship = await findRelationship(req.prisma, userId);

    if (!relationship) {
      return res.json({ hasPartner: false });
    }

    // Determine partner id
    const partnerId = relationship.user1Id === userId ? relationship.user2Id : relationship.user1Id;

    if (!partnerId) {
      return res.json({ hasPartner: false });
    }

    const partner = await req.prisma.user.findUnique({
      where: { id: partnerId },
      select: { id: true, firstName: true }
    });

    if (!partner) {
      return res.json({ hasPartner: false });
    }

    // Check if partner logged today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [partnerLog, userLog] = await Promise.all([
      req.prisma.dailyLog.findFirst({
        where: { userId: partner.id, createdAt: { gte: today } },
        orderBy: { createdAt: 'desc' }
      }),
      req.prisma.dailyLog.findFirst({
        where: { userId, createdAt: { gte: today } }
      })
    ]);

    // Get partner's streak
    const partnerStreak = await getStreak(req.prisma, partner.id);

    res.json({
      hasPartner: true,
      partnerName: partner.firstName || 'Your partner',
      partnerLoggedToday: !!partnerLog,
      partnerLogTime: partnerLog?.createdAt || null,
      userLoggedToday: !!userLog,
      partnerStreak,
      nudgeMessage: getNudgeMessage(!!partnerLog, !!userLog, partner.firstName)
    });
  } catch (error) {
    console.error('Error checking partner status:', error);
    res.status(500).json({ error: 'Failed to check partner status' });
  }
});

// Get couple's matchup score for today
router.get('/matchup-score', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const relationship = await findRelationship(req.prisma, userId);

    if (!relationship) {
      return res.json({ hasMatchup: false });
    }

    const partnerId = relationship.user1Id === userId ? relationship.user2Id : relationship.user1Id;

    if (!partnerId) {
      return res.json({ hasMatchup: false });
    }

    const partner = await req.prisma.user.findUnique({
      where: { id: partnerId },
      select: { id: true, firstName: true }
    });

    if (!partner) {
      return res.json({ hasMatchup: false });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get both logs from today
    const [userLog, partnerLog] = await Promise.all([
      req.prisma.dailyLog.findFirst({
        where: { userId, createdAt: { gte: today } }
      }),
      req.prisma.dailyLog.findFirst({
        where: { userId: partner.id, createdAt: { gte: today } }
      })
    ]);

    if (!userLog || !partnerLog) {
      return res.json({
        hasMatchup: false,
        bothLogged: false,
        userLogged: !!userLog,
        partnerLogged: !!partnerLog,
        message: !userLog && !partnerLog
          ? "Neither of you has logged today. Be the first! 💪"
          : !userLog
            ? `${partner.firstName || 'Your partner'} is waiting for you!`
            : "Waiting for your partner to complete their log..."
      });
    }

    // Calculate matchup score based on mood alignment
    const moodDiff = Math.abs((userLog.moodScore || 5) - (partnerLog.moodScore || 5));
    const connectionDiff = Math.abs((userLog.connectionScore || 5) - (partnerLog.connectionScore || 5));

    // Higher score = more aligned (10 - differences)
    const alignmentScore = Math.max(0, 100 - (moodDiff * 10) - (connectionDiff * 10));

    // Generate insight
    const insight = getMatchupInsight(userLog, partnerLog, alignmentScore);

    res.json({
      hasMatchup: true,
      bothLogged: true,
      alignmentScore,
      userMood: userLog.moodScore,
      partnerMood: partnerLog.moodScore,
      userConnection: userLog.connectionScore,
      partnerConnection: partnerLog.connectionScore,
      insight,
      celebrationTier: alignmentScore >= 80 ? 'gold' : alignmentScore >= 60 ? 'silver' : 'bronze'
    });
  } catch (error) {
    console.error('Error calculating matchup:', error);
    res.status(500).json({ error: 'Failed to calculate matchup' });
  }
});

// Record that user viewed partner's activity (for engagement tracking)
router.post('/viewed-partner', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Log this as engagement
    await req.prisma.engagementLog.create({
      data: {
        userId,
        action: 'VIEWED_PARTNER_ACTIVITY',
        metadata: { timestamp: new Date().toISOString() }
      }
    }).catch(() => {}); // Ignore if table doesn't exist yet

    res.json({ success: true });
  } catch (error) {
    res.json({ success: true }); // Non-critical, always succeed
  }
});

// Send nudge to partner (limited to once per day)
router.post('/nudge-partner', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const relationship = await findRelationship(req.prisma, userId);

    if (!relationship) {
      return res.status(400).json({ error: 'No partner linked' });
    }

    const partnerId = relationship.user1Id === userId ? relationship.user2Id : relationship.user1Id;

    if (!partnerId) {
      return res.status(400).json({ error: 'No partner linked' });
    }

    const partner = await req.prisma.user.findUnique({
      where: { id: partnerId },
      select: { id: true, firstName: true }
    });

    if (!partner) {
      return res.status(400).json({ error: 'Partner not found' });
    }

    // Check if already nudged today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingNudge = await req.prisma.notification.findFirst({
      where: {
        userId: partner.id,
        type: 'PARTNER_NUDGE',
        createdAt: { gte: today }
      }
    }).catch(() => null);

    if (existingNudge) {
      return res.status(429).json({
        error: 'Already nudged today',
        message: "You've already sent a gentle reminder today. Give them some time! 💕"
      });
    }

    // Create notification for partner
    await req.prisma.notification.create({
      data: {
        userId: partner.id,
        type: 'PARTNER_NUDGE',
        title: '💕 Partner Check-in',
        body: `${req.user.firstName || 'Your partner'} is thinking of you! Time to log today?`,
        read: false
      }
    }).catch(() => {});

    res.json({
      success: true,
      message: `Sent a gentle reminder to ${partner.firstName || 'your partner'}! 💕`
    });
  } catch (error) {
    console.error('Error sending nudge:', error);
    res.status(500).json({ error: 'Failed to send nudge' });
  }
});

// Helper: Get user's current streak
async function getStreak(prisma, userId) {
  try {
    const streak = await prisma.streak.findUnique({
      where: { odUserId: userId }
    });
    return streak?.currentStreak || 0;
  } catch {
    return 0;
  }
}

// Helper: Generate appropriate nudge message based on status
function getNudgeMessage(partnerLogged, userLogged, partnerName) {
  const name = partnerName || 'Your partner';

  if (partnerLogged && !userLogged) {
    return `🔥 ${name} already logged today! Don't let them down.`;
  }
  if (!partnerLogged && userLogged) {
    return `You're ahead! Send ${name} a gentle nudge?`;
  }
  if (partnerLogged && userLogged) {
    return `🎉 You're both crushing it today!`;
  }
  return `Be the first to log today and inspire ${name}!`;
}

// Helper: Generate insight based on matchup
function getMatchupInsight(userLog, partnerLog, score) {
  if (score >= 90) {
    return "🌟 Incredible sync! You two are on the same wavelength today.";
  }
  if (score >= 75) {
    return "💕 Great alignment! You're both feeling connected.";
  }
  if (score >= 50) {
    return "🤝 Good day! There might be small differences to explore together.";
  }
  if (score >= 25) {
    return "💬 Different perspectives today. A good time for a heart-to-heart.";
  }
  return "🌈 Very different days. Check in with each other — you might need extra support.";
}

module.exports = router;
