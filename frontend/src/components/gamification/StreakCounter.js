/**
 * 🔥 Streak Counter Component
 * Shows current streak with animated fire emoji and progress
 */

import React from 'react';
import { Box, Typography, LinearProgress, Chip } from '@mui/material';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

const StreakCounter = ({ 
  currentStreak = 0, 
  longestStreak = 0,
  xp = 0,
  level = 1,
  levelName = 'Relationship Rookie',
  levelProgress = 0,
  xpToNextLevel = 100,
  streakAlive = false,
  compact = false 
}) => {
  // Streak tier colors
  const getStreakColor = () => {
    if (currentStreak >= 90) return '#FFD700'; // Gold - Love Legend
    if (currentStreak >= 30) return '#9370DB'; // Purple - Relationship Warrior  
    if (currentStreak >= 21) return '#00CED1'; // Cyan - Habit Former
    if (currentStreak >= 7) return '#FF6B35';  // Orange - 7-Day Warrior
    return '#888';
  };

  const getStreakLabel = () => {
    if (currentStreak >= 90) return '👑 Love Legend';
    if (currentStreak >= 30) return '🛡️ Relationship Warrior';
    if (currentStreak >= 21) return '🧠 Habit Former';
    if (currentStreak >= 7) return '⚔️ 7-Day Warrior';
    if (currentStreak >= 1) return '🌱 Getting Started';
    return 'Start your streak!';
  };

  if (compact) {
    return (
      <Chip
        icon={<LocalFireDepartmentIcon sx={{ color: getStreakColor() }} />}
        label={`${currentStreak} day streak`}
        variant="outlined"
        sx={{
          borderColor: getStreakColor(),
          color: getStreakColor(),
          fontWeight: 'bold',
        }}
      />
    );
  }

  return (
    <Box
      sx={{
        background: 'linear-gradient(135deg, rgba(255,107,53,0.1) 0%, rgba(45,90,39,0.1) 100%)',
        borderRadius: 3,
        p: 3,
        border: '1px solid',
        borderColor: streakAlive ? 'primary.light' : 'divider',
      }}
    >
      {/* Main Streak Display */}
      <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
        <LocalFireDepartmentIcon 
          sx={{ 
            fontSize: 48, 
            color: getStreakColor(),
            animation: streakAlive ? 'pulse 1.5s infinite' : 'none',
            '@keyframes pulse': {
              '0%, 100%': { transform: 'scale(1)' },
              '50%': { transform: 'scale(1.1)' },
            },
          }} 
        />
        <Box ml={2} textAlign="center">
          <Typography variant="h3" fontWeight="bold" color={getStreakColor()}>
            {currentStreak}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            day streak
          </Typography>
        </Box>
      </Box>

      {/* Streak Label */}
      <Box textAlign="center" mb={2}>
        <Typography variant="subtitle1" fontWeight="medium">
          {getStreakLabel()}
        </Typography>
        {longestStreak > currentStreak && (
          <Typography variant="caption" color="text.secondary">
            Best: {longestStreak} days
          </Typography>
        )}
      </Box>

      {/* XP & Level Progress */}
      <Box sx={{ mt: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Box display="flex" alignItems="center">
            <EmojiEventsIcon sx={{ color: '#FFD700', mr: 0.5, fontSize: 20 }} />
            <Typography variant="body2" fontWeight="medium">
              Level {level}: {levelName}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {xp} XP
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={levelProgress} 
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: 'rgba(255,215,0,0.2)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: '#FFD700',
              borderRadius: 4,
            },
          }}
        />
        {xpToNextLevel > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', textAlign: 'right' }}>
            {xpToNextLevel} XP to next level
          </Typography>
        )}
      </Box>

      {/* Motivation */}
      {!streakAlive && currentStreak === 0 && (
        <Box 
          sx={{ 
            mt: 2, 
            p: 2, 
            bgcolor: 'warning.light', 
            borderRadius: 2,
            textAlign: 'center',
          }}
        >
          <Typography variant="body2" color="warning.contrastText">
            💪 Complete today's log to start your streak!
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default StreakCounter;
