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

// Assessment order for the priority waterfall
const ASSESSMENT_ORDER = [
  { type: 'attachment', name: 'Attachment Style' },
  { type: 'love-language', name: 'Love Languages' },
  { type: 'conflict', name: 'Conflict Style' },
  { type: 'communication', name: 'Communication' },
  { type: 'emotional-intelligence', name: 'Emotional Intelligence' },
  { type: 'trust', name: 'Trust' },
  { type: 'intimacy', name: 'Intimacy' },
  { type: 'values', name: 'Values Alignment' },
  { type: 'boundaries', name: 'Boundaries' },
  { type: 'growth', name: 'Growth Mindset' },
];

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
  // Determine which assessments are completed (by count, map to order)
  const nextAssessmentIndex = assessmentsDone;

  // 1. No assessments completed
  if (assessmentsDone === 0) {
    return {
      gradient: GRADIENTS.assessment,
      message: 'Every great relationship starts with understanding yourself',
      subtitle: '~5 min',
      cta: 'Begin',
      path: '/assessments/attachment',
    };
  }

  // 2. Less than 3 assessments
  if (assessmentsDone < 3 && nextAssessmentIndex < totalAssessments) {
    const next = ASSESSMENT_ORDER[nextAssessmentIndex] || ASSESSMENT_ORDER[0];
    return {
      gradient: GRADIENTS.assessment,
      message: `Keep discovering — ${next.name} is next`,
      subtitle: '~5 min',
      cta: 'Continue',
      path: `/assessments/${next.type}`,
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
