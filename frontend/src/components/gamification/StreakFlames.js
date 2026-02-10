import React from 'react';
import { Box, Typography } from '@mui/material';

const styleId = 'streak-flame-styles';
if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
  const s = document.createElement('style');
  s.id = styleId;
  s.textContent = `
    @keyframes flicker {
      0%, 100% { transform: scale(1) rotate(-1deg); opacity: 1; }
      25% { transform: scale(1.05) rotate(1deg); opacity: 0.9; }
      50% { transform: scale(0.98) rotate(-0.5deg); opacity: 1; }
      75% { transform: scale(1.03) rotate(0.5deg); opacity: 0.95; }
    }
    .streak-flame { display: inline-block; animation: flicker 1.5s ease-in-out infinite; }
  `;
  document.head.appendChild(s);
}

const getFlameDisplay = (streak) => {
  if (streak <= 0) return { flames: '', label: 'Start your streak!', size: '2rem' };
  if (streak <= 2) return { flames: '🔥', label: 'Ember', size: '2.5rem' };
  if (streak <= 6) return { flames: '🔥🔥', label: 'Growing fire', size: '2.5rem' };
  if (streak <= 13) return { flames: '🔥🔥🔥', label: 'Blazing!', size: '3rem' };
  if (streak <= 29) return { flames: '🔥🔥🔥🔥', label: 'Inferno!', size: '3rem' };
  return { flames: '🔥👑', label: 'LEGENDARY', size: '3.5rem' };
};

const StreakFlames = ({ streak = 0 }) => {
  const { flames, label, size } = getFlameDisplay(streak);

  return (
    <Box sx={{
      textAlign: 'center', py: 2, px: 3,
      background: streak > 0
        ? 'linear-gradient(135deg, rgba(255,107,53,0.08), rgba(255,215,0,0.08))'
        : 'transparent',
      borderRadius: 3,
    }}>
      {flames && (
        <Typography className="streak-flame" sx={{ fontSize: size, lineHeight: 1 }}>
          {flames}
        </Typography>
      )}
      <Typography variant="h4" fontWeight="900" sx={{ mt: 0.5, color: streak > 0 ? '#FF6B35' : 'text.secondary' }}>
        Day {streak}
      </Typography>
      <Typography variant="caption" color="text.secondary" fontWeight="bold">
        {label}
      </Typography>
    </Box>
  );
};

export default StreakFlames;
