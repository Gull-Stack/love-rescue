import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const ProgressRing = ({ value = 0, size = 60, thickness = 4, color = 'primary', label }) => {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress
        variant="determinate"
        value={100}
        size={size}
        thickness={thickness}
        sx={{ color: 'grey.200', position: 'absolute' }}
      />
      <CircularProgress
        variant="determinate"
        value={Math.min(value, 100)}
        size={size}
        thickness={thickness}
        color={color}
        aria-label={label || `${Math.round(value)}% progress`}
      />
      <Box
        sx={{
          top: 0, left: 0, bottom: 0, right: 0,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="caption" component="div" color="text.secondary" fontWeight={600}>
          {Math.round(value)}%
        </Typography>
      </Box>
    </Box>
  );
};

export default ProgressRing;
