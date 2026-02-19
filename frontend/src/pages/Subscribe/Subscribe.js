import React from 'react';
import { Box, Typography } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';

/**
 * Subscribe page — DISABLED
 *
 * The app is now fully free. This page previously hosted the subscription
 * paywall. It now shows a simple "all features are free" message.
 */
const Subscribe = () => {
  return (
    <Box textAlign="center" py={8}>
      <FavoriteIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        LoveRescue is Free 💜
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto' }}>
        All features are fully unlocked for every user — no subscription required.
        Enjoy assessments, matchup, strategies, reports, and everything else at no cost.
      </Typography>
    </Box>
  );
};

export default Subscribe;
