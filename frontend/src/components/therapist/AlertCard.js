import React from 'react';
import { Card, CardContent, CardActionArea, Typography, Chip, Box } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import NotificationsIcon from '@mui/icons-material/Notifications';

const typeIcons = {
  crisis: <ErrorIcon fontSize="small" />,
  risk: <WarningAmberIcon fontSize="small" />,
  milestone: <EmojiEventsIcon fontSize="small" />,
  stagnation: <TrendingDownIcon fontSize="small" />,
};

// User-facing labels for API alert types. Keep API values unchanged —
// this is display-only ("STAGNATION" reads better as "Losing momentum").
const typeLabels = {
  crisis: 'Crisis',
  risk: 'Risk',
  milestone: 'Milestone',
  stagnation: 'Losing momentum',
};

/** Display label for an API alert type (accepts any case). */
export const alertTypeLabel = (type) => {
  const key = String(type || '').toLowerCase();
  return typeLabels[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Alert');
};

/**
 * Renders a therapist alert. The API returns uppercase enum values
 * (alertType: CRISIS/RISK/MILESTONE/STAGNATION, severity: LOW/MEDIUM/HIGH/CRITICAL),
 * a nested client object, and readAt (timestamp or null) — normalize them here.
 */
const AlertCard = ({ alert, onClick, compact = false }) => {
  const theme = useTheme();

  const severity = String(alert.severity || '').toLowerCase();
  const type = String(alert.alertType || alert.type || '').toLowerCase();
  const clientName = alert.client
    ? [alert.client.firstName, alert.client.lastName].filter(Boolean).join(' ') || 'Client'
    : alert.clientName || 'Client';
  const isRead = alert.readAt != null || alert.read === true;

  const severityColors = {
    critical: { bg: alpha(theme.palette.error.main, 0.06), border: theme.palette.error.main, text: theme.palette.error.dark },
    high: { bg: alpha(theme.palette.warning.main, 0.08), border: theme.palette.warning.main, text: theme.palette.warning.dark },
    medium: { bg: alpha(theme.palette.warning.light, 0.1), border: theme.palette.warning.light, text: theme.palette.warning.dark },
    low: { bg: alpha(theme.palette.info.main, 0.06), border: theme.palette.info.main, text: theme.palette.info.dark },
  };

  const colors = severityColors[severity] || severityColors.low;

  return (
    <Card
      sx={{
        borderLeft: `4px solid ${colors.border}`,
        bgcolor: isRead ? 'background.paper' : colors.bg,
        opacity: isRead ? 0.75 : 1,
        mb: 1,
      }}
    >
      <CardActionArea
        onClick={onClick}
        sx={{ minHeight: 44 }}
        aria-label={`${severity} ${type} alert for ${clientName}: ${alert.message}`}
      >
        <CardContent sx={{ py: compact ? 1 : 2, '&:last-child': { pb: compact ? 1 : 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: compact ? 0 : 0.5 }}>
            <Box sx={{ color: colors.text, display: 'flex' }}>
              {typeIcons[type] || <NotificationsIcon fontSize="small" />}
            </Box>
            <Typography variant={compact ? 'body2' : 'subtitle2'} fontWeight={600} sx={{ flex: 1 }}>
              {clientName}
            </Typography>
            <Chip
              label={alertTypeLabel(type)}
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
          {compact && alert.message && (
            <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 0.5 }}>
              {alert.message}
            </Typography>
          )}
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
