import React from 'react';
import { Card, CardContent, CardActionArea, Typography, Chip, Box } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const typeIcons = {
  crisis: <ErrorIcon fontSize="small" />,
  risk: <WarningAmberIcon fontSize="small" />,
  milestone: <EmojiEventsIcon fontSize="small" />,
  stagnation: <TrendingDownIcon fontSize="small" />,
};

const AlertCard = ({ alert, onClick, compact = false }) => {
  const theme = useTheme();

  const severityColors = {
    critical: { bg: alpha(theme.palette.error.main, 0.06), border: theme.palette.error.main, text: theme.palette.error.dark },
    high: { bg: alpha(theme.palette.warning.main, 0.08), border: theme.palette.warning.main, text: theme.palette.warning.dark },
    medium: { bg: alpha(theme.palette.warning.light, 0.1), border: theme.palette.warning.light, text: theme.palette.warning.dark },
    low: { bg: alpha(theme.palette.info.main, 0.06), border: theme.palette.info.main, text: theme.palette.info.dark },
  };

  const colors = severityColors[alert.severity] || severityColors.low;

  return (
    <Card
      sx={{
        borderLeft: `4px solid ${colors.border}`,
        bgcolor: alert.read ? 'background.paper' : colors.bg,
        opacity: alert.read ? 0.75 : 1,
        mb: 1,
      }}
    >
      <CardActionArea
        onClick={onClick}
        sx={{ minHeight: 44 }}
        aria-label={`${alert.severity} ${alert.type} alert for ${alert.clientName}: ${alert.message}`}
      >
        <CardContent sx={{ py: compact ? 1 : 2, '&:last-child': { pb: compact ? 1 : 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: compact ? 0 : 0.5 }}>
            <Box sx={{ color: colors.text }}>{typeIcons[alert.type]}</Box>
            <Typography variant={compact ? 'body2' : 'subtitle2'} fontWeight={600} sx={{ flex: 1 }}>
              {alert.clientName}
            </Typography>
            <Chip
              label={alert.type}
              size="small"
              sx={{
                bgcolor: colors.border,
                color: theme.palette.getContrastText(colors.border),
                fontWeight: 600,
                fontSize: '0.7rem',
                height: 22,
              }}
            />
          </Box>
          {!compact && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {alert.message}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {new Date(alert.createdAt).toLocaleString()}
              </Typography>
            </>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default AlertCard;
