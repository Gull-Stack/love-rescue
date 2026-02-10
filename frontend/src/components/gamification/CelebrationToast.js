/**
 * 🎉 Celebration Toast Component
 * Shows encouraging messages on achievements
 */

import React from 'react';
import { Snackbar, Alert, AlertTitle, Box } from '@mui/material';

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

const CelebrationToast = ({ 
  open, 
  onClose, 
  type = 'dailyLog', 
  streakDay,
  badgeId,
  customMessage,
}) => {
  const getMessage = () => {
    if (customMessage) return customMessage;
    
    if (type === 'dailyLog') {
      const messages = celebrationMessages.dailyLog;
      return messages[Math.floor(Math.random() * messages.length)];
    }
    
    if (type === 'streak' && streakDay) {
      return celebrationMessages.streak[streakDay] || `🔥 ${streakDay} day streak! Amazing!`;
    }
    
    if (type === 'badge' && badgeId) {
      return celebrationMessages.badge[badgeId] || '🏆 Badge earned!';
    }
    
    if (type === 'levelUp') {
      const messages = celebrationMessages.levelUp;
      return messages[Math.floor(Math.random() * messages.length)];
    }
    
    return "Great job! 🎉";
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
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          boxShadow: '0 8px 32px rgba(245,87,108,0.3)',
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
        {getMessage()}
      </Alert>
    </Snackbar>
  );
};

export default CelebrationToast;
