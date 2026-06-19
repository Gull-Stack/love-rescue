import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, keyframes } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Number of assessments required before a personalized plan unlocks.
const ASSESSMENTS_TO_UNLOCK_PLAN = 3;

const GRADIENTS = {
  assessment: 'linear-gradient(135deg, #667eea, #764ba2)',
  daily: 'linear-gradient(135deg, #f093fb, #f5576c)',
  strategy: 'linear-gradient(135deg, #4facfe, #00f2fe)',
  gratitude: 'linear-gradient(135deg, #43e97b, #38f9d7)',
  realTalk: 'linear-gradient(135deg, #4facfe, #00f2fe)',
  loveNote: 'linear-gradient(135deg, #f093fb, #f5576c)',
  done: 'linear-gradient(135deg, #d4fc79, #96e6a1)',
};

function getAction({
  assessmentsDone,
  totalAssessments,
  hasLoggedToday,
  hasGratitudeToday,
  hasTriedRealTalk,
  strategy,
  loveNote,
  partnerName,
}) {
  // 1. No assessments completed
  if (assessmentsDone === 0) {
    return {
      gradient: GRADIENTS.assessment,
      message: 'Your plan starts with a few quick questions about you',
      subtitle: 'First assessment · attachment style',
      cta: 'Start',
      // Go straight into the first question, not the catalog — fewer decisions,
      // faster to the first "aha".
      path: '/assessments/attachment',
    };
  }

  // 2. Fewer than the number needed to unlock a plan
  if (assessmentsDone < ASSESSMENTS_TO_UNLOCK_PLAN) {
    const remaining = ASSESSMENTS_TO_UNLOCK_PLAN - assessmentsDone;
    return {
      gradient: GRADIENTS.assessment,
      message: `${remaining} more assessment${remaining === 1 ? '' : 's'} and your personalized plan unlocks`,
      subtitle: '~5 min each',
      cta: 'Continue',
      path: '/assessments',
    };
  }

  // 3. Haven't logged today
  if (!hasLoggedToday) {
    return {
      gradient: GRADIENTS.daily,
      message: 'How are you showing up today?',
      subtitle: '~45 sec',
      cta: 'Check In (~45 sec)',
      path: '/daily',
    };
  }

  // 4. Strategy task pending
  if (strategy?.todayActivity) {
    return {
      gradient: GRADIENTS.strategy,
      message: strategy.todayActivity,
      subtitle: '~3 min',
      cta: "Today's Activity",
      path: '/strategies',
    };
  }

  // 5. Gratitude not logged
  if (!hasGratitudeToday) {
    const target = partnerName || 'yourself';
    return {
      gradient: GRADIENTS.gratitude,
      message: `One thing you appreciate about ${target}`,
      subtitle: '~30 sec',
      cta: 'Gratitude',
      path: '/gratitude',
    };
  }

  // 5.5 Real Talk — show when user hasn't tried it yet
  if (!hasTriedRealTalk) {
    return {
      gradient: GRADIENTS.realTalk,
      message: 'Need to say something hard? Let us help you say it well.',
      subtitle: '~2 min',
      cta: 'Try Real Talk',
      path: '/real-talk',
    };
  }

  // 6. Love note available
  if (loveNote) {
    return {
      gradient: GRADIENTS.loveNote,
      message: 'You have a love note 💌',
      subtitle: null,
      cta: 'Read',
      path: '/gratitude',
    };
  }

  // 7. All done
  return {
    gradient: GRADIENTS.done,
    message: "You showed up today. That's what transformation looks like.",
    subtitle: null,
    cta: null,
    path: null,
    isDone: true,
  };
}

const ActionCard = ({
  user,
  assessmentsDone = 0,
  totalAssessments = 10,
  hasLoggedToday = false,
  hasGratitudeToday = false,
  hasTriedRealTalk = false,
  strategy = null,
  loveNote = null,
  partnerName = null,
  streak = 0,
}) => {
  const navigate = useNavigate();

  const action = getAction({
    assessmentsDone,
    totalAssessments,
    hasLoggedToday,
    hasGratitudeToday,
    hasTriedRealTalk,
    strategy,
    loveNote,
    partnerName,
  });

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: 180,
        borderRadius: '20px',
        background: action.gradient,
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        animation: `${fadeInUp} 0.5s ease-out`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Done state checkmark */}
      {action.isDone && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
          <CheckCircleOutlineIcon sx={{ color: 'rgba(255,255,255,0.9)', fontSize: 40 }} />
        </Box>
      )}

      {/* Message */}
      <Typography
        variant="h5"
        sx={{
          color: '#fff',
          fontWeight: 700,
          lineHeight: 1.3,
          mb: action.subtitle || action.cta ? 1 : 0,
          textAlign: action.isDone ? 'center' : 'left',
        }}
      >
        {action.message}
      </Typography>

      {/* Subtitle (time estimate) */}
      {action.subtitle && (
        <Typography
          variant="body2"
          sx={{
            color: 'rgba(255,255,255,0.85)',
            mb: 2,
          }}
        >
          {action.subtitle}
        </Typography>
      )}

      {/* CTA button */}
      {action.cta && (
        <Button
          onClick={() => navigate(action.path)}
          sx={{
            alignSelf: 'flex-start',
            bgcolor: '#fff',
            color: '#333',
            fontWeight: 700,
            fontSize: '0.95rem',
            borderRadius: '24px',
            height: 48,
            px: 4,
            textTransform: 'none',
            boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.92)',
              boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
            },
          }}
        >
          {action.cta}
        </Button>
      )}
    </Box>
  );
};

export default ActionCard;
