import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  LinearProgress,
  Chip,
  IconButton,
  Collapse,
  Alert,
  Divider,
} from '@mui/material';
import {
  Lock as LockIcon,
  CheckCircle as CheckIcon,
  PlayArrow as PlayIcon,
  ExpandMore as ExpandMoreIcon,
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { courseApi } from '../../services/api';

// Phase colors
const PHASE_COLORS = {
  1: { bg: '#e3f2fd', border: '#1976d2', text: '#1565c0' }, // Foundation - Blue
  2: { bg: '#e8f5e9', border: '#388e3c', text: '#2e7d32' }, // Communication - Green
  3: { bg: '#fff3e0', border: '#f57c00', text: '#e65100' }, // Emotional Depth - Orange
  4: { bg: '#fce4ec', border: '#c2185b', text: '#ad1457' }, // Intimacy - Pink
  5: { bg: '#f3e5f5', border: '#7b1fa2', text: '#6a1b9a' }, // Integration - Purple
};

const Journey = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [curriculum, setCurriculum] = useState([]);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [expandedPhase, setExpandedPhase] = useState(null);

  useEffect(() => {
    document.title = '16-Week Journey | Love Rescue';
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [curriculumRes, progressRes] = await Promise.all([
        courseApi.getCurriculum(),
        courseApi.getProgress(),
      ]);
      setCurriculum(curriculumRes.data.weeks || []);
      setProgress(progressRes.data);
      
      // Auto-expand current phase
      if (progressRes.data?.currentWeekData?.phaseName) {
        const currentPhase = curriculumRes.data.weeks?.find(
          w => w.week === progressRes.data.currentWeek
        )?.phase;
        setExpandedPhase(currentPhase);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCourse = async () => {
    try {
      await courseApi.startCourse();
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start course');
    }
  };

  const isWeekCompleted = (weekNum) => {
    return progress?.completedWeeks?.includes(weekNum);
  };

  const isWeekCurrent = (weekNum) => {
    return progress?.currentWeek === weekNum;
  };

  const isWeekLocked = (weekNum) => {
    return weekNum > (progress?.currentWeek || 0);
  };

  // Group weeks by phase
  const phases = curriculum.reduce((acc, week) => {
    if (!acc[week.phase]) {
      acc[week.phase] = {
        phase: week.phase,
        name: week.phaseName,
        weeks: [],
      };
    }
    acc[week.phase].weeks.push(week);
    return acc;
  }, {});

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      {/* Header */}
      <Box textAlign="center" mb={4}>
        <SchoolIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Your 16-Week Journey
        </Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 500, mx: 'auto' }}>
          Master the principles from 11 world-class relationship experts. 
          Each week builds on the last.
        </Typography>
      </Box>

      {/* Progress Overview */}
      {progress && (
        <Card sx={{ mb: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <CardContent sx={{ color: 'white' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box>
                <Typography variant="overline" sx={{ opacity: 0.9 }}>
                  Current Week
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  Week {progress.currentWeek}: {progress.currentWeekData?.title}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                  {progress.currentWeekData?.expert}
                </Typography>
              </Box>
              <Box textAlign="right">
                <Typography variant="h3" fontWeight="bold">
                  {progress.progressPercent}%
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Complete
                </Typography>
              </Box>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={progress.progressPercent} 
              sx={{ 
                height: 8, 
                borderRadius: 4,
                backgroundColor: 'rgba(255,255,255,0.3)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: 'white',
                  borderRadius: 4,
                }
              }}
            />
            <Box display="flex" justifyContent="space-between" mt={1}>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {progress.completedWeeks?.length || 0} weeks completed
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {16 - (progress.completedWeeks?.length || 0)} weeks remaining
              </Typography>
            </Box>
            
            <Button
              variant="contained"
              fullWidth
              sx={{ 
                mt: 2, 
                bgcolor: 'white', 
                color: 'primary.main',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
              }}
              onClick={() => navigate('/course/week')}
            >
              Continue This Week's Focus
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Start Course CTA (if not started) */}
      {!progress?.isActive && !progress?.completedAt && (
        <Card sx={{ mb: 4, border: '2px dashed', borderColor: 'primary.main' }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <TrendingUpIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Ready to Transform Your Relationship?
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
              Start your 16-week journey with personalized strategies based on your assessments.
            </Typography>
            <Button 
              variant="contained" 
              size="large"
              onClick={handleStartCourse}
              startIcon={<PlayIcon />}
            >
              Start Your Journey
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Phase Sections */}
      {Object.values(phases).map((phase) => {
        const colors = PHASE_COLORS[phase.phase];
        const isExpanded = expandedPhase === phase.phase;
        const phaseProgress = phase.weeks.filter(w => isWeekCompleted(w.week)).length;
        const hasCurrentWeek = phase.weeks.some(w => isWeekCurrent(w.week));

        return (
          <Card 
            key={phase.phase} 
            sx={{ 
              mb: 2, 
              border: hasCurrentWeek ? `2px solid ${colors.border}` : '1px solid',
              borderColor: hasCurrentWeek ? colors.border : 'divider',
            }}
          >
            <CardContent 
              sx={{ 
                cursor: 'pointer',
                bgcolor: isExpanded ? colors.bg : 'transparent',
                transition: 'background-color 0.2s',
              }}
              onClick={() => setExpandedPhase(isExpanded ? null : phase.phase)}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Chip 
                    label={`Phase ${phase.phase}`} 
                    size="small" 
                    sx={{ 
                      bgcolor: colors.border, 
                      color: 'white',
                      fontWeight: 'bold',
                      mb: 1 
                    }} 
                  />
                  <Typography variant="h6" fontWeight="bold" sx={{ color: colors.text }}>
                    {phase.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Weeks {phase.weeks[0].week}-{phase.weeks[phase.weeks.length - 1].week} • 
                    {phaseProgress}/{phase.weeks.length} complete
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  {hasCurrentWeek && (
                    <Chip label="Current" color="primary" size="small" />
                  )}
                  <IconButton size="small">
                    <ExpandMoreIcon 
                      sx={{ 
                        transform: isExpanded ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s'
                      }} 
                    />
                  </IconButton>
                </Box>
              </Box>
            </CardContent>

            <Collapse in={isExpanded}>
              <Divider />
              <Box sx={{ p: 2 }}>
                {phase.weeks.map((week) => {
                  const completed = isWeekCompleted(week.week);
                  const current = isWeekCurrent(week.week);
                  const locked = isWeekLocked(week.week);

                  return (
                    <Box
                      key={week.week}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        p: 2,
                        mb: 1,
                        borderRadius: 2,
                        bgcolor: current ? colors.bg : 'grey.50',
                        border: current ? `1px solid ${colors.border}` : 'none',
                        opacity: locked ? 0.5 : 1,
                        cursor: locked ? 'not-allowed' : 'pointer',
                        '&:hover': !locked ? { bgcolor: colors.bg } : {},
                      }}
                      onClick={() => !locked && navigate(`/course/week/${week.week}`)}
                    >
                      {/* Status Icon */}
                      <Box 
                        sx={{ 
                          width: 40, 
                          height: 40, 
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: completed ? 'success.main' : current ? colors.border : 'grey.300',
                          color: 'white',
                          fontWeight: 'bold',
                        }}
                      >
                        {completed ? (
                          <CheckIcon />
                        ) : locked ? (
                          <LockIcon fontSize="small" />
                        ) : (
                          week.week
                        )}
                      </Box>

                      {/* Week Info */}
                      <Box flex={1}>
                        <Typography fontWeight="bold" color={locked ? 'text.disabled' : 'text.primary'}>
                          {week.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {week.expert} • {week.theme}
                        </Typography>
                      </Box>

                      {/* Current Badge */}
                      {current && (
                        <Chip 
                          label="In Progress" 
                          size="small" 
                          color="primary"
                          icon={<PlayIcon />}
                        />
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Collapse>
          </Card>
        );
      })}

      {/* Course Completed */}
      {progress?.completedAt && (
        <Card sx={{ mt: 4, bgcolor: 'success.light' }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              🎉 Course Completed!
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              You've completed all 16 weeks. Keep practicing these principles daily.
            </Typography>
            <Button variant="outlined" onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default Journey;
