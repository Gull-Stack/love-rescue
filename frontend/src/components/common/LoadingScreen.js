import React from 'react';
import { Box, keyframes } from '@mui/material';

// On-brand full-screen loader. Replaces bare grey spinners during route/code-split
// loads so transitions feel intentional and premium rather than "blank + spinner".

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.18); opacity: 0.75; }
`;

const ring = keyframes`
  to { transform: rotate(360deg); }
`;

const LoadingScreen = () => (
  <Box
    sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: 'background.default',
    }}
  >
    <Box sx={{ position: 'relative', width: 64, height: 64, display: 'grid', placeItems: 'center' }}>
      {/* spinning gradient ring */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'conic-gradient(from 0deg, #0E9F8E, #E08A3C, #0E9F8E00)',
          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 0)',
          mask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 0)',
          animation: `${ring} 0.9s linear infinite`,
        }}
      />
      {/* pulsing heart */}
      <Box sx={{ fontSize: 26, lineHeight: 1, animation: `${pulse} 1.4s ease-in-out infinite` }}>💗</Box>
    </Box>
  </Box>
);

export default LoadingScreen;
