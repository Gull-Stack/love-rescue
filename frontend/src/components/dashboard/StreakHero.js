import React from 'react';
import { Box, Typography, keyframes } from '@mui/material';

// Pulse animation for active streaks
const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const glow = keyframes`
  0% { box-shadow: 0 0 20px rgba(255, 107, 53, 0.3); }
  50% { box-shadow: 0 0 40px rgba(255, 107, 53, 0.6); }
  100% { box-shadow: 0 0 20px rgba(255, 107, 53, 0.3); }
`;

const StreakHero = ({ streak = 0, partnerName }) => {
  const isActive = streak > 0;
  
  // Dynamic messaging based on streak length
  const getMessage = () => {
    if (streak === 0) return "Start your streak today!";
    if (streak === 1) return "1 day strong! Keep going!";
    if (streak < 7) return `${streak} days strong! 🔥`;
    if (streak < 14) return `${streak} days! You're on fire! 🔥🔥`;
    if (streak < 30) return `${streak} days! Incredible! 🔥🔥🔥`;
    return `${streak} days! LEGENDARY! 👑🔥`;
  };

  // Personalized subtext
  const getSubtext = () => {
    if (streak === 0) {
      return partnerName 
        ? `Log how things are going with ${partnerName}` 
        : "Log your first check-in";
    }
    if (streak < 7) {
      return "7-day streak unlocks special insights";
    }
    if (streak < 30) {
      return "30-day streak = relationship mastery badge!";
    }
    return "You're building something beautiful";
  };

  return (
    <Box
      sx={{
        background: isActive 
          ? 'linear-gradient(135deg, #FF6B35 0%, #FF8C61 50%, #FFB088 100%)'
          : 'linear-gradient(135deg, #e0e0e0 0%, #bdbdbd 100%)',
        borderRadius: 4,
        p: 3,
        textAlign: 'center',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        animation: isActive ? `${glow} 2s ease-in-out infinite` : 'none',
      }}
    >
      {/* Background decoration */}
      <Box
        sx={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 150,
          height: 150,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '50%',
        }}
      />
      
      {/* Streak number with fire emoji */}
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          animation: isActive ? `${pulse} 2s ease-in-out infinite` : 'none',
        }}
      >
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: '4rem', sm: '5rem' },
            fontWeight: 800,
            lineHeight: 1,
            textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          {streak}
        </Typography>
        <Typography
          sx={{
            fontSize: { xs: '3rem', sm: '4rem' },
            lineHeight: 1,
          }}
        >
          {isActive ? '🔥' : '💤'}
        </Typography>
      </Box>

      {/* Message */}
      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          mt: 1,
          textShadow: '1px 1px 2px rgba(0,0,0,0.2)',
        }}
      >
        {getMessage()}
      </Typography>

      {/* Subtext */}
      <Typography
        variant="body2"
        sx={{
          opacity: 0.9,
          mt: 0.5,
        }}
      >
        {getSubtext()}
      </Typography>
    </Box>
  );
};

export default StreakHero;
