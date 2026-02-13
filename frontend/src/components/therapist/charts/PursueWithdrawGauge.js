import React from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import BalanceIcon from '@mui/icons-material/Balance';

// value: -10 (full withdraw) to +10 (full pursue), 0 = balanced
const getSeverityColor = (value) => {
  const abs = Math.abs(value);
  if (abs <= 2) return '#4caf50'; // green - balanced
  if (abs <= 4) return '#ff9800'; // yellow - mild
  if (abs <= 7) return '#ff5722'; // orange - moderate
  return '#f44336'; // red - severe
};

const getSeverityLabel = (value) => {
  const abs = Math.abs(value);
  if (abs <= 2) return 'Balanced';
  if (abs <= 4) return 'Mild';
  if (abs <= 7) return 'Moderate';
  return 'Severe';
};

const TrendArrow = ({ trend }) => {
  const props = { sx: { fontSize: 20, ml: 0.5 } };
  if (trend === 'improving') return <TrendingDownIcon {...props} color="success" />;
  if (trend === 'intensifying') return <TrendingUpIcon {...props} color="error" />;
  return <TrendingFlatIcon {...props} color="action" />;
};

const Indicator = ({ value, label, color, side }) => {
  // Convert -10..+10 to 0..100%
  const pct = ((value + 10) / 20) * 100;

  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="caption" color="text.secondary" fontWeight={500}>{label}</Typography>
      <Box sx={{ position: 'relative', height: 8, mt: 0.5 }}>
        {/* Marker */}
        <Box
          sx={{
            position: 'absolute',
            left: `${pct}%`,
            top: -4,
            transform: 'translateX(-50%)',
            width: 16,
            height: 16,
            borderRadius: '50%',
            bgcolor: color,
            border: '2px solid white',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            zIndex: 1,
          }}
        />
      </Box>
    </Box>
  );
};

const PursueWithdrawGauge = ({
  pattern = {},
  trend = 'stable',
  loading = false,
}) => {
  const theme = useTheme();
  const { partner1Value = 0, partner2Value = 0, partner1Name = 'Partner A', partner2Name = 'Partner B' } = pattern;

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={24} />
        <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2, mt: 2 }} />
      </Box>
    );
  }

  if (pattern.partner1Value === undefined && pattern.partner2Value === undefined) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }} role="img" aria-label="No pursue-withdraw data available">
        <BalanceIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        <Typography variant="h6" color="text.secondary">No pattern data yet</Typography>
        <Typography variant="body2" color="text.secondary">Pursue-withdraw dynamics will appear after assessment.</Typography>
      </Box>
    );
  }

  const color1 = getSeverityColor(partner1Value);
  const color2 = getSeverityColor(partner2Value);
  const avgSeverity = getSeverityLabel((Math.abs(partner1Value) + Math.abs(partner2Value)) / 2);

  return (
    <Box sx={{ width: '100%' }} role="img" aria-label={`Pursue-withdraw gauge: ${partner1Name} at ${partner1Value}, ${partner2Name} at ${partner2Value}`}>
      {/* Gauge track */}
      <Box sx={{ position: 'relative', mt: 2, mb: 1 }}>
        {/* Track background with gradient */}
        <Box
          sx={{
            height: 12,
            borderRadius: 6,
            background: `linear-gradient(to right, 
              ${theme.palette.info.main}40 0%, 
              ${theme.palette.success.main}40 40%, 
              ${theme.palette.success.main}60 50%, 
              ${theme.palette.success.main}40 60%, 
              ${theme.palette.warning.main}40 100%)`,
            position: 'relative',
          }}
        >
          {/* Center line */}
          <Box sx={{
            position: 'absolute', left: '50%', top: -2, width: 2, height: 16,
            bgcolor: theme.palette.text.secondary, opacity: 0.4, transform: 'translateX(-50%)',
          }} />
        </Box>

        {/* Partner indicators */}
        <Box sx={{ mt: 1 }}>
          <Indicator value={partner1Value} label={partner1Name} color={color1} />
          <Indicator value={partner2Value} label={partner2Name} color={color2} />
        </Box>
      </Box>

      {/* Labels */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="caption" color="text.secondary">← Withdrawing</Typography>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>Balanced</Typography>
        <Typography variant="caption" color="text.secondary">Pursuing →</Typography>
      </Box>

      {/* Status */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
        <Typography
          variant="body2"
          fontWeight={500}
          sx={{ color: getSeverityColor((partner1Value + partner2Value) / 2) }}
        >
          {avgSeverity}
        </Typography>
        <TrendArrow trend={trend} />
        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
          ({trend})
        </Typography>
      </Box>
    </Box>
  );
};

export default PursueWithdrawGauge;
