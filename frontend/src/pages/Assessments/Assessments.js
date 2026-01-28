import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { assessmentsApi } from '../../services/api';

const assessmentTypes = [
  {
    type: 'attachment',
    title: 'Attachment Style',
    description: 'Understand how you connect emotionally in relationships',
    questions: 12,
    duration: '5 min',
    icon: '❤️',
  },
  {
    type: 'personality',
    title: '16 Personalities',
    description: 'Discover your personality type and communication style',
    questions: 20,
    duration: '8 min',
    icon: '🧠',
  },
  {
    type: 'wellness_behavior',
    title: 'Wellness Behavior',
    description: 'Assess how you handle disappointment and frustration',
    questions: 10,
    duration: '4 min',
    icon: '🌱',
  },
  {
    type: 'negative_patterns_closeness',
    title: 'Patterns & Closeness',
    description: 'Identify interaction patterns and emotional connection',
    questions: 15,
    duration: '6 min',
    icon: '🔄',
  },
];

const Assessments = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState({ completed: [], pending: [] });

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const response = await assessmentsApi.getResults();
      setResults(response.data);
    } catch (error) {
      console.error('Failed to fetch results:', error);
    } finally {
      setLoading(false);
    }
  };

  const isCompleted = (type) => {
    return results.completed.some((a) => a.type === type);
  };

  const getScore = (type) => {
    const assessment = results.completed.find((a) => a.type === type);
    return assessment?.score;
  };

  const progress = (results.completed.length / assessmentTypes.length) * 100;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Assessments
      </Typography>
      <Typography color="text.secondary" paragraph>
        Complete all four assessments to unlock your personalized matchup score and strategies.
      </Typography>

      <Box mb={4}>
        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography variant="body2">Overall Progress</Typography>
          <Typography variant="body2">
            {results.completed.length}/{assessmentTypes.length} completed
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ height: 10, borderRadius: 5 }}
        />
      </Box>

      <Grid container spacing={3}>
        {assessmentTypes.map((assessment) => {
          const completed = isCompleted(assessment.type);
          const score = getScore(assessment.type);

          return (
            <Grid item xs={12} md={6} key={assessment.type}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  opacity: completed ? 0.9 : 1,
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Typography variant="h2" component="span" sx={{ mr: 2 }}>
                      {assessment.icon}
                    </Typography>
                    {completed && (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Completed"
                        color="success"
                        size="small"
                      />
                    )}
                  </Box>
                  <Typography variant="h6" gutterBottom sx={{ mt: 1 }}>
                    {assessment.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {assessment.description}
                  </Typography>
                  <Box display="flex" gap={2}>
                    <Chip
                      label={`${assessment.questions} questions`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={assessment.duration}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  {completed && score && (
                    <Box mt={2} p={2} bgcolor="grey.100" borderRadius={2}>
                      <Typography variant="body2" fontWeight="bold">
                        Your Result:
                      </Typography>
                      <Typography variant="body2">
                        {assessment.type === 'attachment' && `Style: ${score.style}`}
                        {assessment.type === 'personality' && `Type: ${score.type}`}
                        {assessment.type === 'wellness_behavior' &&
                          `Score: ${score.score}/100 (${score.level})`}
                        {assessment.type === 'negative_patterns_closeness' &&
                          `Closeness: ${score.closeness}%`}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    variant={completed ? 'outlined' : 'contained'}
                    startIcon={<PlayArrowIcon />}
                    onClick={() => navigate(`/assessments/${assessment.type}`)}
                    fullWidth
                  >
                    {completed ? 'Retake' : 'Start'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {results.allCompleted && (
        <Box mt={4} textAlign="center">
          <Typography variant="h6" color="success.main" gutterBottom>
            All assessments completed!
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/matchup')}
          >
            View Matchup Score
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default Assessments;
