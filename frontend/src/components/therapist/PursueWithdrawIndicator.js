import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const trendIcons = {
  improving: <TrendingUpIcon sx={{ color: 'success.main' }} />,
  worsening: <TrendingDownIcon sx={{ color: 'error.main' }} />,
  stable: <TrendingFlatIcon sx={{ color: 'text.secondary' }} />,
};

const PursueWithdrawIndicator = ({ pursuer, withdrawer, intensity = 50, trend = 'stable', description }) => {
  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
        <Chip
          label={`${pursuer?.name || 'Partner A'}: Pursuer`}
          color="primary"
          variant="outlined"
          sx={{ fontWeight: 600, minHeight: 44 }}
        />
        <ArrowForwardIcon sx={{ color: 'text.secondary' }} />
        <Chip
          label={`${withdrawer?.name || 'Partner B'}: Withdrawer`}
          color="secondary"
          variant="outlined"
          sx={{ fontWeight: 600, minHeight: 44 }}
        />
      </Box>
      {/* Intensity bar */}
      <Box sx={{ mb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Pattern Intensity
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              flex: 1,
              height: 8,
              borderRadius: 4,
              bgcolor: 'grey.200',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                width: `${Math.min(intensity, 100)}%`,
                height: '100%',
                borderRadius: 4,
                bgcolor: intensity > 70 ? 'error.main' : intensity > 40 ? 'warning.main' : 'success.main',
                transition: 'width 0.3s',
              }}
              role="progressbar"
              aria-valuenow={intensity}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Pursue-withdraw intensity: ${intensity}%`}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {trendIcons[trend]}
          </Box>
        </Box>
      </Box>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {description}
        </Typography>
      )}
    </Box>
  );
};

export default PursueWithdrawIndicator;
