import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Button, Chip,
  Alert, Skeleton, IconButton,
} from '@mui/material';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip as ChartTooltip, Legend,
} from 'chart.js';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import AssignmentIcon from '@mui/icons-material/Assignment';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ArticleIcon from '@mui/icons-material/Article';
import EventNoteIcon from '@mui/icons-material/EventNote';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import SentimentSatisfiedIcon from '@mui/icons-material/SentimentSatisfied';
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral';
import SchoolIcon from '@mui/icons-material/School';
import { useTheme } from '@mui/material/styles';
import therapistService from '../../services/therapistService';
import { AssessmentChart } from '../../components/therapist';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend);

const moodIcon = (val) => {
  if (val == null) return <SentimentNeutralIcon sx={{ color: 'text.disabled' }} />;
  if (val >= 7) return <SentimentSatisfiedIcon sx={{ color: 'success.main' }} />;
  if (val >= 4) return <SentimentNeutralIcon sx={{ color: 'warning.main' }} />;
  return <SentimentDissatisfiedIcon sx={{ color: 'error.main' }} />;
};

/** Humanize an assessment type key like "gottman_checkup" → "Gottman Checkup". */
const typeLabel = (type) =>
  String(type || '')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Group the flat assessment list ([{type, score, completedAt}]) into the
 * series shape AssessmentChart expects: [{ type, label, scores: [{date, value}] }].
 * Non-numeric scores (structured assessment results) are skipped.
 */
const groupAssessments = (assessments) => {
  const byType = {};
  for (const a of assessments) {
    const value = typeof a.score === 'number' ? a.score : Number(a.score);
    if (!Number.isFinite(value)) continue;
    if (!byType[a.type]) byType[a.type] = { type: a.type, label: typeLabel(a.type), scores: [] };
    byType[a.type].scores.push({ date: a.completedAt, value });
  }
  return Object.values(byType).map(series => ({
    ...series,
    scores: series.scores.sort((x, y) => new Date(x.date) - new Date(y.date)),
  }));
};

const ClientProgress = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [clientRes, progressRes, assessRes] = await Promise.all([
        therapistService.getClient(id),
        therapistService.getClientProgress(id),
        therapistService.getClientAssessments(id),
      ]);
      setData({
        client: clientRes.data,
        progress: progressRes.data,
        assessments: assessRes.data.assessments || [],
      });
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to load client data');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    document.title = 'Client Progress | Love Rescue';
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={300} height={40} />
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {[1, 2, 3, 4].map(i => (
            <Grid item xs={6} md={3} key={i}><Skeleton variant="rounded" height={100} /></Grid>
          ))}
        </Grid>
        <Skeleton variant="rounded" height={300} sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={<Button onClick={fetchData}>Retry</Button>}>{error}</Alert>
      </Box>
    );
  }

  const { client, progress, assessments } = data || {};
  const activity = progress?.activityCompletion || {};
  const course = progress?.courseProgress || null;
  const moodTrends = progress?.moodTrends || [];
  const latestMood = moodTrends.length > 0 ? moodTrends[moodTrends.length - 1].mood : null;
  const weeklyStrategies = course?.weeklyStrategies || [];
  const chartSeries = groupAssessments(assessments);

  const activityChartData = {
    labels: weeklyStrategies.map(w => `Week ${w.weekNumber}`),
    datasets: [{
      label: 'Days Completed',
      data: weeklyStrategies.map(w => w.completedDays || 0),
      backgroundColor: theme.palette.primary.main + '44',
      borderColor: theme.palette.primary.main,
      borderWidth: 2,
      borderRadius: 8,
    }],
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate('/therapist')} sx={{ minWidth: 44, minHeight: 44 }} aria-label="Back">
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" fontWeight={600}>{client?.name}</Typography>
          {client?.coupleStatus && (
            <Chip label={client.coupleStatus} size="small" color="primary" variant="outlined" sx={{ mt: 0.5 }} />
          )}
        </Box>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <WhatshotIcon sx={{ color: 'warning.main' }} />
              <Typography variant="h4" fontWeight={700}>{activity.streak || 0}</Typography>
              <Typography variant="caption" color="text.secondary">Day Streak</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <TaskAltIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h4" fontWeight={700}>
                {activity.daysActive ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Active Days ({activity.completionRate ?? 0}% of last {activity.totalDays ?? 90})
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              {moodIcon(latestMood)}
              <Typography variant="h4" fontWeight={700}>{latestMood ?? '—'}</Typography>
              <Typography variant="caption" color="text.secondary">
                {latestMood != null ? 'Latest Mood' : 'Mood (not shared)'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <SchoolIcon sx={{ color: 'secondary.main' }} />
              <Typography variant="h4" fontWeight={700}>
                {course ? `Wk ${course.currentWeek}` : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {course ? (course.isActive ? 'Course Active' : 'Course Paused') : 'Not Enrolled'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tasks summary */}
      {(activity.tasksCompleted > 0 || activity.tasksPending > 0) && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ flex: 1, minWidth: 180 }}>Assigned Tasks</Typography>
            <Chip icon={<TaskAltIcon />} color="success" variant="outlined" label={`${activity.tasksCompleted || 0} completed`} />
            <Chip icon={<AssignmentIcon />} color="warning" variant="outlined" label={`${activity.tasksPending || 0} pending`} />
          </CardContent>
        </Card>
      )}

      {/* Assessment Scores Over Time */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Assessment Scores Over Time</Typography>
          <AssessmentChart assessments={chartSeries} height={350} />
        </CardContent>
      </Card>

      {/* Course Activity by Week */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Course Practice by Week</Typography>
          {weeklyStrategies.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              {course ? 'No weekly practice data yet' : 'Client is not enrolled in the course'}
            </Typography>
          ) : (
            <Box sx={{ height: 250 }}>
              <Bar
                data={activityChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        afterLabel: (ctx) => {
                          const ws = weeklyStrategies[ctx.dataIndex];
                          return ws?.theme ? `Theme: ${ws.theme}` : '';
                        },
                      },
                    },
                  },
                  scales: {
                    y: { beginAtZero: true, max: 7, title: { display: true, text: 'Days practiced' }, ticks: { stepSize: 1 } },
                  },
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Quick Actions</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<AssignmentIcon />}
              onClick={() => navigate(`/therapist/clients/${id}/treatment-plan`)}
              sx={{ minHeight: 44 }}
            >
              Treatment Plan
            </Button>
            <Button
              variant="outlined"
              startIcon={<ArticleIcon />}
              onClick={() => navigate(`/therapist/clients/${id}/session-prep`)}
              sx={{ minHeight: 44 }}
            >
              Session Prep
            </Button>
            <Button
              variant="outlined"
              startIcon={<EventNoteIcon />}
              onClick={() => navigate(`/therapist/clients/${id}/notes`)}
              sx={{ minHeight: 44 }}
            >
              Session Notes
            </Button>
            <Button
              variant="outlined"
              startIcon={<NotificationsIcon />}
              onClick={() => navigate('/therapist/alerts')}
              sx={{ minHeight: 44 }}
            >
              View Alerts
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ClientProgress;
