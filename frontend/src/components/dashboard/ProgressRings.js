import React, { useEffect, useState } from 'react';
import { Box, Typography, keyframes } from '@mui/material';

const fillAnimation = keyframes`
  from { stroke-dashoffset: 283; }
`;

const ProgressRing = ({ 
  value, 
  max, 
  size = 80, 
  strokeWidth = 8, 
  color, 
  label,
  delay = 0,
}) => {
  const [animated, setAnimated] = useState(false);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const strokeDashoffset = circumference * (1 - progress);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
      }}
    >
      <Box sx={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size}>
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e0e0e0"
            strokeWidth={strokeWidth}
          />
          {/* Progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animated ? strokeDashoffset : circumference}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{
              transition: 'stroke-dashoffset 1s ease-out',
            }}
          />
        </svg>
        {/* Center text */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <Typography 
            variant="h6" 
            fontWeight="bold"
            sx={{ lineHeight: 1, color: color }}
          >
            {value}
          </Typography>
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ fontSize: '0.65rem' }}
          >
            /{max}
          </Typography>
        </Box>
      </Box>
      <Typography 
        variant="caption" 
        fontWeight="medium"
        color="text.secondary"
        sx={{ textAlign: 'center', maxWidth: 70 }}
      >
        {label}
      </Typography>
    </Box>
  );
};

const ProgressRings = ({ 
  logsThisWeek = 0, 
  assessmentsDone = 0,
  totalAssessments = 10,
  gratitudeThisWeek = 0,
}) => {
  const rings = [
    {
      value: logsThisWeek,
      max: 7,
      color: '#e91e63',
      label: 'Daily Logs',
      delay: 0,
    },
    {
      value: gratitudeThisWeek,
      max: 7,
      color: '#f59e0b',
      label: 'Gratitude',
      delay: 200,
    },
    {
      value: assessmentsDone,
      max: totalAssessments,
      color: '#9c27b0',
      label: 'Assessments',
      delay: 400,
    },
  ];

  // Calculate overall weekly score
  const weeklyScore = Math.round(
    ((logsThisWeek / 7) * 0.4 + 
     (gratitudeThisWeek / 7) * 0.3 + 
     (assessmentsDone / totalAssessments) * 0.3) * 100
  );

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 3,
        p: 2.5,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}
    >
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1" fontWeight="bold">
          This Week
        </Typography>
        <Box
          sx={{
            px: 1.5,
            py: 0.5,
            borderRadius: 2,
            bgcolor: weeklyScore >= 70 ? 'success.light' : weeklyScore >= 40 ? 'warning.light' : 'grey.200',
          }}
        >
          <Typography 
            variant="caption" 
            fontWeight="bold"
            sx={{ 
              color: weeklyScore >= 70 ? 'success.dark' : weeklyScore >= 40 ? 'warning.dark' : 'text.secondary',
            }}
          >
            {weeklyScore}% complete
          </Typography>
        </Box>
      </Box>

      {/* Rings */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'flex-start',
        }}
      >
        {rings.map((ring, index) => (
          <ProgressRing
            key={ring.label}
            value={ring.value}
            max={ring.max}
            color={ring.color}
            label={ring.label}
            delay={ring.delay}
          />
        ))}
      </Box>

      {/* Motivation message */}
      {weeklyScore < 100 && (
        <Typography 
          variant="body2" 
          color="text.secondary" 
          textAlign="center" 
          mt={2}
          sx={{ fontSize: '0.85rem' }}
        >
          {weeklyScore < 30 
            ? "Let's get started! Small steps lead to big changes 💪"
            : weeklyScore < 70 
              ? "Great progress! Keep the momentum going 🌟"
              : "Almost there! You're doing amazing 🔥"
          }
        </Typography>
      )}
      {weeklyScore >= 100 && (
        <Typography 
          variant="body2" 
          textAlign="center" 
          mt={2}
          sx={{ 
            fontSize: '0.85rem',
            fontWeight: 'bold',
            color: 'success.main',
          }}
        >
          Perfect week! You're a relationship champion 🏆
        </Typography>
      )}
    </Box>
  );
};

export default ProgressRings;
