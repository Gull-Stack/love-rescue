import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Chip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Alert,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import RefreshIcon from '@mui/icons-material/Refresh';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { useAuth } from '../../contexts/AuthContext';
import { strategiesApi, calendarApi } from '../../services/api';
import { sectionColors } from '../../theme';
import EmptyState from '../../components/common/EmptyState';

const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const Strategies = () => {
  const navigate = useNavigate();
  const { relationship, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [strategy, setStrategy] = useState(null);
  const [completedTasks, setCompletedTasks] = useState(new Set());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    document.title = 'Strategies | Love Rescue';
    fetchStrategy();
  }, []); // Intentional: run once on mount to load current strategy

  const fetchStrategy = async () => {
    try {
      const response = await strategiesApi.getCurrent();
      const loadedStrategy = response.data.strategy;
      setStrategy(loadedStrategy);

      // Restore completed tasks from localStorage
      if (loadedStrategy?.id) {
        const storageKey = `strategy_tasks_${loadedStrategy.id}`;
        const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
        setCompletedTasks(new Set(saved));
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        // Check if error is due to no assessments
        if (err.response?.data?.code === 'NO_ASSESSMENTS') {
          setError('NEEDS_ASSESSMENTS');
        } else {
          setError('Failed to load strategy');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');

    try {
      const response = await strategiesApi.generate();
      setStrategy(response.data.strategies[0]);
      setSuccess('New 6-week strategy generated!');
    } catch (err) {
      // If no assessments completed, redirect to assessments page
      if (err.response?.data?.code === 'NO_ASSESSMENTS') {
        navigate('/assessments', { 
          state: { message: 'Complete at least one assessment to generate your personalized strategy!' }
        });
        return;
      }
      setError(err.response?.data?.error || 'Failed to generate strategy');
    } finally {
      setGenerating(false);
    }
  };

  const handleSyncCalendar = async () => {
    setSyncing(true);
    setError('');

    try {
      await calendarApi.sync();
      setSuccess('Activities synced to Google Calendar!');
    } catch (err) {
      if (err.response?.data?.code === 'CALENDAR_NOT_CONNECTED') {
        const urlRes = await calendarApi.getAuthUrl();
        window.location.href = urlRes.data.authUrl;
      } else {
        setError(err.response?.data?.error || 'Failed to sync calendar');
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleTaskToggle = async (taskId) => {
    const newCompleted = new Set(completedTasks);
    if (newCompleted.has(taskId)) {
      newCompleted.delete(taskId);
    } else {
      newCompleted.add(taskId);
    }
    setCompletedTasks(newCompleted);

    // Persist completed tasks to localStorage
    if (strategy?.id) {
      const storageKey = `strategy_tasks_${strategy.id}`;
      localStorage.setItem(storageKey, JSON.stringify([...newCompleted]));
    }

    // Update progress on backend
    if (strategy) {
      const totalTasks = Object.values(strategy.dailyActivities).flat().length +
                         strategy.weeklyGoals.length;
      const progress = Math.round((newCompleted.size / totalTasks) * 100);

      try {
        await strategiesApi.updateProgress(strategy.id, { progress });
      } catch {
        // Progress update failed silently — local state is still correct
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ background: sectionColors.strategies.gradient, mx: -3, mt: -3, px: 3, pt: 3, pb: 2, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" fontWeight="bold">
              {relationship?.hasPartner ? 'Your Relationship Strategy' : 'Your Personal Growth Strategy'}
            </Typography>
            {strategy && (
              <Typography color="text.secondary">
                Cycle {strategy.cycleNumber} - Week {strategy.week}
              </Typography>
            )}
          </Box>
          <Box display="flex" gap={1} flexWrap="wrap">
          <Button
            variant="outlined"
            size="small"
            startIcon={<AccountTreeIcon />}
            onClick={() => navigate('/skills')}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Skill Tree
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<CalendarTodayIcon />}
            onClick={handleSyncCalendar}
            disabled={syncing || !strategy}
          >
            {syncing ? 'Syncing...' : 'Sync to Calendar'}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'Generating...' : 'New Strategy'}
          </Button>
        </Box>
      </Box>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {error && error !== 'NEEDS_ASSESSMENTS' && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {strategy ? (
        <>
          {/* Progress */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="h6">Week {strategy.week} Progress</Typography>
                <Typography variant="h6" color="primary">
                  {strategy.progress || 0}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={strategy.progress || 0}
                sx={{ height: 10, borderRadius: 5 }}
              />
              <Box display="flex" gap={1} mt={2}>
                <Chip
                  label={`${new Date(strategy.startDate).toLocaleDateString()} - ${new Date(
                    strategy.endDate
                  ).toLocaleDateString()}`}
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>

          {/* Weekly Goals */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Weekly Goals
              </Typography>
              <List>
                {strategy.weeklyGoals.map((goal, idx) => {
                  const goalText = typeof goal === 'object' ? goal.text : goal;
                  const goalWhy = typeof goal === 'object' ? goal.why : null;
                  return (
                    <React.Fragment key={idx}>
                      <ListItem dense>
                        <ListItemIcon>
                          <Checkbox
                            checked={completedTasks.has(`goal-${idx}`)}
                            onChange={() => handleTaskToggle(`goal-${idx}`)}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={goalText}
                          sx={{
                            textDecoration: completedTasks.has(`goal-${idx}`)
                              ? 'line-through'
                              : 'none',
                            cursor: goalWhy ? 'pointer' : 'default',
                          }}
                        />
                      </ListItem>
                      {goalWhy && (
                        <Box sx={{ ml: 9, mr: 2, mb: 1.5, p: 1.5, bgcolor: 'grey.50', borderRadius: 2, borderLeft: '3px solid #f5576c' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                            💡 <strong>Why:</strong> {goalWhy}
                          </Typography>
                        </Box>
                      )}
                    </React.Fragment>
                  );
                })}
              </List>
            </CardContent>
          </Card>

          {/* Daily Activities */}
          <Typography variant="h6" gutterBottom>
            Daily Activities
          </Typography>
          {dayOrder.map((day) => {
            const activities = strategy.dailyActivities[day] || [];
            if (activities.length === 0) return null;

            return (
              <Accordion key={day}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ textTransform: 'capitalize', fontWeight: 500 }}>
                    {day}
                  </Typography>
                  <Chip
                    label={`${activities.filter((_, i) => completedTasks.has(`${day}-${i}`)).length}/${activities.length}`}
                    size="small"
                    sx={{ ml: 2 }}
                  />
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {activities.map((activity, idx) => {
                      const actText = typeof activity === 'object' ? activity.text : activity;
                      const actWhy = typeof activity === 'object' ? activity.why : null;
                      const actType = typeof activity === 'object' ? activity.type : null;
                      return (
                        <React.Fragment key={idx}>
                          <ListItem>
                            <ListItemIcon>
                              <Checkbox
                                checked={completedTasks.has(`${day}-${idx}`)}
                                onChange={() => handleTaskToggle(`${day}-${idx}`)}
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Box display="flex" alignItems="center" gap={1}>
                                  {actType === 'positive_lens' && <span>🌟</span>}
                                  <span>{actText}</span>
                                </Box>
                              }
                              sx={{
                                textDecoration: completedTasks.has(`${day}-${idx}`)
                                  ? 'line-through'
                                  : 'none',
                              }}
                            />
                          </ListItem>
                          {actWhy && (
                            <Box sx={{ ml: 9, mr: 2, mb: 1, p: 1.5, bgcolor: 'grey.50', borderRadius: 2, borderLeft: '3px solid #f5576c' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                                💡 <strong>Why:</strong> {actWhy}
                              </Typography>
                            </Box>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </List>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </>
      ) : (
        <EmptyState
          emoji="🧭"
          title="Your roadmap is waiting"
          subtitle="Complete a few assessments and we'll build a plan just for you"
          ctaText="Take Assessment"
          onCta={() => navigate('/assessments')}
          gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        />
      )}
    </Box>
  );
};

export default Strategies;
