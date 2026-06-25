import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Button, keyframes } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

/**
 * ProgressJourney — "where am I, and what's next."
 *
 * A always-visible wayfinding card: a 4-stop track that shows the user's place
 * in the Love Rescue journey (Set up → Build → Practice → Thrive) with a clear
 * "You're here" marker, plus ONE Continue button that always points to their
 * exact next step. Uses theme color tokens, not hard-coded hex.
 *
 * Props (all derived from data the Dashboard already loads):
 *   userState          — BLANK | DISCOVERING | BUILDING | PRACTICING | TRANSFORMED
 *   assessmentsDone    — number completed
 *   assessmentsToUnlock— count needed to unlock the plan (default 3)
 *   hasLoggedToday     — bool
 *   hasGratitudeToday  — bool
 *   strategy           — current strategy/plan object (or null)
 */

const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(224,138,60,0.45); }
  50% { box-shadow: 0 0 0 8px rgba(224,138,60,0); }
`;

const STAGES = [
  { key: 'setup', label: 'Set up' },
  { key: 'build', label: 'Build' },
  { key: 'practice', label: 'Practice' },
  { key: 'thrive', label: 'Thrive' },
];

// Map the five lifecycle states onto the four visible stops.
const STATE_TO_INDEX = {
  BLANK: 0,
  DISCOVERING: 0,
  BUILDING: 1,
  PRACTICING: 2,
  TRANSFORMED: 3,
};

function getNextStep({ assessmentsDone, assessmentsToUnlock, hasLoggedToday, strategy, hasGratitudeToday }) {
  if (assessmentsDone < assessmentsToUnlock) {
    const left = assessmentsToUnlock - assessmentsDone;
    return {
      label: `Finish your assessments — ${left} to go to unlock your plan`,
      cta: 'Continue',
      route: '/assessments',
    };
  }
  if (!hasLoggedToday) {
    return { label: "Do today's check-in — about 45 seconds", cta: 'Check in', route: '/daily' };
  }
  if (strategy) {
    return {
      label: strategy.week
        ? `Work this week's plan · Week ${strategy.week}`
        : "Work this week's plan",
      cta: 'Open my plan',
      route: '/strategies',
    };
  }
  if (!hasGratitudeToday) {
    return { label: 'Add one moment of gratitude', cta: 'Continue', route: '/gratitude' };
  }
  return { label: "You're caught up today — keep building your Journey", cta: 'Explore Journey', route: '/course' };
}

const ProgressJourney = ({
  userState,
  assessmentsDone = 0,
  assessmentsToUnlock = 3,
  hasLoggedToday = false,
  hasGratitudeToday = false,
  strategy = null,
}) => {
  const navigate = useNavigate();
  const current = STATE_TO_INDEX[userState] ?? 0;
  const next = getNextStep({ assessmentsDone, assessmentsToUnlock, hasLoggedToday, strategy, hasGratitudeToday });

  return (
    <Card sx={{ mb: 2, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Typography variant="overline" sx={{ letterSpacing: 1, color: 'text.secondary' }}>
          Your progress
        </Typography>

        {/* Track */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mt: 1.5, mb: 2.5 }}>
          {STAGES.map((stage, i) => {
            const done = i < current;
            const isCurrent = i === current;
            const dotColor = done ? 'success.main' : isCurrent ? 'secondary.main' : 'rgba(0,0,0,0.12)';
            const connectorDone = i < current; // line leading INTO this node is "done"
            return (
              <React.Fragment key={stage.key}>
                {i > 0 && (
                  <Box
                    sx={{
                      flex: 1,
                      height: 3,
                      mt: '13px',
                      borderRadius: 2,
                      bgcolor: connectorDone ? 'success.main' : 'rgba(0,0,0,0.10)',
                    }}
                  />
                )}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 64 }}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: dotColor,
                      color: '#fff',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      animation: isCurrent ? `${pulse} 2s ease-in-out infinite` : 'none',
                    }}
                  >
                    {done ? <CheckIcon sx={{ fontSize: 16 }} /> : i + 1}
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      mt: 0.75,
                      fontSize: '0.7rem',
                      fontWeight: isCurrent ? 700 : 500,
                      color: isCurrent ? 'secondary.main' : done ? 'text.primary' : 'text.secondary',
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}
                  >
                    {stage.label}
                  </Typography>
                  {isCurrent && (
                    <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                      You're here
                    </Typography>
                  )}
                </Box>
              </React.Fragment>
            );
          })}
        </Box>

        {/* Next step + Continue */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          Next step
        </Typography>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
          {next.label}
        </Typography>
        <Button
          fullWidth
          variant="contained"
          color="secondary"
          endIcon={<ArrowForwardIcon />}
          onClick={() => navigate(next.route)}
          sx={{ py: 1.25, fontWeight: 700, borderRadius: 2 }}
        >
          {next.cta}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProgressJourney;
