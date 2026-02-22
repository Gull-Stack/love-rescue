import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { keyframes } from '@mui/system';

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
`;

const EmptyState = ({ emoji, title, subtitle, ctaText, onCta, gradient }) => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    textAlign="center"
    py={8}
  >
    <Box
      sx={{
        fontSize: 64,
        lineHeight: 1,
        mb: 2,
        animation: `${pulse} 2s ease-in-out infinite`,
      }}
    >
      {emoji}
    </Box>
    <Typography variant="h5" fontWeight="bold" gutterBottom>
      {title}
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }}>
      {subtitle}
    </Typography>
    {ctaText && onCta && (
      <Button
        variant="contained"
        size="large"
        onClick={onCta}
        sx={{
          mt: 3,
          ...(gradient && {
            background: gradient,
            '&:hover': { background: gradient, filter: 'brightness(0.95)' },
          }),
        }}
      >
        {ctaText}
      </Button>
    )}
  </Box>
);

export default EmptyState;
