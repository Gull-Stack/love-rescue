import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Chip,
  TextField,
  Alert,
  IconButton,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  CheckCircle as CheckIcon,
  Circle as CircleIcon,
  EmojiObjects as InsightIcon,
  FitnessCenter as PracticeIcon,
  School as ExpertIcon,
  NavigateNext as NextIcon,
  Psychology as FocusIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { courseApi } from '../../services/api';

const WeekDetail = () => {
  const navigate = useNavigate();
  const { weekNumber } = useParams();
  const [loading, setLoading] = useState(true);
  const [strategy, setStrategy] = useState(null);
  const [weekData, setWeekData] = useState(null);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [practiceDialog, setPracticeDialog] = useState(false);
  const [practiceCompleted, setPracticeCompleted] = useState(false);
  const [practiceNotes, setPracticeNotes] = useState('');
  const [reflectionDialog, setReflectionDialog] = useState(false);
  const [reflection, setReflection] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [advanceDialog, setAdvanceDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, [weekNumber]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get current progress first
      const progressRes = await courseApi.getProgress();
      setProgress(progressRes.data);

      // If specific week requested, fetch that week
      if (weekNumber) {
        const weekRes = await courseApi.getWeek(parseInt(weekNumber));
        setWeekData(weekRes.data);
        // Strategy is only for current week
        if (parseInt(weekNumber) === progressRes.data.currentWeek) {
          const stratRes = await courseApi.getStrategy();
          setStrategy(stratRes.data.strategy);
        }
      } else {
        // Default to current week
        const stratRes = await courseApi.getStrategy();
        setStrategy(stratRes.data.strategy);
        setWeekData(stratRes.data.weekData);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load week data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogPractice = async () => {
    try {
      setSubmitting(true);
      await courseApi.logPractice(practiceCompleted, practiceNotes);
      setPracticeDialog(false);
      setPracticeNotes('');
      fetchData(); // Refresh data
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to log practice');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveReflection = async () => {
    try {
      setSubmitting(true);
      await courseApi.saveReflection(reflection);
      setReflectionDialog(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save reflection');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdvanceWeek = async () => {
    try {
      setSubmitting(true);
      const res = await courseApi.advanceWeek();
      setAdvanceDialog(false);
      if (res.data.completed) {
        navigate('/course');
      } else {
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to advance week');
    } finally {
      setSubmitting(false);
    }
  };

  const isCurrentWeek = !weekNumber || parseInt(weekNumber) === progress?.currentWeek;
  const displayWeek = weekNumber ? parseInt(weekNumber) : progress?.currentWeek;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!weekData) {
    return (
      <Container maxWidth="md" sx={{ py: 3 }}>
        <Alert severity="error">Week data not found</Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/course')} sx={{ mt: 2 }}>
          Back to Journey
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <IconButton onClick={() => navigate('/course')}>
          <BackIcon />
        </IconButton>
        <Box flex={1}>
          <Typography variant="overline" color="text.secondary">
            Week {displayWeek} of 16
          </Typography>
          <Typography variant="h5" fontWeight="bold">
            {weekData.title}
          </Typography>
        </Box>
        {isCurrentWeek && (
          <Chip label="Current Week" color="primary" />
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Expert & Theme */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <ExpertIcon color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="body2" color="text.secondary">
                This Week's Expert
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {weekData.expert}
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body1" fontStyle="italic" color="text.secondary">
            "{weekData.theme}"
          </Typography>
          {weekData.description && (
            <Typography variant="body2" sx={{ mt: 2 }}>
              {weekData.description}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Personalized Insight (if available) */}
      {(strategy?.customInsights?.length > 0 || weekData.personalizedInsight) && (
        <Card sx={{ mb: 3, bgcolor: 'warning.light' }}>
          <CardContent>
            <Box display="flex" alignItems="flex-start" gap={2}>
              <InsightIcon sx={{ color: 'warning.dark', mt: 0.5 }} />
              <Box>
                <Typography variant="subtitle2" fontWeight="bold" color="warning.dark">
                  Your Personalized Insight
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {strategy?.customInsights?.[0] || weekData.personalizedInsight}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Skills to Learn */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Skills to Learn
          </Typography>
          <List disablePadding>
            {weekData.skills?.map((skill, idx) => (
              <ListItem key={idx} disableGutters>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <CircleIcon sx={{ fontSize: 8, color: 'primary.main' }} />
                </ListItemIcon>
                <ListItemText primary={skill} />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Daily Practice */}
      <Card sx={{ mb: 3, border: '2px solid', borderColor: 'primary.main' }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <PracticeIcon color="primary" sx={{ fontSize: 32 }} />
            <Box flex={1}>
              <Typography variant="subtitle2" color="text.secondary">
                Today's Practice
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {strategy?.dailyPractice || weekData.dailyPractice}
              </Typography>
            </Box>
          </Box>

          {/* Practice Progress */}
          {isCurrentWeek && strategy && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  Practice this week
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {strategy.completedDays || 0} / 7 days
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={((strategy.completedDays || 0) / 7) * 100}
                sx={{ height: 8, borderRadius: 4, mb: 2 }}
              />
              <Button 
                variant="contained" 
                fullWidth
                onClick={() => setPracticeDialog(true)}
              >
                Log Today's Practice
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Focus Areas */}
      {(strategy?.focusAreas?.length > 0 || weekData.focusAreas?.length > 0) && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <FocusIcon color="primary" />
              <Typography variant="h6" fontWeight="bold">
                Your Focus Areas
              </Typography>
            </Box>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {(strategy?.focusAreas || weekData.focusAreas)?.map((area, idx) => (
                <Chip key={idx} label={area} variant="outlined" color="primary" />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Reflection (current week only) */}
      {isCurrentWeek && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight="bold">
                Weekly Reflection
              </Typography>
              <IconButton size="small" onClick={() => {
                setReflection(strategy?.reflection || '');
                setReflectionDialog(true);
              }}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Box>
            {strategy?.reflection ? (
              <Typography variant="body2" color="text.secondary" fontStyle="italic">
                "{strategy.reflection}"
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Take a moment to reflect on what you've learned this week...
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Advance to Next Week */}
      {isCurrentWeek && progress?.currentWeek < 16 && (
        <Button
          variant="outlined"
          fullWidth
          size="large"
          endIcon={<NextIcon />}
          onClick={() => setAdvanceDialog(true)}
          sx={{ mb: 3 }}
        >
          Complete Week & Advance
        </Button>
      )}

      {/* Practice Dialog */}
      <Dialog open={practiceDialog} onClose={() => setPracticeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Log Today's Practice</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={practiceCompleted}
                  onChange={(e) => setPracticeCompleted(e.target.checked)}
                />
              }
              label="I practiced today's skill"
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notes (optional)"
              placeholder="How did it go? What did you notice?"
              value={practiceNotes}
              onChange={(e) => setPracticeNotes(e.target.value)}
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPracticeDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleLogPractice}
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reflection Dialog */}
      <Dialog open={reflectionDialog} onClose={() => setReflectionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Weekly Reflection</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={5}
            label="Your reflection"
            placeholder="What did you learn this week? What was challenging? What breakthrough did you have?"
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReflectionDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSaveReflection}
            disabled={submitting || !reflection.trim()}
          >
            {submitting ? <CircularProgress size={20} /> : 'Save Reflection'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Advance Dialog */}
      <Dialog open={advanceDialog} onClose={() => setAdvanceDialog(false)}>
        <DialogTitle>Complete Week {progress?.currentWeek}?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you ready to move on to Week {(progress?.currentWeek || 0) + 1}? 
            Make sure you've practiced this week's skills before advancing.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdvanceDialog(false)}>Not Yet</Button>
          <Button 
            variant="contained" 
            onClick={handleAdvanceWeek}
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={20} /> : 'Yes, Advance!'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default WeekDetail;
