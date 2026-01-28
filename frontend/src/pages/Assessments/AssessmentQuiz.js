import React, { useState, useEffect } from 'react';
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
  Stepper,
  Step,
  StepLabel,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckIcon from '@mui/icons-material/Check';
import { assessmentsApi } from '../../services/api';

const likertOptions = [
  { value: 1, label: 'Strongly Disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly Agree' },
];

const assessmentTitles = {
  attachment: 'Attachment Style Assessment',
  personality: '16 Personalities Assessment',
  wellness_behavior: 'Wellness Behavior Assessment',
  negative_patterns_closeness: 'Patterns & Closeness Assessment',
};

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

  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const fetchQuestions = async () => {
    try {
      const response = await assessmentsApi.getQuestions(type);
      setQuestions(response.data.questions);
    } catch (err) {
      setError('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = (value) => {
    setResponses({
      ...responses,
      [questions[currentIndex].id]: parseInt(value),
    });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    try {
      const response = await assessmentsApi.submit(type, responses);
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((currentIndex + 1) / questions.length) * 100;
  const currentQuestion = questions[currentIndex];
  const currentResponse = responses[currentQuestion?.id];
  const allAnswered = questions.length > 0 && Object.keys(responses).length === questions.length;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (result) {
    return (
      <Box maxWidth="md" mx="auto">
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Assessment Complete!
            </Typography>
            <Typography color="text.secondary" paragraph>
              Your responses have been saved.
            </Typography>

            <Box sx={{ bgcolor: 'grey.100', p: 3, borderRadius: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Your Result
              </Typography>
              {type === 'attachment' && (
                <Typography variant="h5" color="primary">
                  {result.assessment.score.style} Attachment
                </Typography>
              )}
              {type === 'personality' && (
                <Typography variant="h5" color="primary">
                  {result.assessment.score.type}
                </Typography>
              )}
              {type === 'wellness_behavior' && (
                <Typography variant="h5" color="primary">
                  {result.assessment.score.score}/100 - {result.assessment.score.level}
                </Typography>
              )}
              {type === 'negative_patterns_closeness' && (
                <Typography variant="h5" color="primary">
                  Closeness: {result.assessment.score.closeness}%
                </Typography>
              )}
            </Box>

            <Box display="flex" gap={2} justifyContent="center">
              <Button variant="outlined" onClick={() => navigate('/assessments')}>
                Back to Assessments
              </Button>
              <Button variant="contained" onClick={() => navigate('/matchup')}>
                View Matchup
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box maxWidth="md" mx="auto">
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/assessments')}
        sx={{ mb: 2 }}
      >
        Back to Assessments
      </Button>

      <Typography variant="h5" fontWeight="bold" gutterBottom>
        {assessmentTitles[type]}
      </Typography>

      <Box mb={3}>
        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography variant="body2">
            Question {currentIndex + 1} of {questions.length}
          </Typography>
          <Typography variant="body2">{Math.round(progress)}%</Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {currentQuestion?.text}
          </Typography>

          <RadioGroup
            value={currentResponse || ''}
            onChange={(e) => handleResponse(e.target.value)}
          >
            {likertOptions.map((option) => (
              <FormControlLabel
                key={option.value}
                value={option.value}
                control={<Radio />}
                label={option.label}
                sx={{
                  py: 1.5,
                  px: 2,
                  my: 0.5,
                  borderRadius: 2,
                  width: '100%',
                  bgcolor: currentResponse === option.value ? 'primary.light' : 'transparent',
                  color: currentResponse === option.value ? 'primary.contrastText' : 'inherit',
                  '&:hover': {
                    bgcolor: currentResponse === option.value ? 'primary.light' : 'grey.100',
                  },
                }}
              />
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <Box
        display="flex"
        justifyContent="space-between"
        mt={3}
        sx={{ '& .MuiButton-root': { minHeight: { xs: 48, md: 'auto' } } }}
      >
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          disabled={currentIndex === 0}
        >
          Back
        </Button>

        {currentIndex < questions.length - 1 ? (
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={handleNext}
            disabled={!currentResponse}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
          >
            {submitting ? <CircularProgress size={24} /> : 'Submit'}
          </Button>
        )}
      </Box>

      {!isMobile && (
        <Box mt={4}>
          <Stepper activeStep={currentIndex} alternativeLabel>
            {questions.map((_, index) => (
              <Step key={index} completed={!!responses[questions[index]?.id]}>
                <StepLabel />
              </Step>
            ))}
          </Stepper>
        </Box>
      )}
    </Box>
  );
};

export default AssessmentQuiz;
