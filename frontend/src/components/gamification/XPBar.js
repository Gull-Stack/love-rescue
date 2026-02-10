import React, { useState, useEffect } from 'react';
import { Box, Typography, LinearProgress, Collapse, Paper, alpha } from '@mui/material';
import { streaksApi } from '../../services/api';

const XPBar = () => {
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    streaksApi.getStreak()
      .then(res => setData(res.data))
      .catch(() => {});
  }, []);

  if (!data || !data.xp) return null;

  const { xp = 0, level = 1, levelName = '', levelProgress = 0, xpToNextLevel = 100, currentStreak = 0 } = data;

  return (
    <Box sx={{ mx: 1, minWidth: 120, maxWidth: 180, cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="caption" fontWeight="bold" color="primary" sx={{ fontSize: '0.7rem' }}>
          Lv.{level}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={levelProgress}
          sx={{
            flex: 1, height: 6, borderRadius: 3,
            bgcolor: alpha('#667eea', 0.15),
            '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: '#667eea' },
          }}
        />
        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
          {xp}xp
        </Typography>
      </Box>

      <Collapse in={expanded}>
        <Paper elevation={3} sx={{
          position: 'absolute', right: 8, top: '100%', mt: 0.5,
          p: 2, borderRadius: 2, minWidth: 200, zIndex: 1200,
        }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            ⚡ {levelName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Level {level} • {xp} XP total
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {xpToNextLevel - Math.round(levelProgress / 100 * xpToNextLevel)} XP to next level
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            🔥 {currentStreak} day streak
          </Typography>
        </Paper>
      </Collapse>
    </Box>
  );
};

export default XPBar;
