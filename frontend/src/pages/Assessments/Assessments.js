import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  CircularProgress,
  Chip,
  LinearProgress,
  Divider,
  Collapse,
  IconButton,
  Paper,
  Fade,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ReplayIcon from '@mui/icons-material/Replay';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import StarIcon from '@mui/icons-material/Star';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SchoolIcon from '@mui/icons-material/School';
import { assessmentsApi } from '../../services/api';

// ─── Assessment Type Definitions ──────────────────────────────────────────────
const assessmentTypes = [
  {
    type: 'attachment',
    title: 'Attachment Style',
    description:
      'Understand YOUR emotional bonding patterns — how you connect, what triggers you, and where your security comes from.',
    questions: 30,
    duration: '10 min',
    icon: '❤️',
    expert: 'Based on "Attached" by Dr. Amir Levine',
    category: 'Know Yourself',
  },
  {
    type: 'personality',
    title: 'Personality Type',
    description:
      'Discover YOUR cognitive wiring — how you process information, make decisions, and engage with the world.',
    questions: 40,
    duration: '12 min',
    icon: '🧠',
    expert: 'Based on Myers-Briggs Type Indicator',
    category: 'Know Yourself',
  },
  {
    type: 'love_language',
    title: 'Love Language',
    description:
      'Identify how YOU naturally give and receive love — your emotional currency.',
    questions: 30,
    duration: '8 min',
    icon: '💝',
    expert: 'Based on Dr. Gary Chapman',
    category: 'Know Yourself',
  },
  {
    type: 'human_needs',
    title: 'Human Needs Profile',
    description:
      'Discover which of the 6 core human needs drive YOUR behavior in relationships.',
    questions: 36,
    duration: '10 min',
    icon: '⚡',
    expert: "Based on Tony Robbins' Human Needs Psychology",
    category: 'Know Yourself',
  },
  {
    type: 'gottman_checkup',
    title: 'Relationship Health Checkup',
    description:
      'Assess YOUR relationship behaviors — horsemen, bids, repair attempts, and connection patterns.',
    questions: 40,
    duration: '12 min',
    icon: '🏠',
    expert: "Based on Dr. John Gottman's Research",
    category: 'Own Yourself',
  },
  {
    type: 'emotional_intelligence',
    title: 'Emotional Intelligence',
    description:
      "Measure YOUR ability to recognize, understand, and manage emotions — yours and others'.",
    questions: 25,
    duration: '8 min',
    icon: '🎯',
    expert: "Based on Daniel Goleman's EQ Framework",
    category: 'Own Yourself',
  },
  {
    type: 'conflict_style',
    title: 'Conflict Resolution Style',
    description:
      'Discover YOUR default approach to conflict — and when it helps vs. hurts.',
    questions: 30,
    duration: '10 min',
    icon: '⚔️',
    expert: 'Based on Thomas-Kilmann Conflict Model',
    category: 'Grow Yourself',
  },
  {
    type: 'differentiation',
    title: 'Differentiation Level',
    description:
      'Assess YOUR emotional maturity — can you hold your position while staying connected?',
    questions: 20,
    duration: '7 min',
    icon: '🌱',
    expert: 'Based on Dr. Jennifer Finlayson-Fife & Murray Bowen',
    category: 'Grow Yourself',
  },
  {
    type: 'hormonal_health',
    title: 'Hormonal Wellness',
    description:
      'Screen for hormonal symptoms that silently impact your energy, mood, libido, and relationship. Not a diagnosis — a mirror for your body.',
    questions: 30,
    duration: '8 min',
    icon: '🧬',
    expert: 'Wellness screener — consult a healthcare provider for diagnosis',
    category: 'Fuel Yourself',
  },
  {
    type: 'physical_vitality',
    title: 'Physical Vitality',
    description:
      'Evaluate YOUR fitness, nutrition, sleep, energy, and body confidence. Your physical health IS your relationship health.',
    questions: 25,
    duration: '7 min',
    icon: '💪',
    expert: 'Based on exercise science, sleep research & nutritional psychology',
    category: 'Fuel Yourself',
  },
];

// ─── Category Metadata ────────────────────────────────────────────────────────
const categories = [
  {
    name: 'Know Yourself',
    icon: '🔍',
    tagline: 'Awareness is the first act of love.',
    description:
      'Before you can love someone well, you need to understand how YOU are wired. These assessments reveal your patterns — not to judge them, but to own them.',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#667eea',
  },
  {
    name: 'Own Yourself',
    icon: '💪',
    tagline: 'You can\'t give what you don\'t have.',
    description:
      'Now that you see your patterns, it\'s time to take responsibility for them. These assessments measure where you\'re strong and where you have room to grow.',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: '#f5576c',
  },
  {
    name: 'Grow Yourself',
    icon: '🌱',
    tagline: 'Growth is the price of admission to a great relationship.',
    description:
      'The most attractive thing you can do in a relationship is become a better version of yourself. These assessments show you the path forward.',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    color: '#00c9a7',
  },
  {
    name: 'Fuel Yourself',
    icon: '⚡',
    tagline: 'Your body is the vehicle for your love.',
    description:
      'You can\'t pour from an empty cup. These assessments examine the physiological foundations — hormones, fitness, sleep, nutrition, energy — that power everything you bring to your relationship. Optional but powerful.',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #e91e63 100%)',
    color: '#e91e63',
  },
];

// ─── Score Summary Renderers ──────────────────────────────────────────────────
const renderScoreSummary = (type, score) => {
  if (!score) return null;

  const renderers = {
    attachment: () => (
      <Box>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          {score.style} Attachment
        </Typography>
        {score.subscores && (
          <Box mt={1}>
            {Object.entries(score.subscores).map(([key, val]) => (
              <Box key={key} mb={0.5}>
                <Box display="flex" justifyContent="space-between" mb={0.25}>
                  <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                    {key.replace(/_/g, ' ')}
                  </Typography>
                  <Typography variant="caption" fontWeight="bold">
                    {typeof val === 'number' ? `${Math.round(val)}%` : val}
                  </Typography>
                </Box>
                {typeof val === 'number' && (
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(val, 100)}
                    sx={{ height: 4, borderRadius: 2 }}
                  />
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    ),
    personality: () => (
      <Box>
        <Typography variant="subtitle2" fontWeight="bold">
          Type: {score.type}
        </Typography>
        {score.name && (
          <Typography variant="caption" color="text.secondary">
            {score.name}
          </Typography>
        )}
        {score.dimensions && (
          <Box mt={1} display="flex" gap={0.5} flexWrap="wrap">
            {Object.entries(score.dimensions).map(([dim, val]) => (
              <Chip
                key={dim}
                label={`${dim}: ${typeof val === 'number' ? Math.round(val) + '%' : val}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            ))}
          </Box>
        )}
      </Box>
    ),
    love_language: () => (
      <Box>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          Primary: {score.primary || score.style}
        </Typography>
        {score.secondary && (
          <Typography variant="caption" color="text.secondary" display="block">
            Secondary: {score.secondary}
          </Typography>
        )}
        {score.rankings && (
          <Box mt={1}>
            {score.rankings.slice(0, 3).map((lang, i) => (
              <Box key={i} display="flex" justifyContent="space-between" mb={0.25}>
                <Typography variant="caption">{lang.name}</Typography>
                <Typography variant="caption" fontWeight="bold">
                  {lang.score}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    ),
    human_needs: () => (
      <Box>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          Top Need: {score.primary || score.topNeed}
        </Typography>
        {score.needs && (
          <Box mt={1}>
            {(Array.isArray(score.needs) ? score.needs : Object.entries(score.needs).map(([k, v]) => ({ name: k, score: v }))).slice(0, 4).map((need, i) => (
              <Box key={i} mb={0.5}>
                <Box display="flex" justifyContent="space-between" mb={0.25}>
                  <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                    {need.name?.replace(/_/g, ' ')}
                  </Typography>
                  <Typography variant="caption" fontWeight="bold">
                    {typeof need.score === 'number' ? `${Math.round(need.score)}%` : need.score}
                  </Typography>
                </Box>
                {typeof need.score === 'number' && (
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(need.score, 100)}
                    sx={{ height: 4, borderRadius: 2 }}
                  />
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    ),
    gottman_checkup: () => (
      <Box>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          Health Score: {score.overallScore || score.score}
          {score.level && ` — ${score.level}`}
        </Typography>
        {score.areas && (
          <Box mt={1} display="flex" gap={0.5} flexWrap="wrap">
            {Object.entries(score.areas).slice(0, 4).map(([area, val]) => (
              <Chip
                key={area}
                label={`${area.replace(/_/g, ' ')}: ${typeof val === 'number' ? Math.round(val) : val}`}
                size="small"
                variant="outlined"
                color={typeof val === 'number' && val >= 70 ? 'success' : typeof val === 'number' && val < 40 ? 'warning' : 'default'}
                sx={{ fontSize: '0.7rem', textTransform: 'capitalize' }}
              />
            ))}
          </Box>
        )}
      </Box>
    ),
    emotional_intelligence: () => (
      <Box>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          EQ Score: {score.overall || score.score}/100
        </Typography>
        {score.domains && (
          <Box mt={1}>
            {Object.entries(score.domains).slice(0, 4).map(([domain, val]) => (
              <Box key={domain} mb={0.5}>
                <Box display="flex" justifyContent="space-between" mb={0.25}>
                  <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                    {domain.replace(/_/g, ' ')}
                  </Typography>
                  <Typography variant="caption" fontWeight="bold">
                    {typeof val === 'number' ? `${Math.round(val)}%` : val}
                  </Typography>
                </Box>
                {typeof val === 'number' && (
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(val, 100)}
                    sx={{ height: 4, borderRadius: 2 }}
                  />
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    ),
    conflict_style: () => (
      <Box>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          Primary Style: {score.primary || score.style}
        </Typography>
        {score.secondary && (
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            Secondary: {score.secondary}
          </Typography>
        )}
        {score.styles && (
          <Box mt={1} display="flex" gap={0.5} flexWrap="wrap">
            {Object.entries(score.styles).map(([style, val]) => (
              <Chip
                key={style}
                label={`${style}: ${typeof val === 'number' ? Math.round(val) + '%' : val}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', textTransform: 'capitalize' }}
              />
            ))}
          </Box>
        )}
      </Box>
    ),
    differentiation: () => (
      <Box>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          Differentiation: {score.level || score.score}
          {score.percentage && ` (${Math.round(score.percentage)}%)`}
        </Typography>
        {score.dimensions && (
          <Box mt={1}>
            {Object.entries(score.dimensions).slice(0, 3).map(([dim, val]) => (
              <Box key={dim} mb={0.5}>
                <Box display="flex" justifyContent="space-between" mb={0.25}>
                  <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                    {dim.replace(/_/g, ' ')}
                  </Typography>
                  <Typography variant="caption" fontWeight="bold">
                    {typeof val === 'number' ? `${Math.round(val)}%` : val}
                  </Typography>
                </Box>
                {typeof val === 'number' && (
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(val, 100)}
                    sx={{ height: 4, borderRadius: 2 }}
                  />
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    ),
  };

  // Generic fallback
  const fallback = () => (
    <Box>
      <Typography variant="subtitle2" fontWeight="bold">
        {score.style || score.type || score.primary || score.level || `Score: ${score.score || score.overall || '—'}`}
      </Typography>
    </Box>
  );

  const renderer = renderers[type] || fallback;
  return renderer();
};

// ─── Category Section Component ───────────────────────────────────────────────
const CategorySection = ({
  category,
  assessments,
  completedTypes,
  getScore,
  navigate,
  expandedResults,
  toggleExpanded,
}) => {
  const theme = useTheme();
  const completedCount = assessments.filter((a) => completedTypes.has(a.type)).length;
  const totalCount = assessments.length;
  const progress = (completedCount / totalCount) * 100;
  const allDone = completedCount === totalCount;

  return (
    <Box mb={5}>
      {/* Category Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: category.gradient,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <Box
          sx={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -20,
            right: 60,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
          }}
        />

        <Box display="flex" alignItems="center" gap={1.5} mb={1} position="relative">
          <Typography variant="h4" component="span">
            {category.icon}
          </Typography>
          <Box flex={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h5" fontWeight="bold">
                {category.name}
              </Typography>
              {allDone && (
                <Chip
                  icon={<CheckCircleIcon sx={{ color: 'white !important' }} />}
                  label="Complete"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.25)',
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                />
              )}
            </Box>
            <Typography variant="body2" sx={{ opacity: 0.9, fontStyle: 'italic' }}>
              {category.tagline}
            </Typography>
          </Box>
        </Box>

        <Typography variant="body2" sx={{ opacity: 0.85, mb: 2, maxWidth: 600, position: 'relative' }}>
          {category.description}
        </Typography>

        {/* Progress Bar */}
        <Box position="relative">
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Progress
            </Typography>
            <Typography variant="caption" fontWeight="bold">
              {completedCount}/{totalCount} complete
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'rgba(255,255,255,0.2)',
              '& .MuiLinearProgress-bar': {
                bgcolor: 'white',
                borderRadius: 4,
              },
            }}
          />
        </Box>
      </Paper>

      {/* Assessment Cards Grid */}
      <Grid container spacing={3}>
        {assessments.map((assessment) => {
          const completed = completedTypes.has(assessment.type);
          const score = getScore(assessment.type);
          const isExpanded = expandedResults[assessment.type];

          return (
            <Grid item xs={12} sm={6} key={assessment.type}>
              <Fade in timeout={600}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    border: completed
                      ? `2px solid ${alpha(category.color, 0.4)}`
                      : '2px solid transparent',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: theme.shadows[8],
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    {/* Header: Icon + Status */}
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                      <Box
                        sx={{
                          width: 56,
                          height: 56,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '2rem',
                          bgcolor: alpha(category.color, 0.1),
                        }}
                      >
                        {assessment.icon}
                      </Box>
                      {completed && (
                        <Chip
                          icon={<CheckCircleIcon />}
                          label="Done"
                          color="success"
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      )}
                    </Box>

                    {/* Title */}
                    <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ lineHeight: 1.3 }}>
                      {assessment.title}
                    </Typography>

                    {/* Description */}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                      {assessment.description}
                    </Typography>

                    {/* Expert source */}
                    <Box display="flex" alignItems="center" gap={0.5} mb={2}>
                      <SchoolIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                        {assessment.expert}
                      </Typography>
                    </Box>

                    {/* Meta chips */}
                    <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                      <Chip
                        label={`${assessment.questions} questions`}
                        size="small"
                        variant="outlined"
                        sx={{ borderRadius: 1.5 }}
                      />
                      <Chip
                        label={assessment.duration}
                        size="small"
                        variant="outlined"
                        sx={{ borderRadius: 1.5 }}
                      />
                    </Box>

                    {/* Score Display */}
                    {completed && score && (
                      <Box mt={2}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: alpha(category.color, 0.06),
                            border: `1px solid ${alpha(category.color, 0.15)}`,
                          }}
                        >
                          <Box
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                            mb={isExpanded ? 1 : 0}
                          >
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <StarIcon sx={{ fontSize: 16, color: category.color }} />
                              <Typography variant="caption" fontWeight="bold" color={category.color}>
                                Your Result
                              </Typography>
                            </Box>
                            <Tooltip title={isExpanded ? 'Collapse' : 'Show details'}>
                              <IconButton
                                size="small"
                                aria-label={isExpanded ? 'Collapse details' : 'Show details'}
                                onClick={() => toggleExpanded(assessment.type)}
                              >
                                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                              </IconButton>
                            </Tooltip>
                          </Box>

                          {/* Always show the primary result line */}
                          {!isExpanded && (
                            <Typography variant="body2" fontWeight="bold">
                              {score.style || score.type || score.primary || score.level || `Score: ${score.score || score.overall || '—'}`}
                            </Typography>
                          )}

                          {/* Expanded: rich detail */}
                          <Collapse in={isExpanded}>
                            {renderScoreSummary(assessment.type, score)}
                          </Collapse>
                        </Box>
                      </Box>
                    )}
                  </CardContent>

                  <CardActions sx={{ p: 3, pt: 0 }}>
                    <Button
                      variant={completed ? 'outlined' : 'contained'}
                      startIcon={completed ? <ReplayIcon /> : <PlayArrowIcon />}
                      onClick={() => navigate(`/assessments/${assessment.type}`)}
                      fullWidth
                      sx={{
                        borderRadius: 2,
                        py: 1.2,
                        fontWeight: 'bold',
                        ...(completed
                          ? {}
                          : {
                              background: category.gradient,
                              '&:hover': { opacity: 0.9 },
                            }),
                      }}
                    >
                      {completed ? 'Retake Assessment' : 'Begin Assessment'}
                    </Button>
                  </CardActions>
                </Card>
              </Fade>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

// ─── Main Assessments Page Component ──────────────────────────────────────────
const Assessments = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState({ completed: [], pending: [] });
  const [expandedResults, setExpandedResults] = useState({});

  useEffect(() => {
    document.title = 'Assessments | Love Rescue';
    fetchResults();
  }, []); // Intentional: run once on mount

  const fetchResults = async () => {
    try {
      const response = await assessmentsApi.getResults();
      setResults(response.data);
    } catch {
      // Assessment results fetch failed — page will show empty state
    } finally {
      setLoading(false);
    }
  };

  const completedTypes = useMemo(
    () => new Set(results.completed.map((a) => a.type)),
    [results.completed]
  );

  const getScore = (type) => {
    const assessment = results.completed.find((a) => a.type === type);
    return assessment?.score;
  };

  const toggleExpanded = (type) => {
    setExpandedResults((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  // Group assessments by category
  const groupedAssessments = useMemo(() => {
    const groups = {};
    categories.forEach((cat) => {
      groups[cat.name] = assessmentTypes.filter((a) => a.category === cat.name);
    });
    return groups;
  }, []);

  // Overall progress
  const totalAssessments = assessmentTypes.length;
  const completedCount = results.completed.length;
  const overallProgress = (completedCount / totalAssessments) * 100;
  const allCompleted = completedCount === totalAssessments;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Page Header */}
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Self-Discovery Assessments
      </Typography>

      {/* Philosophy Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`,
          borderLeft: `4px solid ${theme.palette.primary.main}`,
        }}
      >
        <Box display="flex" alignItems="flex-start" gap={2}>
          <AutoAwesomeIcon sx={{ color: 'primary.main', mt: 0.3 }} />
          <Box>
            <Typography variant="h6" fontWeight="bold" gutterBottom color="primary.main">
              These assessments are mirrors, not weapons.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
              They reveal <strong>YOUR</strong> patterns so <strong>YOU</strong> can grow. 
              Every assessment here is about understanding yourself more deeply — not labeling your partner, 
              winning arguments, or proving who's "right." The path to a better relationship 
              always starts with the same step: honest self-awareness.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Overall Progress */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 3,
          bgcolor: 'background.paper',
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Your Journey
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {allCompleted
                ? 'Amazing! You\'ve completed all assessments. Your self-awareness is your superpower. 🎉'
                : `${completedCount} of ${totalAssessments} assessments complete — every one you finish brings clarity.`}
            </Typography>
          </Box>
          <Box
            sx={{
              position: 'relative',
              display: 'inline-flex',
            }}
          >
            <CircularProgress
              variant="determinate"
              value={overallProgress}
              size={72}
              thickness={5}
              sx={{ color: allCompleted ? 'success.main' : 'primary.main' }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="body2" fontWeight="bold" color="text.primary">
                {completedCount}/{totalAssessments}
              </Typography>
            </Box>
          </Box>
        </Box>
        <LinearProgress
          variant="determinate"
          value={overallProgress}
          sx={{
            height: 10,
            borderRadius: 5,
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            '& .MuiLinearProgress-bar': {
              borderRadius: 5,
              background: allCompleted
                ? 'linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)'
                : 'linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            },
          }}
        />
      </Paper>

      {/* Category Sections */}
      {categories.map((category) => (
        <CategorySection
          key={category.name}
          category={category}
          assessments={groupedAssessments[category.name]}
          completedTypes={completedTypes}
          getScore={getScore}
          navigate={navigate}
          expandedResults={expandedResults}
          toggleExpanded={toggleExpanded}
        />
      ))}

      {/* All Complete CTA */}
      {allCompleted && (
        <Fade in>
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 3,
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              color: 'white',
              mt: 2,
            }}
          >
            <Typography variant="h4" component="span" sx={{ mr: 1 }}>
              🎉
            </Typography>
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              All Assessments Complete!
            </Typography>
            <Typography variant="body1" sx={{ mb: 3, opacity: 0.95 }}>
              You now have a rich self-portrait. Use it to understand — not to judge. 
              Your unified profile is ready.
            </Typography>
            <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/matchup')}
                sx={{
                  bgcolor: 'white',
                  color: '#00c9a7',
                  fontWeight: 'bold',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
                }}
              >
                View Matchup Score
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/strategies')}
                sx={{
                  borderColor: 'white',
                  color: 'white',
                  fontWeight: 'bold',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
                }}
              >
                View Your Strategies
              </Button>
            </Box>
          </Paper>
        </Fade>
      )}
    </Box>
  );
};

export default Assessments;
