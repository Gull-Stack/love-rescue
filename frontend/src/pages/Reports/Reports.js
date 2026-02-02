import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Grid,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { reportsApi, logsApi } from '../../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');
  const [weekOffset, setWeekOffset] = useState(0);
  const [report, setReport] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Reports | Love Rescue';
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [reportRes, statsRes] = await Promise.all([
          reportsApi.getWeekly(weekOffset),
          logsApi.getStats(period),
        ]);
        setReport(reportRes.data.report);
        setStats(statsRes.data);
      } catch (err) {
        setError('Failed to load reports');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period, weekOffset]);

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving':
        return <TrendingUpIcon color="success" />;
      case 'declining':
        return <TrendingDownIcon color="warning" />;
      default:
        return <TrendingFlatIcon color="action" />;
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const ratioChartData = {
    labels: stats?.chartData?.map((d) =>
      new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })
    ) || [],
    datasets: [
      {
        label: 'Ratio',
        data: stats?.chartData?.map((d) => d.ratio) || [],
        borderColor: '#e91e63',
        backgroundColor: 'rgba(233, 30, 99, 0.1)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const interactionsChartData = {
    labels: report?.dailyBreakdown?.map((d) =>
      new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })
    ) || [],
    datasets: [
      {
        label: 'Positive',
        data: report?.dailyBreakdown?.map((d) => d.positiveCount) || [],
        backgroundColor: '#4caf50',
      },
      {
        label: 'Negative',
        data: report?.dailyBreakdown?.map((d) => d.negativeCount) || [],
        backgroundColor: '#f44336',
      },
    ],
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
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Reports
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Period Selector */}
      <Box
        display="flex"
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        gap={2}
        mb={3}
      >
        <ToggleButtonGroup
          value={period}
          exclusive
          onChange={(_, value) => value && setPeriod(value)}
          size="small"
        >
          <ToggleButton value="7d">7 Days</ToggleButton>
          <ToggleButton value="30d">30 Days</ToggleButton>
          <ToggleButton value="90d">90 Days</ToggleButton>
        </ToggleButtonGroup>

        <Box display="flex" alignItems="center" gap={1}>
          <Button
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={() => setWeekOffset(weekOffset + 1)}
          >
            Previous
          </Button>
          <Typography variant="body2">
            {report?.weekStart
              ? `${new Date(report.weekStart).toLocaleDateString()} - ${new Date(
                  report.weekEnd
                ).toLocaleDateString()}`
              : 'This Week'}
          </Typography>
          <Button
            size="small"
            endIcon={<ArrowForwardIcon />}
            onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
            disabled={weekOffset === 0}
          >
            Next
          </Button>
        </Box>
      </Box>

      {/* Stats Overview */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="primary">
                {stats?.stats?.avgRatio === 999 ? '∞' : stats?.stats?.avgRatio || 0}:1
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Ratio
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="success.main">
                {stats?.stats?.totalPositives || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Positives
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h3" color="error.main">
                {stats?.stats?.totalNegatives || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Negatives
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box display="flex" justifyContent="center" alignItems="center" gap={1}>
                {getTrendIcon(stats?.stats?.trend)}
                <Typography variant="h5" sx={{ textTransform: 'capitalize' }}>
                  {stats?.stats?.trend || 'Neutral'}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Trend
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Ratio Trend
              </Typography>
              <Box height={250}>
                <Line data={ratioChartData} options={chartOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Daily Interactions
              </Typography>
              <Box height={250}>
                <Bar data={interactionsChartData} options={chartOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Insights */}
      <Grid container spacing={3}>
        {/* Highlights */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <CheckCircleIcon color="success" />
                <Typography variant="h6">Highlights</Typography>
              </Box>
              {report?.highlights?.length > 0 ? (
                <List dense>
                  {report.highlights.map((item, idx) => (
                    <ListItem key={idx}>
                      <ListItemIcon>
                        <CheckCircleIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={item} />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">
                  Keep logging to see your highlights
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Areas for Improvement */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <WarningIcon color="warning" />
                <Typography variant="h6">Areas to Improve</Typography>
              </Box>
              {report?.improvements?.length > 0 ? (
                <List dense>
                  {report.improvements.map((item, idx) => (
                    <ListItem key={idx}>
                      <ListItemIcon>
                        <WarningIcon color="warning" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={item} />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">
                  No major concerns this week
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recommendations */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <LightbulbIcon color="primary" />
                <Typography variant="h6">Recommendations</Typography>
              </Box>
              <Grid container spacing={2}>
                {report?.recommendations?.map((rec, idx) => (
                  <Grid item xs={12} md={4} key={idx}>
                    <Box
                      p={2}
                      borderRadius={2}
                      bgcolor={
                        rec.priority === 'high'
                          ? 'error.light'
                          : rec.priority === 'medium'
                          ? 'warning.light'
                          : 'grey.100'
                      }
                    >
                      <Chip
                        label={rec.priority}
                        size="small"
                        color={
                          rec.priority === 'high'
                            ? 'error'
                            : rec.priority === 'medium'
                            ? 'warning'
                            : 'default'
                        }
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="body2">{rec.text}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Reports;
