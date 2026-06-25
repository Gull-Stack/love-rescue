/**
 * Tiered Celebration Toast Component
 * Shows tiered celebrations with expert quotes, haptic feedback, and unlock notifications
 */

import React, { useEffect, useMemo } from 'react';
import { Snackbar, Alert, AlertTitle, Box, Typography } from '@mui/material';

// Tier priority (highest number = highest priority)
const TIER_PRIORITY = {
  first_time: 1,
  streak_3: 2,
  skill_complete: 3,
  streak_7: 4,
  partner_sync: 5,
  streak_21: 6,
  breakthrough: 7,
};

const TIER_CONFIG = {
  first_time: {
    title: 'First Step!',
    icon: '🌱',
    color: '#0E9F8E',
    gradient: 'linear-gradient(135deg, #0E9F8E 0%, #2DD4BF 100%)',
    duration: 3000,
    messages: [
      "Every expert was once a beginner. Gottman started with observation — so did you.",
      "You just planted the seed. Esther Perel says curiosity is the first act of love.",
      "First log complete. Brené Brown: 'Vulnerability is the birthplace of connection.'",
    ],
  },
  skill_complete: {
    title: 'Skill Mastered!',
    icon: '🧠',
    color: '#33455B',
    gradient: 'linear-gradient(135deg, #33455B 0%, #2DD4BF 100%)',
    duration: 4500,
    messages: [
      "You just used a Voss technique — mirroring builds trust without saying a word.",
      "Gottman's 'softened startup' mastered. Conflicts are about to feel very different.",
      "Sue Johnson calls this a 'hold me tight' moment. You nailed it.",
      "That's an Esther Perel reframe — seeing your partner with fresh eyes.",
    ],
  },
  breakthrough: {
    title: 'BREAKTHROUGH',
    icon: '💎',
    color: '#E08A3C',
    gradient: 'linear-gradient(135deg, #1B2735 0%, #E08A3C 50%, #F0A55C 100%)',
    duration: 6000,
    messages: [
      "This is what Gottman calls a 'breakthrough repair.' Your relationship just leveled up.",
      "Brené Brown: 'Discomfort is the price of admission to a meaningful life.' You paid it.",
      "Sue Johnson would call this a bonding event. You broke through the cycle.",
    ],
  },
  streak_3: {
    title: '3-Day Streak!',
    icon: '⚡',
    color: '#0E9F8E',
    gradient: 'linear-gradient(135deg, #0E9F8E 0%, #2DD4BF 100%)',
    duration: 3500,
    messages: [
      "3 days in. Gottman's research: small consistent moments beat grand gestures every time.",
      "You're showing up. Voss says consistency builds the trust that words alone can't.",
    ],
  },
  streak_7: {
    title: '7-Day Streak!',
    icon: '🔥',
    color: '#E08A3C',
    gradient: 'linear-gradient(135deg, #E08A3C 0%, #F0A55C 100%)',
    duration: 5000,
    messages: [
      "7 days. Gottman research: this is when new patterns start to stick.",
      "A full week. Esther Perel: 'The quality of your relationships determines the quality of your life.'",
    ],
  },
  streak_21: {
    title: '21-Day Streak!',
    icon: '👑',
    color: '#F0A55C',
    gradient: 'linear-gradient(135deg, #1B2735 0%, #E08A3C 50%, #F0A55C 100%)',
    duration: 6000,
    messages: [
      "21 days. The science is clear: you've rewired a habit loop. Gottman would be proud.",
      "3 weeks of showing up. Brené Brown: 'You're no longer practicing — you're living it.'",
    ],
  },
  partner_sync: {
    title: 'Partner Synced!',
    icon: '💞',
    color: '#E08A3C',
    gradient: 'linear-gradient(135deg, #F0A55C 0%, #E08A3C 100%)',
    duration: 5000,
    messages: [
      "Both partners engaged. Gottman's #1 predictor of success: mutual investment.",
      "Sue Johnson: 'Are you there for me?' You both just answered yes.",
      "Two people, same mission. Esther Perel calls this 'erotic cooperation.'",
    ],
  },
};

// Legacy message lookup (preserves existing API)
const celebrationMessages = {
  dailyLog: [
    "You showed up for your relationship! 🎯",
    "Another day of growth! 🌱",
    "Consistency builds connection! 💪",
    "Your partner will notice! ❤️",
    "One step closer to your best relationship! 🚀",
  ],
  streak: {
    7: "🔥 7-Day Warrior! You're building a habit!",
    14: "⚡ Two weeks strong! Incredible dedication!",
    21: "🧠 21 days! Science says it's a habit now!",
    30: "🛡️ Relationship Warrior status unlocked!",
    60: "💎 60 days! You're in the elite!",
    90: "👑 Love Legend! 90 days of showing up!",
  },
  badge: {
    'first-step': "🌱 First Step badge earned! The journey begins!",
    '7-day-warrior': "⚔️ 7-Day Warrior badge unlocked!",
    'habit-former': "🧠 Habit Former! 21 days of dedication!",
    'relationship-warrior': "🛡️ Relationship Warrior! 30 days strong!",
    'love-legend': "👑 LOVE LEGEND! You are an inspiration!",
    'self-aware': "📊 Self-Aware badge! Knowledge is power!",
    'gratitude-guru': "🙏 Gratitude Guru! 30 entries of appreciation!",
    'communication-champion': "💬 Communication Champion! 50 logs!",
  },
  levelUp: [
    "🎉 LEVEL UP! You're evolving!",
    "⬆️ New level unlocked! Keep pushing!",
    "🌟 You've grown! Your relationship will too!",
  ],
};

/**
 * Pick the highest-priority celebration from an array of celebration objects,
 * or resolve a single celebration from the legacy type/streakDay/badgeId props.
 */
function resolveCelebration({ celebration, celebrations, type, streakDay, badgeId, customMessage }) {
  // New tiered API: single celebration object
  if (celebration && TIER_CONFIG[celebration.type]) {
    return celebration;
  }

  // New tiered API: array of celebrations — pick highest priority
  if (celebrations && celebrations.length > 0) {
    const sorted = [...celebrations]
      .filter((c) => TIER_CONFIG[c.type])
      .sort((a, b) => (TIER_PRIORITY[b.type] || 0) - (TIER_PRIORITY[a.type] || 0));
    if (sorted.length > 0) return sorted[0];
  }

  // Legacy API fallback — map old types to tier config where possible
  if (customMessage) {
    return { type: 'first_time', message: customMessage };
  }

  return null; // will fall through to legacy rendering
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const CelebrationToast = ({
  open,
  onClose,
  type = 'dailyLog',
  streakDay,
  badgeId,
  customMessage,
  celebration,   // new: single { type, message?, icon?, color?, unlock?, duration? }
  celebrations,  // new: array of celebration objects — highest tier wins
}) => {
  const resolved = useMemo(
    () => resolveCelebration({ celebration, celebrations, type, streakDay, badgeId, customMessage }),
    [celebration, celebrations, type, streakDay, badgeId, customMessage],
  );

  const isTiered = resolved && TIER_CONFIG[resolved.type];
  const tierConfig = isTiered ? TIER_CONFIG[resolved.type] : null;

  // Haptic feedback on open for tiered celebrations
  useEffect(() => {
    if (open && isTiered && navigator.vibrate) {
      navigator.vibrate([200]);
    }
  }, [open, isTiered]);

  // --- Tiered rendering ---
  if (isTiered) {
    const message = resolved.message || pickRandom(tierConfig.messages);
    const icon = resolved.icon || tierConfig.icon;
    const gradient = resolved.gradient || tierConfig.gradient;
    const duration = resolved.duration || tierConfig.duration;
    const unlock = resolved.unlock || null;

    return (
      <Snackbar
        open={open}
        autoHideDuration={duration}
        onClose={onClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={onClose}
          severity="success"
          variant="filled"
          icon={false}
          sx={{
            width: '100%',
            fontSize: '1rem',
            background: gradient,
            boxShadow: `0 8px 32px ${tierConfig.color}44`,
            borderRadius: '16px',
            py: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography component="span" sx={{ fontSize: '1.6rem', lineHeight: 1 }}>
              {icon}
            </Typography>
            <AlertTitle
              sx={{
                fontWeight: 800,
                fontSize: '1.15rem',
                letterSpacing: '0.02em',
                m: 0,
                textTransform: resolved.type === 'breakthrough' ? 'uppercase' : 'none',
              }}
            >
              {tierConfig.title}
            </AlertTitle>
          </Box>

          <Typography variant="body2" sx={{ opacity: 0.95, lineHeight: 1.5, mt: 0.5 }}>
            {message}
          </Typography>

          {unlock && (
            <Box
              sx={{
                mt: 1,
                px: 1.5,
                py: 0.5,
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.2)',
                display: 'inline-block',
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, letterSpacing: '0.08em', fontSize: '0.8rem' }}
              >
                UNLOCKED: {unlock}
              </Typography>
            </Box>
          )}
        </Alert>
      </Snackbar>
    );
  }

  // --- Legacy rendering (unchanged API) ---
  const getLegacyMessage = () => {
    if (customMessage) return customMessage;

    if (type === 'dailyLog') {
      return pickRandom(celebrationMessages.dailyLog);
    }

    if (type === 'streak' && streakDay) {
      return celebrationMessages.streak[streakDay] || `🔥 ${streakDay} day streak! Amazing!`;
    }

    if (type === 'badge' && badgeId) {
      return celebrationMessages.badge[badgeId] || '🏆 Badge earned!';
    }

    if (type === 'levelUp') {
      return pickRandom(celebrationMessages.levelUp);
    }

    return 'Great job! 🎉';
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert
        onClose={onClose}
        severity="success"
        variant="filled"
        sx={{
          width: '100%',
          fontSize: '1rem',
          background: 'linear-gradient(135deg, #E08A3C 0%, #F0A55C 100%)',
          boxShadow: '0 8px 32px rgba(224,138,60,0.3)',
          '& .MuiAlert-icon': {
            fontSize: '2rem',
          },
        }}
      >
        <AlertTitle sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
          {type === 'streak' ? '🔥 Streak Milestone!' :
           type === 'badge' ? '🏆 Badge Earned!' :
           type === 'levelUp' ? '⬆️ Level Up!' :
           '✨ Great Work!'}
        </AlertTitle>
        {getLegacyMessage()}
      </Alert>
    </Snackbar>
  );
};

export default CelebrationToast;
