import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Divider,
  useMediaQuery,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
} from '@mui/material';
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
    // Vertical list on mobile
    return (
      <RadioGroup value={value || ''} onChange={(e) => onChange(parseInt(e.target.value))}>
        {options.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={
              <Radio
                sx={{
                  color: alpha(color, 0.5),
                  '&.Mui-checked': { color },
                }}
              />
            }
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <Typography
                  variant="caption"
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: value === option.value ? color : alpha(color, 0.1),
                    color: value === option.value ? 'white' : 'text.secondary',
                    fontWeight: 'bold',
                    fontSize: '0.7rem',
                  }}
                >
                  {option.value}
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={value === option.value ? 'bold' : 'normal'}
                >
                  {option.label}
                </Typography>
              </Box>
            }
            sx={{
              py: 1,
              px: 2,
              my: 0.5,
              borderRadius: 2,
              border: `2px solid ${value === option.value ? color : 'transparent'}`,
              bgcolor: value === option.value ? alpha(color, 0.06) : 'transparent',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: alpha(color, 0.04),
              },
            }}
          />
        ))}
      </RadioGroup>
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
  const options = question.options || question.choices || [];

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" mb={2} textAlign="center">
        Choose the statement that feels MORE true for you:
      </Typography>
      <Box display="flex" flexDirection="column" gap={2}>
        {options.map((option, index) => {
          const optionValue = option.value ?? option.id ?? index;
          const isSelected = value === optionValue;

          return (
            <Paper
              key={index}
              elevation={isSelected ? 4 : 0}
              onClick={() => onChange(optionValue)}
              sx={{
                p: 3,
                borderRadius: 3,
                cursor: 'pointer',
                border: `2px solid ${isSelected ? color : 'transparent'}`,
                bgcolor: isSelected ? alpha(color, 0.06) : 'grey.50',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: isSelected ? alpha(color, 0.08) : 'grey.100',
                  transform: 'translateX(4px)',
                },
              }}
            >
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: isSelected ? color : alpha(color, 0.1),
                    color: isSelected ? 'white' : color,
                    fontWeight: 'bold',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                  }}
                >
                  {String.fromCharCode(65 + index)}
                </Box>
                <Typography
                  variant="body1"
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
  const score = result?.assessment?.score || result?.score || {};
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
            <Typography variant="h4" fontWeight="bold" color={meta.color} gutterBottom>
              {score.style || score.type || score.primary || score.level || `${score.score || score.overall || '—'}/100`}
            </Typography>
            {score.name && (
              <Typography variant="h6" color="text.secondary">
                {score.name}
              </Typography>
            )}
            {score.secondary && (
              <Typography variant="body2" color="text.secondary">
                Secondary: {score.secondary}
              </Typography>
            )}
          </Box>

          {/* Subscores */}
          {(score.subscores || score.domains || score.dimensions || score.areas || score.needs || score.styles || score.rankings) && (
            <Box mt={3}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Detailed Breakdown
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {(() => {
                const data =
                  score.subscores ||
                  score.domains ||
                  score.dimensions ||
                  score.areas ||
                  score.styles ||
                  score.needs;

                // Handle both object and array formats
                const entries = Array.isArray(data)
                  ? data.map((item) => [item.name || item.label, item.score || item.value])
                  : data && typeof data === 'object'
                  ? Object.entries(data)
                  : [];

                // Handle rankings (love language)
                const rankings = score.rankings;
                const allEntries = rankings
                  ? rankings.map((r) => [r.name, r.score])
                  : entries;

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
                        {typeof val === 'number' ? `${Math.round(val)}%` : val}
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
              <LightbulbIcon sx={{ color: '#ff9800' }} />
              <Typography variant="h6" fontWeight="bold">
                What This Means
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ lineHeight: 1.8, color: 'text.secondary' }}>
              {interpretation}
            </Typography>
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
                      {s}
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
                      {g}
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
                  {step}
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
            "{creatorReframe}"
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
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

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
      setResponses((prev) => ({
        ...prev,
        [questionId]: value,
      }));
    },
    [questions, currentIndex]
  );

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
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
    return <ResultDisplay type={type} result={result} meta={meta} navigate={navigate} />;
  }

  return (
    <Box maxWidth="md" mx="auto">
      {/* Back Button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/assessments')}
        sx={{ mb: 2, color: 'text.secondary' }}
      >
        Back to Assessments
      </Button>

      {/* Title */}
      <Box display="flex" alignItems="center" gap={1.5} mb={1}>
        <Typography variant="h3" component="span">
          {meta.icon}
        </Typography>
        <Typography variant="h5" fontWeight="bold">
          {meta.title}
        </Typography>
      </Box>

      {/* Encouragement */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontStyle: 'italic' }}>
        {meta.encouragement}
      </Typography>

      {/* Progress Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          bgcolor: alpha(meta.color, 0.04),
          border: `1px solid ${alpha(meta.color, 0.1)}`,
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="body2" fontWeight="bold">
            Question {currentIndex + 1} of {questions.length}
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              label={`${answeredCount} answered`}
              size="small"
              sx={{
                bgcolor: alpha(meta.color, 0.1),
                color: meta.color,
                fontWeight: 'bold',
              }}
            />
            <Typography variant="body2" fontWeight="bold" color={meta.color}>
              {Math.round(progress)}%
            </Typography>
          </Box>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 10,
            borderRadius: 5,
            bgcolor: alpha(meta.color, 0.1),
            '& .MuiLinearProgress-bar': {
              borderRadius: 5,
              bgcolor: meta.color,
              transition: 'transform 0.4s ease',
            },
          }}
        />
        {/* Mini encouragement */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 1, display: 'block', textAlign: 'center' }}
        >
          {encouragement}
        </Typography>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Question Card */}
      <Fade in key={currentIndex}>
        <Card
          sx={{
            borderRadius: 3,
            border: `1px solid ${alpha(meta.color, 0.1)}`,
            overflow: 'visible',
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            {/* Question Number Badge */}
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                bgcolor: meta.color,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                mb: 2,
              }}
            >
              {currentIndex + 1}
            </Box>

            {/* Question Text */}
            <Typography
              variant="h6"
              sx={{ mb: 3, lineHeight: 1.5, fontWeight: 500 }}
            >
              {currentQuestion?.text}
            </Typography>

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
          </CardContent>
        </Card>
      </Fade>

      {/* Navigation */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mt={3}
        mb={4}
      >
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          disabled={currentIndex === 0}
          sx={{
            borderRadius: 2,
            borderColor: alpha(meta.color, 0.3),
            color: meta.color,
            minHeight: { xs: 48, md: 'auto' },
            '&:hover': {
              borderColor: meta.color,
              bgcolor: alpha(meta.color, 0.04),
            },
          }}
        >
          Back
        </Button>

        {currentIndex < questions.length - 1 ? (
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={handleNext}
            disabled={currentResponse === undefined}
            sx={{
              borderRadius: 2,
              minHeight: { xs: 48, md: 'auto' },
              background: meta.gradient,
              fontWeight: 'bold',
              px: 4,
              '&:hover': { opacity: 0.9 },
              '&.Mui-disabled': {
                background: 'none',
              },
            }}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            sx={{
              borderRadius: 2,
              minHeight: { xs: 48, md: 'auto' },
              fontWeight: 'bold',
              px: 4,
            }}
          >
            {submitting ? (
              <Box display="flex" alignItems="center" gap={1}>
                <CircularProgress size={20} color="inherit" />
                <span>Analyzing...</span>
              </Box>
            ) : (
              'Complete Assessment ✨'
            )}
          </Button>
        )}
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
