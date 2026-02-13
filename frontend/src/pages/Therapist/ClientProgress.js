import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Button, Chip,
  CircularProgress, Alert, Skeleton, IconButton, Tooltip,
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
import SentimentSatisfiedIcon from '@mui/icons-material/SentimentSatisfied';
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral';
import { useTheme } from '@mui/material/styles';
import therapistService from '../../services/therapistService';
import { AssessmentChart } from '../../components/therapist';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend);

const moodIcon = (val) => {
  if (val >= 7) return <SentimentSatisfiedIcon sx={{ color: 'success.main' }} />;
  if (val >= 4) return <SentimentNeutralIcon sx={{ color: 'warning.main' }} />;
  return <SentimentDissatisfiedIcon sx={{ color: 'error.main' }} />;
};

const ClientProgress = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
      setError(err.response?.data?.message || 'Failed to load client data');
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

  const theme = useTheme();
  const { client, progress, assessments } = data || {};
  const weeklyActivity = progress?.weeklyActivity || [];

  const activityChartData = {
    labels: weeklyActivity.map(w => w.week),
    datasets: [{
      label: 'Completion Rate',
      data: weeklyActivity.map(w => w.completionRate),
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
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <WhatshotIcon sx={{ color: 'warning.main' }} />
              <Typography variant="h4" fontWeight={700}>{progress?.streak || 0}</Typography>
              <Typography variant="caption" color="text.secondary">Day Streak</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <AssignmentIcon sx={{ color: 'primary.main' }} />
              <Typography variant="h4" fontWeight={700}>{progress?.totalActivities || 0}</Typography>
              <Typography variant="caption" color="text.secondary">Activities Done</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              {moodIcon(progress?.currentMood || 5)}
              <Typography variant="h4" fontWeight={700}>{progress?.currentMood || '—'}</Typography>
              <Typography variant="caption" color="text.secondary">Current Mood</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="body2" color="text.secondary">Phase {progress?.phase || '—'}</Typography>
              <Typography variant="h5" fontWeight={700}>Week {progress?.week || '—'}</Typography>
              <Typography variant="caption" color="text.secondary">Curriculum</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Assessment Scores Over Time */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Assessment Scores Over Time</Typography>
          <AssessmentChart assessments={assessments} height={350} />
        </CardContent>
      </Card>

      {/* Activity Completion by Week */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Weekly Activity Completion</Typography>
          {weeklyActivity.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>No activity data yet</Typography>
          ) : (
            <Box sx={{ height: 250 }}>
              <Bar
                data={activityChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { beginAtZero: true, max: 100, title: { display: true, text: '%' } },
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
