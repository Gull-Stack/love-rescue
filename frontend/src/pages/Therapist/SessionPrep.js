import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Button, Chip,
  List, ListItem, ListItemIcon, ListItemText, Alert, Skeleton,
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Filler, Tooltip as ChartTooltip, Legend,
} from 'chart.js';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import FavoriteIcon from '@mui/icons-material/Favorite';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import IconButton from '@mui/material/IconButton';
import { useTheme } from '@mui/material/styles';
import therapistService from '../../services/therapistService';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, ChartTooltip, Legend);

/** Humanize an assessment type key like "gottman_checkup" → "Gottman Checkup". */
const typeLabel = (type) =>
  String(type || '')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

/** Assessment scores may be numbers or structured JSON — only show numbers numerically. */
const asNumber = (score) => {
  if (typeof score === 'number') return score;
  const n = Number(score);
  return Number.isFinite(n) ? n : null;
};

const StatTile = ({ icon, value, label, color = 'primary.main' }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ textAlign: 'center', py: 2 }}>
      <Box sx={{ color, mb: 0.5 }}>{icon}</Box>
      <Typography variant="h4" fontWeight={700}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </CardContent>
  </Card>
);

const trendChip = (trend) => {
  if (trend === 'improving') return <Chip icon={<TrendingUpIcon />} label="Improving" color="success" size="small" />;
  if (trend === 'declining') return <Chip icon={<TrendingDownIcon />} label="Declining" color="warning" size="small" />;
  return <Chip icon={<TrendingFlatIcon />} label="Stable" size="small" />;
};

const SessionPrep = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await therapistService.getSessionPrep(id);
      setReport(res.data?.report || null);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to load session prep');
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
        <Grid container spacing={2} sx={{ mt: 1, mb: 2 }}>
          {[1, 2, 3, 4].map(i => (
            <Grid item xs={6} md={3} key={i}><Skeleton variant="rounded" height={100} /></Grid>
          ))}
        </Grid>
        {[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={120} sx={{ mb: 2 }} />)}
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
    client,
    lastSessionDate,
    activitiesCompleted = {},
    assessmentChanges = {},
    moodTrends = {},
    crisisFlags = [],
    generatedSummary,
    expertInsights = [],
    courseProgress,
    pendingTasks = [],
  } = report || {};

  const clientName = [client?.firstName, client?.lastName].filter(Boolean).join(' ') || 'Client';
  const dailyMoods = moodTrends.dailyMoods || [];
  const hasMoodComparison = (moodTrends.previousAvg || 0) > 0 && (moodTrends.currentAvg || 0) > 0;

  const scoreChanges = Object.entries(assessmentChanges).map(([type, change]) => {
    const current = asNumber(change?.current);
    const previous = asNumber(change?.previous);
    const delta = current != null && previous != null ? current - previous : null;
    return { type, current, previous, delta, completedAt: change?.completedAt };
  });

  const moodChartData = {
    labels: dailyMoods.map(m => new Date(m.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
    datasets: [{
      label: 'Mood',
      data: dailyMoods.map(m => m.mood),
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
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" fontWeight={600}>
            Session Prep: {clientName}
          </Typography>
          {lastSessionDate && (
            <Typography variant="body2" color="text.secondary">
              Covering {new Date(lastSessionDate).toLocaleDateString()} — {new Date().toLocaleDateString()}
              {courseProgress && ` · Course week ${courseProgress.currentWeek}${courseProgress.isActive ? '' : ' (paused)'}`}
            </Typography>
          )}
        </Box>
        <Button startIcon={<PrintIcon />} onClick={() => window.print()} variant="outlined" sx={{ minHeight: 44 }}>
          Print
        </Button>
      </Box>

      {/* Crisis Flags — most important, show first */}
      {crisisFlags.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }} icon={<WarningAmberIcon />}>
          <Typography variant="subtitle2" fontWeight={700}>Crisis Flags</Typography>
          {crisisFlags.map((f, i) => (
            <Typography key={i} variant="body2">
              • {f.message} ({f.date ? new Date(f.date).toLocaleDateString() : 'date unknown'})
            </Typography>
          ))}
        </Alert>
      )}

      {/* Engagement Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <StatTile
            icon={<DonutLargeIcon />}
            value={`${activitiesCompleted.completionRate ?? 0}%`}
            label={`Daily Completion (${activitiesCompleted.daysActive ?? 0}/${activitiesCompleted.totalDays ?? 0} days)`}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatTile
            icon={<WhatshotIcon />}
            value={activitiesCompleted.streak ?? 0}
            label="Day Streak"
            color="warning.main"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatTile
            icon={<TaskAltIcon />}
            value={activitiesCompleted.tasksCompleted ?? 0}
            label="Tasks Completed"
            color="success.main"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatTile
            icon={<FavoriteIcon />}
            value={activitiesCompleted.gratitudeCount ?? 0}
            label="Gratitude Entries"
            color="secondary.main"
          />
        </Grid>
      </Grid>

      {/* Since Last Session Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Since Last Session</Typography>
          <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
            {generatedSummary ? generatedSummary.replace(/\*\*/g, '') : 'No summary available.'}
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Assessment Score Changes */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Assessment Changes</Typography>
              {scoreChanges.length === 0 ? (
                <Typography color="text.secondary">No assessments completed since last session.</Typography>
              ) : (
                <List dense>
                  {scoreChanges.map((s) => (
                    <ListItem key={s.type}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {s.delta == null
                          ? <RemoveIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                          : s.delta >= 0
                            ? <ArrowUpwardIcon sx={{ color: 'success.main', fontSize: 20 }} />
                            : <ArrowDownwardIcon sx={{ color: 'error.main', fontSize: 20 }} />
                        }
                      </ListItemIcon>
                      <ListItemText
                        primary={typeLabel(s.type)}
                        secondary={
                          s.current != null && s.previous != null
                            ? `${s.previous} → ${s.current} (${s.delta > 0 ? '+' : ''}${s.delta})`
                            : s.current != null
                              ? `Latest score: ${s.current} (no earlier result to compare)`
                              : `Retaken ${s.completedAt ? new Date(s.completedAt).toLocaleDateString() : 'recently'}`
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Pending Assigned Tasks */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Pending Assigned Tasks</Typography>
              {pendingTasks.length === 0 ? (
                <Typography color="text.secondary">No pending tasks — everything assigned has been completed.</Typography>
              ) : (
                <List dense>
                  {pendingTasks.map((t) => (
                    <ListItem key={t.id}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <PendingActionsIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={t.description}
                        secondary={[
                          t.priority ? `Priority: ${t.priority}` : null,
                          t.dueDate ? `Due ${new Date(t.dueDate).toLocaleDateString()}` : null,
                        ].filter(Boolean).join(' · ') || null}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Expert Insights */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <LightbulbIcon sx={{ verticalAlign: 'middle', mr: 0.5, color: 'warning.main' }} />
            Expert Insights
          </Typography>
          {expertInsights.length === 0 ? (
            <Typography color="text.secondary">No insights available.</Typography>
          ) : (
            <List dense>
              {expertInsights.map((text, i) => (
                <ListItem key={i} alignItems="flex-start">
                  <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                    <Chip label={i + 1} size="small" sx={{ height: 22, minWidth: 22 }} />
                  </ListItemIcon>
                  <ListItemText primary={<Typography variant="body2">{text}</Typography>} />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Mood Trend */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ flex: 1 }}>Mood Trend</Typography>
            {hasMoodComparison && (
              <>
                <Typography variant="body2" color="text.secondary">
                  {moodTrends.previousAvg.toFixed(1)} → {moodTrends.currentAvg.toFixed(1)} avg
                </Typography>
                {trendChip(moodTrends.trend)}
              </>
            )}
          </Box>
          {dailyMoods.length === 0 ? (
            <Typography color="text.secondary">No mood data available for this period.</Typography>
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
