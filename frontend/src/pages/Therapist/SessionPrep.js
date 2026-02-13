import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Button, Chip, Divider,
  List, ListItem, ListItemIcon, ListItemText, Alert, Skeleton,
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';
import therapistService from '../../services/therapistService';

const SessionPrep = () => {
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
      const res = await therapistService.getSessionPrep(id);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load session prep');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    document.title = 'Session Prep | Love Rescue';
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={300} height={40} />
        {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="rounded" height={120} sx={{ mb: 2 }} />)}
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

  const {
    clientName, summary, activitiesCompleted = [], scoreChanges = [],
    crisisFlags = [], insights = [], moodTrend = [],
  } = data || {};

  const moodChartData = {
    labels: moodTrend.map(m => new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Mood',
      data: moodTrend.map(m => m.value),
      borderColor: theme.palette.primary.main,
      backgroundColor: theme.palette.primary.main + '22',
      fill: true,
      tension: 0.3,
      pointRadius: 3,
    }],
  };

  return (
    <Box sx={{ p: 3, '@media print': { p: 1 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, '@media print': { display: 'none' } }}>
        <IconButton onClick={() => navigate(`/therapist/clients/${id}`)} sx={{ minWidth: 44, minHeight: 44 }} aria-label="Back">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" fontWeight={600} sx={{ flex: 1 }}>
          Session Prep: {clientName}
        </Typography>
        <Button startIcon={<PrintIcon />} onClick={() => window.print()} variant="outlined" sx={{ minHeight: 44 }}>
          Print
        </Button>
      </Box>

      {/* Since Last Session Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>📋 Since Last Session</Typography>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
            {summary || 'No summary available.'}
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Activities Completed */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>✅ Activities Completed</Typography>
              {activitiesCompleted.length === 0 ? (
                <Typography color="text.secondary">No activities completed since last session.</Typography>
              ) : (
                <List dense>
                  {activitiesCompleted.map((a, i) => (
                    <ListItem key={i}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={a.name}
                        secondary={new Date(a.completedAt).toLocaleDateString()}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Assessment Score Changes */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>📊 Assessment Changes</Typography>
              {scoreChanges.length === 0 ? (
                <Typography color="text.secondary">No assessment changes.</Typography>
              ) : (
                <List dense>
                  {scoreChanges.map((s, i) => (
                    <ListItem key={i}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {s.delta > 0
                          ? <ArrowUpwardIcon sx={{ color: 'success.main', fontSize: 20 }} />
                          : <ArrowDownwardIcon sx={{ color: 'error.main', fontSize: 20 }} />
                        }
                      </ListItemIcon>
                      <ListItemText
                        primary={s.assessment}
                        secondary={`${s.previous} → ${s.current} (${s.delta > 0 ? '+' : ''}${s.delta})`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Crisis Flags */}
      {crisisFlags.length > 0 && (
        <Alert severity="error" sx={{ mt: 3 }} icon={<WarningAmberIcon />}>
          <Typography variant="subtitle2" fontWeight={700}>⚠️ Crisis Flags</Typography>
          {crisisFlags.map((f, i) => (
            <Typography key={i} variant="body2">• {f.message} ({new Date(f.date).toLocaleDateString()})</Typography>
          ))}
        </Alert>
      )}

      {/* Expert Insights */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <LightbulbIcon sx={{ verticalAlign: 'middle', mr: 0.5, color: 'warning.main' }} />
            Expert Insights
          </Typography>
          {insights.length === 0 ? (
            <Typography color="text.secondary">No insights available.</Typography>
          ) : (
            insights.map((ins, i) => (
              <Box key={i} sx={{ mb: 1.5 }}>
                <Chip label={ins.expert} size="small" sx={{ mb: 0.5 }} />
                <Typography variant="body2">{ins.text}</Typography>
              </Box>
            ))
          )}
        </CardContent>
      </Card>

      {/* Mood Trend Mini-Chart */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>😊 Mood Trend</Typography>
          {moodTrend.length === 0 ? (
            <Typography color="text.secondary">No mood data available.</Typography>
          ) : (
            <Box sx={{ height: 200 }}>
              <Line
                data={moodChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { beginAtZero: true, max: 10 },
                  },
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default SessionPrep;
