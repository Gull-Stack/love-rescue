/**
 * Celebrations API - Micro-celebration system for activity completions
 * Implements Steve Rogers' Improvement 9: The Dopamine Layer
 * 
 * Celebration tiers:
 * - first_time: First activity ever completed
 * - skill_complete: First time using a specific technique
 * - breakthrough: User marks technique as "this worked"
 * - streak_3/7/21: Consecutive day streaks
 * - partner_sync: Both partners completed today's activities
 */

const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Celebration configuration from Steve's spec
const CELEBRATIONS = {
  first_time: {
    haptic: 'success',
    animation: 'confetti_burst',
    message: 'First step taken. This is how transformation starts.',
    unlocks: 'Show "Day 1" badge in profile'
  },
  
  skill_complete: {
    haptic: 'impact_medium',
    animation: 'skill_unlock',
    message: 'New skill unlocked: {technique_name}',
    unlocks: 'Add to "Skills Practiced" collection'
  },
  
  breakthrough: {
    haptic: 'impact_heavy',
    animation: 'golden_glow',
    message: 'Breakthrough moment. {expert_name} would be proud.',
    unlocks: 'Expert insight: why this worked for you'
  },
  
  streak_3: {
    haptic: 'success',
    animation: 'flame_ignite',
    message: '3-day streak. You\'re building new neural pathways.',
    unlocks: 'Show "Consistent" badge'
  },
  
  streak_7: {
    haptic: 'success',
    animation: 'flame_grow',
    message: '7 days. Gottman research: this is when new patterns start to stick.',
    unlocks: 'Show "Committed" badge + unlock "Share Progress" feature'
  },
  
  streak_21: {
    haptic: 'impact_heavy',
    animation: 'flame_transform',
    message: '21 days. You\'ve built a habit. This is who you are now.',
    unlocks: 'Show "Transformed" badge + free 1-month coaching trial offer'
  },
  
  partner_sync: {
    haptic: 'success',
    animation: 'hearts_connect',
    message: 'You both showed up today. This is what commitment looks like.',
    unlocks: 'Unlock "Shared Win" in timeline'
  }
};

/**
 * GET /api/celebrations/check
 * Check if user has earned any celebrations based on recent activity
 * Returns highest-priority celebration if multiple earned
 */
router.get('/check', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch user metadata to check which celebrations have been shown
    const user = await req.prisma.user.findUnique({
      where: { id: userId },
      select: { metadata: true }
    });
    
    const shownCelebrations = user?.metadata?.celebrationsShown || {};

    // Check for first-time activity completion
    const activityCount = await req.prisma.dailyLog.count({
      where: { userId }
    });

    if (activityCount === 1 && !shownCelebrations['first_time']) {
      // Just completed first activity ever and haven't seen celebration yet
      return res.json({
        celebration: 'first_time',
        ...CELEBRATIONS.first_time
      });
    }

    // Check streaks
    const recentLogs = await req.prisma.dailyLog.findMany({
      where: {
        userId,
        date: { gte: new Date(today.getTime() - 21 * 24 * 60 * 60 * 1000) }
      },
      orderBy: { date: 'desc' }
    });

    const streak = calculateStreak(recentLogs);

    // Check streak milestones (only show if not already shown)
    if (streak === 21 && !shownCelebrations['streak_21']) {
      return res.json({
        celebration: 'streak_21',
        ...CELEBRATIONS.streak_21
      });
    } else if (streak === 7 && !shownCelebrations['streak_7']) {
      return res.json({
        celebration: 'streak_7',
        ...CELEBRATIONS.streak_7
      });
    } else if (streak === 3 && !shownCelebrations['streak_3']) {
      return res.json({
        celebration: 'streak_3',
        ...CELEBRATIONS.streak_3
      });
    }

    // Check partner sync (if matchup exists)
    const matchup = await req.prisma.matchup.findFirst({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId }
        ]
      }
    });

    if (matchup) {
      const partnerId = matchup.user1Id === userId ? matchup.user2Id : matchup.user1Id;
      
      const [userToday, partnerToday] = await Promise.all([
        req.prisma.dailyLog.findFirst({
          where: { userId, date: today }
        }),
        req.prisma.dailyLog.findFirst({
          where: { userId: partnerId, date: today }
        })
      ]);

      if (userToday && partnerToday) {
        // Check if partner_sync was already shown today
        const lastShown = shownCelebrations['partner_sync'];
        const shownToday = lastShown && new Date(lastShown).toDateString() === today.toDateString();
        
        if (!shownToday) {
          return res.json({
            celebration: 'partner_sync',
            ...CELEBRATIONS.partner_sync
          });
        }
      }
    }

    // No celebration earned
    res.json({ celebration: null });

  } catch (error) {
    console.error('Error checking celebrations:', error);
    res.status(500).json({ error: 'Failed to check celebrations' });
  }
});

/**
 * POST /api/celebrations/mark-shown
 * Mark a celebration as shown to prevent re-showing
 */
router.post('/mark-shown', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { celebration } = req.body;

    if (!celebration || !CELEBRATIONS[celebration]) {
      return res.status(400).json({ error: 'Invalid celebration type' });
    }

    // Build metadata object first (Prisma JSON field requirement)
    const currentMetadata = req.user.metadata || {};
    const currentCelebrations = currentMetadata.celebrationsShown || {};
    const updatedMetadata = {
      ...currentMetadata,
      celebrationsShown: {
        ...currentCelebrations,
        [celebration]: new Date().toISOString()
      }
    };

    await req.prisma.user.update({
      where: { id: userId },
      data: { metadata: updatedMetadata }
    });

    res.json({ success: true });

  } catch (error) {
    console.error('Error marking celebration:', error);
    res.status(500).json({ error: 'Failed to mark celebration' });
  }
});

/**
 * POST /api/celebrations/skill-unlock
 * Trigger celebration when user completes a technique for the first time
 */
router.post('/skill-unlock', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { techniqueId, techniqueName, expertName } = req.body;

    // Check if this is first time using this technique
    const previousUse = await req.prisma.dailyLog.findFirst({
      where: {
        userId,
        // Assuming techniques are stored in a JSON field or related table
        // Adjust based on actual schema
      }
    });

    if (!previousUse) {
      const celebration = {
        celebration: 'skill_complete',
        ...CELEBRATIONS.skill_complete,
        message: CELEBRATIONS.skill_complete.message.replace('{technique_name}', techniqueName)
      };

      return res.json(celebration);
    }

    res.json({ celebration: null });

  } catch (error) {
    console.error('Error checking skill unlock:', error);
    res.status(500).json({ error: 'Failed to check skill unlock' });
  }
});

/**
 * POST /api/celebrations/breakthrough
 * Trigger celebration when user marks a technique as effective
 */
router.post('/breakthrough', authenticate, async (req, res) => {
  try {
    const { expertName } = req.body;

    const celebration = {
      celebration: 'breakthrough',
      ...CELEBRATIONS.breakthrough,
      message: CELEBRATIONS.breakthrough.message.replace('{expert_name}', expertName)
    };

    res.json(celebration);

  } catch (error) {
    console.error('Error creating breakthrough celebration:', error);
    res.status(500).json({ error: 'Failed to create breakthrough celebration' });
  }
});

// Helper function to calculate streak
function calculateStreak(logs) {
  if (!logs || logs.length === 0) return 0;

  let streak = 0;
  const sortedLogs = logs.sort((a, b) => b.date - a.date);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < sortedLogs.length; i++) {
    const logDate = new Date(sortedLogs[i].date);
    logDate.setHours(0, 0, 0, 0);
    
    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - i);
    expectedDate.setHours(0, 0, 0, 0);

    if (logDate.getTime() === expectedDate.getTime()) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

module.exports = router;
