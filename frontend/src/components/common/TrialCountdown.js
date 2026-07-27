/**
 * TrialCountdown — small dismissible banner nudging trial users toward a plan
 * as their trial winds down.
 *
 * Renders nothing unless `daysLeft` is a number between 0 and 7 (inclusive).
 * Dismissing hides it for the rest of the day (localStorage,
 * key `lr_trial_banner_dismissed` = YYYY-MM-DD) — it returns tomorrow.
 */
import React, { useState } from 'react';
import { Alert, Button, IconButton, Stack } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'lr_trial_banner_dismissed';

// Brand amber (#E08A3C) tints — warm nudge, not an alarm.
const AMBER = '#E08A3C';

/** Local date as YYYY-MM-DD. */
function todayStamp() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function isDismissedToday() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === todayStamp();
  } catch {
    // Storage unavailable (private mode, embedded webview) — just show it.
    return false;
  }
}

/**
 * @param {number|null} daysLeft days remaining in the free trial; the banner
 *                               renders only when 0 <= daysLeft <= 7
 */
const TrialCountdown = ({ daysLeft }) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(isDismissedToday);

  if (daysLeft == null || daysLeft > 7 || daysLeft < 0 || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, todayStamp());
    } catch {
      /* storage unavailable — dismiss for this render only */
    }
    setDismissed(true);
  };

  const when =
    daysLeft === 0
      ? 'today'
      : `in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`;

  return (
    <Alert
      icon={<AccessTimeIcon fontSize="inherit" />}
      severity="warning"
      sx={{
        mb: 2,
        alignItems: 'center',
        bgcolor: 'rgba(224, 138, 60, 0.12)',
        border: '1px solid rgba(224, 138, 60, 0.35)',
        borderRadius: 2,
        color: 'text.primary',
        '& .MuiAlert-icon': { color: AMBER },
        '& .MuiAlert-message': { py: 0.75 },
      }}
      action={
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Button
            size="small"
            onClick={() => navigate('/subscribe?from=trial')}
            sx={{
              color: AMBER,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              '&:hover': { bgcolor: 'rgba(224, 138, 60, 0.12)' },
            }}
          >
            See plans
          </Button>
          <IconButton
            size="small"
            aria-label="Dismiss trial reminder"
            onClick={handleDismiss}
            sx={{ color: 'text.secondary' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      }
    >
      Your free trial ends {when} — keep your streak and your plan.
    </Alert>
  );
};

export default TrialCountdown;
