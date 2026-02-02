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
import { useAuth } from '../../contexts/AuthContext';
import { strategiesApi, calendarApi } from '../../services/api';

const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const Strategies = () => {
  const navigate = useNavigate();
  const { relationship } = useAuth();
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
        setError('Failed to load strategy');
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
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
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<CalendarTodayIcon />}
            onClick={handleSyncCalendar}
            disabled={syncing || !strategy}
          >
            {syncing ? 'Syncing...' : 'Sync to Calendar'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'Generating...' : 'New Strategy'}
          </Button>
        </Box>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {error && (
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
                {strategy.weeklyGoals.map((goal, idx) => (
                  <ListItem key={idx} dense>
                    <ListItemIcon>
                      <Checkbox
                        checked={completedTasks.has(`goal-${idx}`)}
                        onChange={() => handleTaskToggle(`goal-${idx}`)}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={goal}
                      sx={{
                        textDecoration: completedTasks.has(`goal-${idx}`)
                          ? 'line-through'
                          : 'none',
                      }}
                    />
                  </ListItem>
                ))}
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
                    {activities.map((activity, idx) => (
                      <ListItem key={idx}>
                        <ListItemIcon>
                          <Checkbox
                            checked={completedTasks.has(`${day}-${idx}`)}
                            onChange={() => handleTaskToggle(`${day}-${idx}`)}
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={activity}
                          sx={{
                            textDecoration: completedTasks.has(`${day}-${idx}`)
                              ? 'line-through'
                              : 'none',
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </>
      ) : (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              No Active Strategy
            </Typography>
            <Typography color="text.secondary" paragraph>
              {relationship?.hasPartner
                ? 'Generate a personalized 6-week strategy based on your matchup results.'
                : 'Generate a personalized 6-week strategy based on your assessment results.'}
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? <CircularProgress size={24} /> : 'Generate Strategy'}
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Strategies;
