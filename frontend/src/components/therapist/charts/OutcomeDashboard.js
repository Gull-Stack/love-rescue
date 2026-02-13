import React, { useMemo } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Box, Typography, Skeleton, Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DashboardIcon from '@mui/icons-material/Dashboard';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend, Filler);

const StatCard = ({ label, value, color, children }) => (
  <Box sx={{ textAlign: 'center', p: 2 }}>
    <Typography variant="caption" color="text.secondary" fontWeight={500}>{label}</Typography>
    {value !== undefined && (
      <Typography variant="h4" fontWeight={700} sx={{ color, mt: 0.5 }}>{value}</Typography>
    )}
    {children}
  </Box>
);

const OutcomeDashboard = ({
  outcomeData = {},
  loading = false,
}) => {
  const theme = useTheme();
  const {
    averageScores = [],
    improvementDistribution = [],
    retentionRate = 0,
    alertTrend = [],
  } = outcomeData;

  const baseTooltip = {
    backgroundColor: 'rgba(255,255,255,0.95)',
    titleColor: theme.palette.text.primary,
    bodyColor: theme.palette.text.secondary,
    borderColor: theme.palette.divider,
    borderWidth: 1,
    padding: 10,
  };

  const barData = useMemo(() => {
    if (!averageScores.length) return null;
    return {
      data: {
        labels: averageScores.map((s) => s.label),
        datasets: [{
          label: 'Avg Score',
          data: averageScores.map((s) => s.value),
          backgroundColor: averageScores.map((_, i) =>
            i % 2 === 0 ? theme.palette.primary.main + 'CC' : theme.palette.secondary.main + 'CC'
          ),
          borderRadius: 6,
          barThickness: 28,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: baseTooltip },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, color: theme.palette.text.secondary } },
          y: { beginAtZero: true, grid: { color: theme.palette.divider + '30' }, ticks: { font: { size: 10 }, color: theme.palette.text.secondary } },
        },
      },
    };
  }, [averageScores, theme]);

  const histData = useMemo(() => {
    if (!improvementDistribution.length) return null;
    return {
      data: {
        labels: improvementDistribution.map((d) => d.range),
        datasets: [{
          label: 'Clients',
          data: improvementDistribution.map((d) => d.count),
          backgroundColor: improvementDistribution.map((d) =>
            d.value >= 0 ? theme.palette.success.main + 'CC' : theme.palette.error.main + 'CC'
          ),
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: baseTooltip },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 9 }, color: theme.palette.text.secondary } },
          y: { beginAtZero: true, grid: { color: theme.palette.divider + '30' }, ticks: { font: { size: 10 }, stepSize: 1, color: theme.palette.text.secondary } },
        },
      },
    };
  }, [improvementDistribution, theme]);

  const alertData = useMemo(() => {
    if (!alertTrend.length) return null;
    return {
      data: {
        labels: alertTrend.map((a) => a.date),
        datasets: [{
          label: 'Alerts',
          data: alertTrend.map((a) => a.count),
          borderColor: theme.palette.error.main,
          backgroundColor: theme.palette.error.main + '15',
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: baseTooltip },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 9 }, color: theme.palette.text.secondary, maxTicksLimit: 8 } },
          y: { beginAtZero: true, grid: { color: theme.palette.divider + '30' }, ticks: { font: { size: 10 }, stepSize: 1, color: theme.palette.text.secondary } },
        },
      },
    };
  }, [alertTrend, theme]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} md={6} key={i}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  const isEmpty = !averageScores.length && !improvementDistribution.length && !alertTrend.length && !retentionRate;

  if (isEmpty) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }} role="img" aria-label="No outcome data available">
        <DashboardIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        <Typography variant="h6" color="text.secondary">No caseload data yet</Typography>
        <Typography variant="body2" color="text.secondary">Outcomes will populate as clients progress through therapy.</Typography>
      </Box>
    );
  }

  const retColor = retentionRate >= 80 ? theme.palette.success.main : retentionRate >= 60 ? theme.palette.warning.main : theme.palette.error.main;

  return (
    <Box sx={{ width: '100%' }} role="img" aria-label="Caseload outcome dashboard">
      <Grid container spacing={3}>
        {/* Average Scores */}
        {barData && (
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Average Scores</Typography>
            <Box sx={{ height: 220 }}>
              <Bar data={barData.data} options={barData.options} />
            </Box>
          </Grid>
        )}

        {/* Retention Gauge */}
        {retentionRate > 0 && (
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Retention Rate</Typography>
            <Box sx={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <Doughnut
                data={{
                  labels: ['Retained', 'Dropped'],
                  datasets: [{
                    data: [retentionRate, 100 - retentionRate],
                    backgroundColor: [retColor, theme.palette.divider + '40'],
                    borderWidth: 0,
                    cutout: '75%',
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: baseTooltip,
                  },
                }}
              />
              <Box sx={{ position: 'absolute', textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={700} sx={{ color: retColor }}>{retentionRate}%</Typography>
              </Box>
            </Box>
          </Grid>
        )}

        {/* Improvement Distribution */}
        {histData && (
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Client Improvement</Typography>
            <Box sx={{ height: 200 }}>
              <Bar data={histData.data} options={histData.options} />
            </Box>
          </Grid>
        )}

        {/* Alert Trend */}
        {alertData && (
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Alert Volume</Typography>
            <Box sx={{ height: 200 }}>
              <Line data={alertData.data} options={alertData.options} />
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default OutcomeDashboard;
