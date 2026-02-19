import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  LinearProgress,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  Chip,
  Paper,
  Fade,
  Slide,
  Snackbar,
  Divider,
  useMediaQuery,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
} from '@mui/material';
import confetti from 'canvas-confetti';
import { hapticLight, hapticMedium, hapticSuccess } from '../../utils/haptics';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckIcon from '@mui/icons-material/Check';
import FavoriteIcon from '@mui/icons-material/Favorite';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import StarIcon from '@mui/icons-material/Star';
import { assessmentsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

// ─── Assessment Metadata ──────────────────────────────────────────────────────
const assessmentMeta = {
  attachment: {
    title: 'Attachment Style Assessment',
    icon: '❤️',
    encouragement: 'There are no bad attachment styles — only patterns to understand.',
    scaleType: 'likert7',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#667eea',
    scaleLabels: {
      1: 'Strongly Disagree',
      2: 'Disagree',
      3: 'Slightly Disagree',
      4: 'Neutral',
      5: 'Slightly Agree',
      6: 'Agree',
      7: 'Strongly Agree',
    },
  },
  personality: {
    title: 'Personality Type Assessment',
    icon: '🧠',
    encouragement: 'Every personality type has unique gifts to offer a relationship.',
    scaleType: 'likert7',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#764ba2',
    scaleLabels: {
      1: 'Not at all like me',
      2: 'Rarely like me',
      3: 'Somewhat unlike me',
      4: 'Neutral',
      5: 'Somewhat like me',
      6: 'Often like me',
      7: 'Very much like me',
    },
  },
  love_language: {
    title: 'Love Language Assessment',
    icon: '💝',
    encouragement: 'There is no wrong way to love — just YOUR way.',
    scaleType: 'forced_choice',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#e91e63',
    scaleLabels: {},
  },
  human_needs: {
    title: 'Human Needs Profile',
    icon: '⚡',
    encouragement: 'All six needs are valid. Knowing yours is power.',
    scaleType: 'likert7',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ff9800',
    scaleLabels: {
      1: 'Never',
      2: 'Rarely',
      3: 'Sometimes',
      4: 'Neutral',
      5: 'Often',
      6: 'Very Often',
      7: 'Always',
    },
  },
  gottman_checkup: {
    title: 'Relationship Health Checkup',
    icon: '🏠',
    encouragement: 'Awareness of patterns is the first step to changing them.',
    scaleType: 'likert7',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: '#f5576c',
    scaleLabels: {
      1: 'Strongly Disagree',
      2: 'Disagree',
      3: 'Slightly Disagree',
      4: 'Neutral',
      5: 'Slightly Agree',
      6: 'Agree',
      7: 'Strongly Agree',
    },
  },
  emotional_intelligence: {
    title: 'Emotional Intelligence Assessment',
    icon: '🎯',
    encouragement: 'EQ is a skill, not a fixed trait. You can always grow.',
    scaleType: 'likert7',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: '#9c27b0',
    scaleLabels: {
      1: 'Never',
      2: 'Rarely',
      3: 'Sometimes',
      4: 'About Half the Time',
      5: 'Often',
      6: 'Usually',
      7: 'Always',
    },
  },
  conflict_style: {
    title: 'Conflict Resolution Style',
    icon: '⚔️',
    encouragement: 'No style is always right — mastery means choosing wisely.',
    scaleType: 'likert7',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    color: '#4facfe',
    scaleLabels: {
      1: 'Strongly Disagree',
      2: 'Disagree',
      3: 'Slightly Disagree',
      4: 'Neutral',
      5: 'Slightly Agree',
      6: 'Agree',
      7: 'Strongly Agree',
    },
  },
  differentiation: {
    title: 'Differentiation Level Assessment',
    icon: '🌱',
    encouragement: 'Growth means learning to hold yourself AND stay connected.',
    scaleType: 'likert7',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    color: '#00c9a7',
    scaleLabels: {
      1: 'Not at all true',
      2: 'Rarely true',
      3: 'Somewhat untrue',
      4: 'Neutral',
      5: 'Somewhat true',
      6: 'Usually true',
      7: 'Very true',
    },
  },
  hormonal_health: {
    title: 'Hormonal Wellness Assessment',
    icon: '🧬',
    encouragement: 'Your body tells a story. This helps you listen — not diagnose.',
    scaleType: 'likert7',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: '#e91e63',
    scaleLabels: {
      1: 'Strongly Disagree',
      2: 'Disagree',
      3: 'Slightly Disagree',
      4: 'Neutral',
      5: 'Slightly Agree',
      6: 'Agree',
      7: 'Strongly Agree',
    },
  },
  physical_vitality: {
    title: 'Physical Vitality Assessment',
    icon: '💪',
    encouragement: 'Your physical health powers everything — including your love life.',
    scaleType: 'likert7',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    color: '#00c9a7',
    scaleLabels: {
      1: 'Strongly Disagree',
      2: 'Disagree',
      3: 'Slightly Disagree',
      4: 'Neutral',
      5: 'Slightly Agree',
      6: 'Agree',
      7: 'Strongly Agree',
    },
  },
};

// Warm encouragement messages that rotate as user progresses
const progressEncouragements = [
  "You're doing great. Honest answers lead to real growth. 💛",
  'Take your time — there are no wrong answers here.',
  "Self-awareness takes courage. You're showing it right now.",
  'Every answer is a step toward understanding yourself better.',
  "You're building a clearer picture of who you are. Keep going!",
  'Halfway there! Your honesty is your greatest tool.',
  "Almost done — you're creating something valuable here.",
  'The finish line is close. You should be proud of this work.',
];

// ─── Likert Scale Component (1-7) ────────────────────────────────────────────
const LikertScale = ({ value, onChange, labels, color }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const options = Object.entries(labels).map(([val, label]) => ({
    value: parseInt(val),
    label,
  }));

  if (isMobile) {
    // MOBILE: Compact horizontal buttons in thumb zone
    return (
      <Box>
        {/* Scale endpoints */}
        <Box display="flex" justifyContent="space-between" mb={1} px={0.5}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', maxWidth: '40%' }}>
            {options[0]?.label}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', maxWidth: '40%', textAlign: 'right' }}>
            {options[options.length - 1]?.label}
          </Typography>
        </Box>

        {/* Compact horizontal button row */}
        <Box display="flex" justifyContent="space-between" gap={0.5} px={0.5}>
          {options.map((option) => {
            const isSelected = value === option.value;
            return (
              <Button
                key={option.value}
                variant={isSelected ? 'contained' : 'outlined'}
                onClick={() => onChange(option.value)}
                sx={{
                  minWidth: 40,
                  width: 40,
                  height: 48,
                  borderRadius: 2,
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  p: 0,
                  transition: 'all 0.15s ease',
                  ...(isSelected
                    ? {
                        bgcolor: color,
                        color: 'white',
                        boxShadow: `0 4px 12px ${alpha(color, 0.4)}`,
                        transform: 'scale(1.1)',
                        '&:hover': { bgcolor: color },
                      }
                    : {
                        borderColor: alpha(color, 0.3),
                        color: 'text.secondary',
                        bgcolor: 'background.paper',
                        '&:hover': {
                          borderColor: color,
                          bgcolor: alpha(color, 0.06),
                        },
                      }),
                }}
              >
                {option.value}
              </Button>
            );
          })}
        </Box>

        {/* Selected label feedback */}
        {value && (
          <Fade in>
            <Typography
              variant="body2"
              textAlign="center"
              mt={1.5}
              fontWeight="bold"
              color={color}
              sx={{ fontSize: '0.85rem' }}
            >
              {labels[value]}
            </Typography>
          </Fade>
        )}
      </Box>
    );
  }

  // Desktop: horizontal button strip
  return (
    <Box>
      {/* Scale endpoints */}
      <Box display="flex" justifyContent="space-between" mb={1}>
        <Typography variant="caption" color="text.secondary">
          {options[0]?.label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {options[options.length - 1]?.label}
        </Typography>
      </Box>

      {/* Buttons */}
      <Box display="flex" justifyContent="center" gap={1.5}>
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <Tooltip key={option.value} title={option.label} arrow placement="bottom">
              <Button
                variant={isSelected ? 'contained' : 'outlined'}
                onClick={() => onChange(option.value)}
                sx={{
                  minWidth: 52,
                  height: 52,
                  borderRadius: '50%',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease',
                  ...(isSelected
                    ? {
                        bgcolor: color,
                        color: 'white',
                        boxShadow: `0 4px 14px ${alpha(color, 0.4)}`,
                        '&:hover': { bgcolor: color, opacity: 0.9 },
                      }
                    : {
                        borderColor: alpha(color, 0.3),
                        color: 'text.secondary',
                        '&:hover': {
                          borderColor: color,
                          bgcolor: alpha(color, 0.06),
                        },
                      }),
                }}
              >
                {option.value}
              </Button>
            </Tooltip>
          );
        })}
      </Box>

      {/* Selected label */}
      {value && (
        <Fade in>
          <Typography
            variant="body2"
            textAlign="center"
            mt={1.5}
            fontWeight="bold"
            color={color}
          >
            {labels[value]}
          </Typography>
        </Fade>
      )}
    </Box>
  );
};

// ─── Forced Choice Component (for Love Languages) ────────────────────────────
const ForcedChoice = ({ question, value, onChange, color }) => {
  let options = question.options || question.choices || [];

  // Handle love language optionA/optionB format from backend
  if (options.length === 0 && question.optionA && question.optionB) {
    options = [
      { text: question.optionA.text, value: 'A' },
      { text: question.optionB.text, value: 'B' },
    ];
  }

  // Swipe handling for A/B choices
  const touchStartX = React.useRef(null);
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 60 && options.length === 2) {
      // Swipe left = A (first option), Swipe right = B (second option)
      const idx = diff < 0 ? 0 : 1;
      onChange(options[idx].value ?? options[idx].id ?? idx);
    }
    touchStartX.current = null;
  };

  return (
    <Box onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <Typography variant="caption" color="text.secondary" mb={1.5} textAlign="center" display="block">
        Tap to choose · or swipe ← A | B →
      </Typography>
      <Box display="flex" flexDirection="column" gap={1.5}>
        {options.map((option, index) => {
          const optionValue = option.value ?? option.id ?? index;
          const isSelected = value === optionValue;

          return (
            <Paper
              key={index}
              elevation={isSelected ? 4 : 0}
              onClick={() => onChange(optionValue)}
              sx={{
                p: 2,
                borderRadius: 3,
                cursor: 'pointer',
                border: `2px solid ${isSelected ? color : 'transparent'}`,
                bgcolor: isSelected ? alpha(color, 0.06) : 'grey.50',
                transition: 'all 0.2s ease',
                '&:active': { transform: 'scale(0.98)' },
              }}
            >
              <Box display="flex" alignItems="center" gap={1.5}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: isSelected ? color : alpha(color, 0.1),
                    color: isSelected ? 'white' : color,
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                  }}
                >
                  {String.fromCharCode(65 + index)}
                </Box>
                <Typography
                  variant="body2"
                  fontWeight={isSelected ? 'bold' : 'normal'}
                  sx={{ lineHeight: 1.5 }}
                >
                  {option.text || option.label}
                </Typography>
              </Box>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
};

// ─── Rich Result Display ──────────────────────────────────────────────────────
const ResultDisplay = ({ type, result, meta, navigate }) => {
  const theme = useTheme();
  const rawScore = result?.assessment?.score || result?.score || {};
  // Defensive: Prisma JSON fields may arrive as stringified JSON
  const score = typeof rawScore === 'string' ? (() => { try { return JSON.parse(rawScore); } catch { return {}; } })() : (rawScore || {});
  const interpretation = result?.assessment?.interpretation || result?.interpretation;
  const actionSteps = result?.assessment?.actionSteps || result?.actionSteps || [];
  const strengths = result?.assessment?.strengths || result?.strengths || [];
  const growthEdges = result?.assessment?.growthEdges || result?.growthEdges || [];
  const creatorReframe = result?.assessment?.creatorReframe || result?.creatorReframe;

  return (
    <Box maxWidth="md" mx="auto">
      {/* Success Header */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 3,
          borderRadius: 3,
          background: meta.gradient,
          color: 'white',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 160,
            height: 160,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.1)',
          }}
        />
        <Typography variant="h1" sx={{ mb: 1 }}>
          {meta.icon}
        </Typography>
        <CheckIcon sx={{ fontSize: 48, mb: 1, opacity: 0.9 }} />
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Assessment Complete!
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9, maxWidth: 500, mx: 'auto' }}>
          Your honest answers have painted a clearer picture of who you are.
          That takes courage. 🙏
        </Typography>
      </Paper>

      {/* Primary Result */}
      <Card sx={{ mb: 3, borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <StarIcon sx={{ color: meta.color }} />
            <Typography variant="h6" fontWeight="bold">
              Your Result
            </Typography>
          </Box>

          {/* Type-specific primary result */}
          <Box
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: alpha(meta.color, 0.06),
              border: `1px solid ${alpha(meta.color, 0.15)}`,
              textAlign: 'center',
              mb: 2,
            }}
          >
            <Typography variant="h4" fontWeight="bold" color={meta.color} gutterBottom sx={{ textTransform: 'capitalize' }}>
              {String(score.style || score.type || score.primaryLabel || score.primary || score.level || score.healthLevel || (Array.isArray(score.topTwoLabels) && score.topTwoLabels[0] ? String(score.topTwoLabels[0]) : null) || ((score.score ?? score.overall ?? score.overallHealth ?? score.overallScore) != null ? `${score.score ?? score.overall ?? score.overallHealth ?? score.overallScore}/100` : '—')).replace(/_/g, ' ')}
            </Typography>
            {score.description && (
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                {score.description}
              </Typography>
            )}
            {score.name && (
              <Typography variant="h6" color="text.secondary">
                {score.name}
              </Typography>
            )}
            {score.secondary && (
              <Typography variant="body2" color="text.secondary">
                Secondary: {String(score.secondaryLabel || score.secondary || '').replace(/_/g, ' ')}
              </Typography>
            )}
            {Array.isArray(score.topTwoLabels) && score.topTwoLabels.length > 1 && (
              <Typography variant="body2" color="text.secondary">
                Secondary need: {String(score.topTwoLabels[1] || '')}
              </Typography>
            )}
          </Box>

          {/* Subscores */}
          {(score.subscores || score.scores || score.domains || score.dimensions || score.areas || score.allNeeds || score.allStyles || score.allScores || score.ranking || score.horsemen) && (
            <Box mt={3}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Detailed Breakdown
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {(() => {
                // Use ranking array if available (love_language, human_needs, conflict_style, etc.)
                const rankingArray = score.ranking;
                if (rankingArray && Array.isArray(rankingArray)) {
                  return rankingArray.map((item, i) => {
                    const label = item?.label || item?.language || item?.need || item?.style || item?.category || 'Unknown';
                    const val = item?.percentage ?? item?.count ?? item?.score ?? null;
                    return (
                      <Box key={i} mb={1.5}>
                        <Box display="flex" justifyContent="space-between" mb={0.5}>
                          <Typography variant="body2" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                            {String(label || '').replace(/_/g, ' ')}
                          </Typography>
                          <Typography variant="body2" color={meta.color} fontWeight="bold">
                            {typeof val === 'number' ? `${Math.round(val)}%` : (val != null && typeof val !== 'object' ? String(val) : '—')}
                          </Typography>
                        </Box>
                        {typeof val === 'number' && (
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(val, 100)}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              bgcolor: alpha(meta.color, 0.1),
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 4,
                                bgcolor: meta.color,
                              },
                            }}
                          />
                        )}
                      </Box>
                    );
                  });
                }

                // For Gottman, show horsemen + strengths
                if (score.horsemen?.byType || score.strengths?.byType) {
                  const sections = [];
                  if (score.horsemen?.byType) {
                    sections.push({ title: '⚠️ Four Horsemen (lower is better)', data: score.horsemen.byType });
                  }
                  if (score.strengths?.byType) {
                    sections.push({ title: '💚 Relationship Strengths', data: score.strengths.byType });
                  }
                  return sections.map((section, si) => (
                    <Box key={si} mb={2}>
                      <Typography variant="caption" fontWeight="bold" gutterBottom display="block" sx={{ mb: 1 }}>
                        {section.title}
                      </Typography>
                      {Object.entries(section.data).map(([k, v]) => (
                        <Box key={k} mb={1.5}>
                          <Box display="flex" justifyContent="space-between" mb={0.5}>
                            <Typography variant="body2" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                              {k.replace(/_/g, ' ')}
                            </Typography>
                            <Typography variant="body2" color={meta.color} fontWeight="bold">
                              {typeof v === 'object' && v.percentage !== undefined ? `${Math.round(v.percentage)}%` : typeof v === 'number' ? `${Math.round(v)}%` : String(v)}
                            </Typography>
                          </Box>
                          {(typeof v === 'number' || (typeof v === 'object' && v.percentage !== undefined)) && (
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(typeof v === 'object' ? v.percentage : v, 100)}
                              sx={{
                                height: 8,
                                borderRadius: 4,
                                bgcolor: alpha(meta.color, 0.1),
                                '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: meta.color },
                              }}
                            />
                          )}
                        </Box>
                      ))}
                    </Box>
                  ));
                }

                // Generic: subscores/scores/dimensions/allStyles/allNeeds/allScores
                const data =
                  score.subscores ||
                  score.scores ||
                  score.domains ||
                  score.dimensions ||
                  score.allStyles ||
                  score.allNeeds ||
                  score.allScores;

                if (!data) return null;

                // Handle both object and array formats
                const entries = Array.isArray(data)
                  ? data.map((item) => typeof item === 'string' ? [item.replace(/_/g, ' '), null] : [item.name || item.label, item.score || item.percentage || item.value])
                  : data && typeof data === 'object'
                  ? Object.entries(data).map(([k, v]) => {
                      // Handle MBTI dimensions: {E: 60, I: 40, preference: 'E', clarity: 20, ...}
                      if (v && typeof v === 'object' && v.preference !== undefined) {
                        // Extract the two letter scores (e.g., E:60, I:40)
                        const letterKeys = Object.keys(v).filter(lk => lk.length === 1 && typeof v[lk] === 'number');
                        const dominant = v.preference || letterKeys[0] || '?';
                        const pct = letterKeys.length > 0 ? Math.max(...letterKeys.map(lk => v[lk] || 0)) : 0;
                        return [k + ' (' + String(dominant) + ')', pct];
                      }
                      // Handle objects with percentage (subscores, allNeeds, allStyles, etc.)
                      if (v && typeof v === 'object' && v.percentage !== undefined) {
                        return [v.label || k.replace(/_/g, ' '), v.percentage];
                      }
                      // Handle objects with count (love language allScores)
                      if (v && typeof v === 'object' && v.count !== undefined) {
                        return [v.label || k.replace(/_/g, ' '), v.percentage ?? v.count];
                      }
                      // Safety: never pass raw objects to React
                      if (v && typeof v === 'object') return [k.replace(/_/g, ' '), typeof v.percentage === 'number' ? v.percentage : typeof v.score === 'number' ? v.score : null];
                      return [k, v];
                    })
                  : [];

                const allEntries = entries;

                return allEntries.map(([key, val], i) => (
                  <Box key={i} mb={1.5}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography
                        variant="body2"
                        fontWeight="bold"
                        sx={{ textTransform: 'capitalize' }}
                      >
                        {String(key).replace(/_/g, ' ')}
                      </Typography>
                      <Typography variant="body2" color={meta.color} fontWeight="bold">
                        {typeof val === 'number' ? `${Math.round(val)}%` : (val != null && typeof val !== 'object' ? String(val) : '—')}
                      </Typography>
                    </Box>
                    {typeof val === 'number' && (
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(val, 100)}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: alpha(meta.color, 0.1),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                            bgcolor: meta.color,
                          },
                        }}
                      />
                    )}
                  </Box>
                ));
              })()}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Interpretation */}
      {interpretation && (
        <Card sx={{ mb: 3, borderRadius: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              {typeof interpretation === 'object' && interpretation.emoji && (
                <Typography variant="h5" component="span">{interpretation.emoji}</Typography>
              )}
              <LightbulbIcon sx={{ color: '#ff9800' }} />
              <Typography variant="h6" fontWeight="bold">
                {typeof interpretation === 'object' && interpretation.title 
                  ? interpretation.title 
                  : 'What This Means'}
              </Typography>
            </Box>
            
            {/* Handle both string and object interpretations */}
            {typeof interpretation === 'string' ? (
              <Typography variant="body1" sx={{ lineHeight: 1.8, color: 'text.secondary' }}>
                {interpretation}
              </Typography>
            ) : (
              <Box>
                {interpretation.description && (
                  <Typography variant="body1" sx={{ lineHeight: 1.8, color: 'text.secondary', mb: 2 }}>
                    {interpretation.description}
                  </Typography>
                )}
                {interpretation.deeperMeaning && (
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 2, 
                      mt: 2, 
                      borderRadius: 2, 
                      bgcolor: alpha(meta.color, 0.04),
                      borderLeft: `3px solid ${meta.color}`
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      💡 Deeper Insight
                    </Typography>
                    <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'text.secondary' }}>
                      {interpretation.deeperMeaning}
                    </Typography>
                  </Paper>
                )}
                {interpretation.dailyPractice && (
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 2, 
                      mt: 2, 
                      borderRadius: 2, 
                      bgcolor: alpha('#4caf50', 0.04),
                      borderLeft: '3px solid #4caf50'
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      🌱 Daily Practice
                    </Typography>
                    <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'text.secondary' }}>
                      {interpretation.dailyPractice}
                    </Typography>
                  </Paper>
                )}
                {interpretation.connectedFrameworks && interpretation.connectedFrameworks.length > 0 && (
                  <Box mt={2}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      🔗 Related Frameworks
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {interpretation.connectedFrameworks.map((framework, i) => (
                        <Chip 
                          key={i} 
                          label={framework} 
                          size="small" 
                          sx={{ bgcolor: alpha(meta.color, 0.1), color: meta.color }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
                {/* Primary interpretation (love language, human needs, etc.) */}
                {interpretation.primary && typeof interpretation.primary === 'object' && (interpretation.primary.description || interpretation.primary.whatItMeans) && (
                  <Paper elevation={0} sx={{ p: 2, mt: 2, borderRadius: 2, bgcolor: alpha(meta.color, 0.04), borderLeft: `3px solid ${meta.color}` }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      {interpretation.primary.emoji || '❤️'} {interpretation.primary.title || (interpretation.primary.name ? interpretation.primary.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Your Primary Result')}
                    </Typography>
                    {interpretation.primary.description && (
                      <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'text.secondary' }}>
                        {interpretation.primary.description}
                      </Typography>
                    )}
                    {interpretation.primary.whatItMeans && (
                      <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'text.secondary', mt: 1 }}>
                        <strong>What this means:</strong> {interpretation.primary.whatItMeans}
                      </Typography>
                    )}
                    {interpretation.primary.howToExpress && (
                      <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'text.secondary', mt: 1 }}>
                        <strong>How to express it:</strong> {interpretation.primary.howToExpress}
                      </Typography>
                    )}
                    {interpretation.primary.howToReceive && (
                      <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'text.secondary', mt: 1 }}>
                        <strong>How to receive it:</strong> {interpretation.primary.howToReceive}
                      </Typography>
                    )}
                  </Paper>
                )}
                {interpretation.secondary && typeof interpretation.secondary === 'object' && (interpretation.secondary.description || interpretation.secondary.whatItMeans) && (
                  <Paper elevation={0} sx={{ p: 2, mt: 1.5, borderRadius: 2, bgcolor: 'grey.50', borderLeft: '3px solid #9e9e9e' }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      {interpretation.secondary.emoji || '💜'} Secondary: {interpretation.secondary.title || (interpretation.secondary.name ? interpretation.secondary.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '')}
                    </Typography>
                    <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'text.secondary' }}>
                      {interpretation.secondary.description}
                    </Typography>
                  </Paper>
                )}
                {/* Overall insight / creator reframe */}
                {interpretation.overallInsight && (
                  <Paper elevation={0} sx={{ p: 2, mt: 2, borderRadius: 2, bgcolor: alpha('#ff9800', 0.04), borderLeft: '3px solid #ff9800' }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      🧠 Key Insight
                    </Typography>
                    <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'text.secondary' }}>
                      {interpretation.overallInsight}
                    </Typography>
                  </Paper>
                )}
                {interpretation.creatorReframe && (
                  <Paper elevation={0} sx={{ p: 2, mt: 1.5, borderRadius: 2, bgcolor: alpha('#f5576c', 0.04), borderLeft: '3px solid #f5576c' }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                      ⚔️ The Creator Mindset
                    </Typography>
                    <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'text.secondary', fontStyle: 'italic' }}>
                      {interpretation.creatorReframe}
                    </Typography>
                  </Paper>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Strengths & Growth Edges */}
      {(strengths.length > 0 || growthEdges.length > 0) && (
        <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={3} mb={3}>
          {strengths.length > 0 && (
            <Card sx={{ flex: 1, borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <FavoriteIcon sx={{ color: 'success.main' }} />
                  <Typography variant="h6" fontWeight="bold">
                    Your Strengths
                  </Typography>
                </Box>
                {strengths.map((s, i) => (
                  <Box
                    key={i}
                    display="flex"
                    alignItems="flex-start"
                    gap={1}
                    mb={1.5}
                  >
                    <Typography color="success.main" sx={{ mt: 0.2 }}>
                      ✓
                    </Typography>
                    <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                      {typeof s === 'string' ? s : (s?.text || s?.description || JSON.stringify(s))}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          )}
          {growthEdges.length > 0 && (
            <Card sx={{ flex: 1, borderRadius: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <TrendingUpIcon sx={{ color: '#ff9800' }} />
                  <Typography variant="h6" fontWeight="bold">
                    Growth Edges
                  </Typography>
                </Box>
                {growthEdges.map((g, i) => (
                  <Box
                    key={i}
                    display="flex"
                    alignItems="flex-start"
                    gap={1}
                    mb={1.5}
                  >
                    <Typography sx={{ color: '#ff9800', mt: 0.2 }}>🌱</Typography>
                    <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                      {typeof g === 'string' ? g : (g?.text || g?.description || JSON.stringify(g))}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Action Steps */}
      {actionSteps.length > 0 && (
        <Card sx={{ mb: 3, borderRadius: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <AutoAwesomeIcon sx={{ color: meta.color }} />
              <Typography variant="h6" fontWeight="bold">
                Your Next Steps
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Small, intentional actions that build on what you've just learned:
            </Typography>
            {actionSteps.map((step, i) => (
              <Box
                key={i}
                display="flex"
                alignItems="flex-start"
                gap={2}
                mb={2}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: alpha(meta.color, 0.04),
                  border: `1px solid ${alpha(meta.color, 0.1)}`,
                }}
              >
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    bgcolor: meta.color,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    flexShrink: 0,
                    mt: 0.2,
                  }}
                >
                  {i + 1}
                </Box>
                <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                  {typeof step === 'string' ? step : (step?.text || step?.description || JSON.stringify(step))}
                </Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Creator Reframe */}
      {creatorReframe && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 3,
            bgcolor: alpha('#ff9800', 0.06),
            borderLeft: '4px solid #ff9800',
          }}
        >
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <SelfImprovementIcon sx={{ color: '#ff9800' }} />
            <Typography variant="subtitle2" fontWeight="bold" color="#e65100">
              A Different Way to See This
            </Typography>
          </Box>
          <Typography
            variant="body2"
            sx={{ lineHeight: 1.8, color: 'text.secondary', fontStyle: 'italic' }}
          >
            "{typeof creatorReframe === 'string' ? creatorReframe : (creatorReframe?.text || creatorReframe?.description || JSON.stringify(creatorReframe))}"
          </Typography>
        </Paper>
      )}

      {/* Navigation Buttons */}
      <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap" mt={4} mb={2}>
        <Button
          variant="outlined"
          size="large"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/assessments')}
          sx={{ borderRadius: 2, px: 4 }}
        >
          Back to Assessments
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/matchup')}
          sx={{
            borderRadius: 2,
            px: 4,
            background: meta.gradient,
            fontWeight: 'bold',
          }}
        >
          View Matchup
        </Button>
      </Box>
    </Box>
  );
};

// ─── Main Quiz Component ──────────────────────────────────────────────────────
const AssessmentQuiz = () => {
  const { type } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuth();

  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Gamification state
  const [milestoneMsg, setMilestoneMsg] = useState(null);
  const [speedToast, setSpeedToast] = useState('');
  const [showXpAnimation, setShowXpAnimation] = useState(false);
  const answerTimerRef = useRef(Date.now());

  const meta = assessmentMeta[type] || {
    title: 'Assessment',
    icon: '📝',
    encouragement: 'Be honest — your answers are just for you.',
    scaleType: 'likert7',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#667eea',
    scaleLabels: {
      1: 'Strongly Disagree',
      2: 'Disagree',
      3: 'Slightly Disagree',
      4: 'Neutral',
      5: 'Slightly Agree',
      6: 'Agree',
      7: 'Strongly Agree',
    },
  };

  useEffect(() => {
    fetchQuestions();
    setCurrentIndex(0);
    setResponses({});
    setResult(null);
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const response = await assessmentsApi.getQuestions(type);
      setQuestions(response.data.questions);
    } catch (err) {
      setError('Failed to load questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = useCallback(
    (value) => {
      const questionId = questions[currentIndex]?.id;
      hapticLight();
      
      // Speed bonus check
      const elapsed = Date.now() - answerTimerRef.current;
      if (elapsed < 3000) {
        setSpeedToast('Answering with conviction! ⚡');
      }
      
      setResponses((prev) => ({
        ...prev,
        [questionId]: value,
      }));

      // Auto-advance after short delay (not on last question)
      if (currentIndex < questions.length - 1) {
        setTimeout(() => {
          setCurrentIndex((prev) => {
            if (prev < questions.length - 1) {
              const nextIdx = prev + 1;
              answerTimerRef.current = Date.now();
              const pct = Math.round((nextIdx / questions.length) * 100);
              if (pct === 25) setMilestoneMsg({ text: 'Great start! Keep going! 💪' });
              else if (pct === 50) setMilestoneMsg({ text: 'Halfway there! 🔥' });
              else if (pct === 75) setMilestoneMsg({ text: 'Almost done! You got this! 🚀' });
              if ([25, 50, 75].includes(pct)) {
                hapticMedium();
                setTimeout(() => setMilestoneMsg(null), 3000);
              }
              return nextIdx;
            }
            return prev;
          });
        }, 400);
      }
    },
    [questions, currentIndex]
  );

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      answerTimerRef.current = Date.now();
      
      // Milestone messages
      const pct = Math.round((nextIdx / questions.length) * 100);
      if (pct === 25) setMilestoneMsg({ text: 'Great start! Keep going! 💪' });
      else if (pct === 50) setMilestoneMsg({ text: 'Halfway there! 🔥' });
      else if (pct === 75) setMilestoneMsg({ text: 'Almost done! You got this! 🚀' });
      else setMilestoneMsg(null);
      
      if ([25, 50, 75].includes(pct)) {
        hapticMedium();
        setTimeout(() => setMilestoneMsg(null), 3000);
      }
    }
  }, [currentIndex, questions.length]);

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (result) return;

      // Number keys for Likert scale
      if (meta.scaleType === 'likert7' || meta.scaleType === 'likert5') {
        const num = parseInt(e.key);
        const max = meta.scaleType === 'likert7' ? 7 : 5;
        if (num >= 1 && num <= max) {
          handleResponse(num);
          return;
        }
      }

      // Arrow keys for navigation
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (responses[questions[currentIndex]?.id] !== undefined) {
          handleNext();
        }
      }
      if (e.key === 'ArrowLeft') {
        handleBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [result, meta.scaleType, currentIndex, questions, responses, handleResponse, handleNext, handleBack]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      const response = await assessmentsApi.submit(type, responses);
      setResult(response.data);
      
      // 🎉 Confetti explosion + haptic on completion
      hapticSuccess();
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      setTimeout(() => confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } }), 300);
      
      // +50 XP floating animation
      setShowXpAnimation(true);
      setTimeout(() => setShowXpAnimation(false), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const answeredCount = Object.keys(responses).length;
  const currentQuestion = questions[currentIndex];
  const currentResponse = currentQuestion ? responses[currentQuestion.id] : undefined;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  // Encouragement message based on progress
  const encouragementIndex = Math.floor(
    (currentIndex / Math.max(questions.length - 1, 1)) * (progressEncouragements.length - 1)
  );
  const encouragement = progressEncouragements[encouragementIndex];

  // Determine if forced choice
  const isForcedChoice =
    meta.scaleType === 'forced_choice' ||
    currentQuestion?.type === 'forced_choice' ||
    (currentQuestion?.options && currentQuestion.options.length > 0) ||
    (currentQuestion?.choices && currentQuestion.choices.length > 0);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress sx={{ color: meta.color }} />
      </Box>
    );
  }

  // ─── Result View ────────────────────────────────────────────────────────────
  if (result) {
    return (
      <Box position="relative">
        {/* +50 XP floating animation */}
        {showXpAnimation && (
          <Box
            sx={{
              position: 'fixed',
              top: '40%',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              animation: 'xpFloat 2.5s ease-out forwards',
              '@keyframes xpFloat': {
                '0%': { opacity: 1, transform: 'translateX(-50%) translateY(0) scale(1)' },
                '50%': { opacity: 1, transform: 'translateX(-50%) translateY(-60px) scale(1.2)' },
                '100%': { opacity: 0, transform: 'translateX(-50%) translateY(-120px) scale(0.8)' },
              },
            }}
          >
            <Typography
              variant="h3"
              fontWeight="bold"
              sx={{
                color: '#FFD700',
                textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                fontSize: '2.5rem',
              }}
            >
              +50 XP ⭐
            </Typography>
          </Box>
        )}
        <ResultDisplay type={type} result={result} meta={meta} navigate={navigate} />
      </Box>
    );
  }

  // Mobile-first layout with thumb zone optimization
  return (
    <Box 
      maxWidth="md" 
      mx="auto"
      sx={{
        // On mobile, flex column but no forced height — content flows naturally
        ...(isSmallMobile && {
          display: 'flex',
          flexDirection: 'column',
        }),
      }}
    >
      {/* FIXED PROGRESS BAR - Always visible at top on mobile */}
      {isSmallMobile && <Box sx={{ height: 56 }} />}
      <Box
        sx={{
          ...(isSmallMobile && {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1100,
            bgcolor: 'background.paper',
            pt: 1,
            pb: 1.5,
            px: 2,
            borderBottom: `1px solid ${alpha(meta.color, 0.1)}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }),
        }}
      >
        {/* Compact progress on mobile */}
        <Box display="flex" alignItems="center" gap={1.5} mb={0.5}>
          <Typography 
            variant={isSmallMobile ? "body2" : "h3"} 
            component="span"
            sx={{ fontSize: isSmallMobile ? '1.2rem' : undefined }}
          >
            {meta.icon}
          </Typography>
          <Box flex={1}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" fontWeight="bold" color={meta.color}>
                {currentIndex + 1} / {questions.length}
              </Typography>
              <Typography variant="body2" fontWeight="bold" color={meta.color}>
                {Math.round(progress)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                mt: 0.5,
                bgcolor: alpha(meta.color, 0.1),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  bgcolor: meta.color,
                  transition: 'transform 0.3s ease',
                },
              }}
            />
          </Box>
        </Box>

        {/* Back button - compact on mobile */}
        {!isSmallMobile && (
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/assessments')}
            size="small"
            sx={{ mt: 1, color: 'text.secondary' }}
          >
            Back
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ my: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* MILESTONE MESSAGE */}
      <Slide direction="down" in={!!milestoneMsg} mountOnEnter unmountOnExit>
        <Box sx={{
          textAlign: 'center', py: 1.5, px: 2, mb: 1,
          borderRadius: 2, bgcolor: alpha(meta.color, 0.1),
          border: `1px solid ${alpha(meta.color, 0.3)}`,
        }}>
          <Typography variant="h6" fontWeight="bold" color={meta.color}>
            {milestoneMsg?.text}
          </Typography>
        </Box>
      </Slide>

      {/* SPEED TOAST */}
      <Snackbar
        open={!!speedToast}
        autoHideDuration={2000}
        onClose={() => setSpeedToast('')}
        message={speedToast}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />

      {/* QUESTION SECTION - Compact, no wasted space */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          py: isSmallMobile ? 1.5 : 3,
        }}
      >
        <Fade in key={currentIndex}>
          <Box>
            {/* Question Number Badge */}
            <Box
              sx={{
                width: isSmallMobile ? 32 : 36,
                height: isSmallMobile ? 32 : 36,
                borderRadius: '50%',
                bgcolor: meta.color,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: isSmallMobile ? '0.8rem' : '0.9rem',
                mb: 1.5,
              }}
            >
              {currentIndex + 1}
            </Box>

            {/* Question Text - LARGER on mobile */}
            <Typography
              sx={{ 
                mb: isSmallMobile ? 2 : 3, 
                lineHeight: 1.5, 
                fontWeight: 500,
                fontSize: isSmallMobile ? '1.15rem' : '1.25rem',
              }}
            >
              {currentQuestion?.text}
            </Typography>
          </Box>
        </Fade>
      </Box>

      {/* ANSWER SECTION - Pinned to bottom thumb zone on mobile */}
      <Box
        sx={{
          ...(isSmallMobile && {
            position: 'sticky',
            bottom: 0,
            bgcolor: 'background.paper',
            pt: 2,
            pb: 2,
            mx: -2,
            px: 2,
            borderTop: `1px solid ${alpha(meta.color, 0.1)}`,
            boxShadow: '0 -4px 12px rgba(0,0,0,0.05)',
          }),
        }}
      >
        {/* Answer Input */}
        {isForcedChoice ? (
          <ForcedChoice
            question={currentQuestion}
            value={currentResponse}
            onChange={handleResponse}
            color={meta.color}
          />
        ) : (
          <LikertScale
            value={currentResponse}
            onChange={handleResponse}
            labels={meta.scaleLabels}
            color={meta.color}
          />
        )}

        {/* Keyboard hint (desktop only) */}
        {!isMobile && !isForcedChoice && (
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ mt: 2, display: 'block', textAlign: 'center' }}
          >
            💡 Press 1-7 to answer, → to advance
          </Typography>
        )}

        {/* Navigation Buttons - Inline with answers on mobile */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mt={2}
          gap={2}
        >
          <Button
            variant="outlined"
            onClick={handleBack}
            disabled={currentIndex === 0}
            sx={{
              borderRadius: 2,
              borderColor: alpha(meta.color, 0.3),
              color: meta.color,
              minWidth: isSmallMobile ? 60 : 100,
              minHeight: 44,
              fontSize: isSmallMobile ? '0.85rem' : '0.875rem',
              '&:hover': {
                borderColor: meta.color,
                bgcolor: alpha(meta.color, 0.04),
              },
            }}
          >
            {isSmallMobile ? '←' : '← Back'}
          </Button>

          {currentIndex < questions.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={currentResponse === undefined}
              sx={{
                borderRadius: 2,
                minHeight: 44,
                minWidth: isSmallMobile ? 80 : 120,
                fontWeight: 'bold',
                fontSize: isSmallMobile ? '0.85rem' : '0.875rem',
                bgcolor: meta.color,
                '&:hover': {
                  bgcolor: meta.color,
                  filter: 'brightness(0.9)',
                },
                '&:disabled': {
                  bgcolor: 'grey.300',
                  color: 'grey.500',
                },
              }}
            >
              {isSmallMobile ? '→' : 'Next →'}
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              sx={{
                borderRadius: 2,
                minHeight: 44,
                flex: 1,
                maxWidth: 200,
                fontWeight: 'bold',
                fontSize: isSmallMobile ? '0.85rem' : '0.875rem',
              }}
            >
              {submitting ? (
                <Box display="flex" alignItems="center" gap={1}>
                  <CircularProgress size={18} color="inherit" />
                  <span>{isSmallMobile ? '...' : 'Analyzing...'}</span>
                </Box>
              ) : (
                isSmallMobile ? 'Done ✨' : 'Complete ✨'
              )}
            </Button>
          )}
        </Box>
      </Box>

      {/* Question dots / mini-map (desktop only, for assessments ≤ 40 questions) */}
      {!isMobile && questions.length <= 40 && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: 'grey.50',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Question Map
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={0.75}>
            {questions.map((q, index) => {
              const answered = responses[q.id] !== undefined;
              const isCurrent = index === currentIndex;

              return (
                <Tooltip key={index} title={`Question ${index + 1}${answered ? ' ✓' : ''}`}>
                  <Box
                    onClick={() => setCurrentIndex(index)}
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.6rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      bgcolor: isCurrent
                        ? meta.color
                        : answered
                        ? alpha(meta.color, 0.2)
                        : 'grey.200',
                      color: isCurrent ? 'white' : answered ? meta.color : 'grey.500',
                      border: isCurrent ? `2px solid ${meta.color}` : '2px solid transparent',
                      '&:hover': {
                        bgcolor: isCurrent ? meta.color : alpha(meta.color, 0.15),
                        transform: 'scale(1.2)',
                      },
                    }}
                  >
                    {answered ? '✓' : index + 1}
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default AssessmentQuiz;
