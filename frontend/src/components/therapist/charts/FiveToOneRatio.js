import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Box, Typography, Skeleton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ThumbsUpDownIcon from '@mui/icons-material/ThumbsUpDown';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const getRatioColor = (ratio) => {
  if (ratio >= 5) return '#4caf50';
  if (ratio >= 3) return '#ff9800';
  return '#f44336';
};

const getRatioLabel = (ratio) => {
  if (ratio >= 5) return 'Healthy';
  if (ratio >= 3) return 'At Risk';
  return 'Concerning';
};

const FiveToOneRatio = ({
  currentRatio = 0,
  history = [],
  loading = false,
}) => {
  const theme = useTheme();

  const ratioColor = getRatioColor(currentRatio);
  const ratioLabel = getRatioLabel(currentRatio);
  const positiveWidth = currentRatio > 0 ? (currentRatio / (currentRatio + 1)) * 100 : 0;

  const chartData = useMemo(() => {
    if (!history.length) return null;

    return {
      data: {
        labels: history.map((h) => h.date),
        datasets: [
          {
            label: 'Ratio',
            data: history.map((h) => h.ratio),
            borderColor: theme.palette.primary.main,
            backgroundColor: theme.palette.primary.main + '15',
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: history.map((h) => getRatioColor(h.ratio)),
          },
          // 5:1 threshold line
          {
            label: '5:1 Goal',
            data: history.map(() => 5),
            borderColor: theme.palette.success.main + '60',
            borderDash: [5, 5],
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 12,
              font: { family: theme.typography.fontFamily, size: 11 },
              color: theme.palette.text.secondary,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(255,255,255,0.95)',
            titleColor: theme.palette.text.primary,
            bodyColor: theme.palette.text.secondary,
            borderColor: theme.palette.divider,
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (ctx) => {
                if (ctx.datasetIndex === 1) return '5:1 Goal';
                return `Ratio: ${ctx.raw.toFixed(1)}:1 — ${getRatioLabel(ctx.raw)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 }, color: theme.palette.text.secondary, maxRotation: 45 },
          },
          y: {
            beginAtZero: true,
            grid: { color: theme.palette.divider + '30' },
            ticks: { font: { size: 10 }, color: theme.palette.text.secondary },
          },
        },
      },
    };
  }, [history, theme]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={150} height={40} />
        <Skeleton variant="rectangular" height={30} sx={{ borderRadius: 2, mt: 1 }} />
        <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2, mt: 2 }} />
      </Box>
    );
  }

  if (!currentRatio && !history.length) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }} role="img" aria-label="No interaction ratio data">
        <ThumbsUpDownIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        <Typography variant="h6" color="text.secondary">No ratio data yet</Typography>
        <Typography variant="body2" color="text.secondary">The 5:1 positive-to-negative interaction ratio will appear here.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }} role="img" aria-label={`Gottman 5 to 1 ratio: current ratio ${currentRatio.toFixed(1)} to 1, ${ratioLabel}`}>
      {/* Current ratio display */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Typography variant="h3" fontWeight={700} sx={{ color: ratioColor }}>
          {currentRatio.toFixed(1)}:1
        </Typography>
        <Typography variant="body2" sx={{ color: ratioColor, fontWeight: 500 }}>
          {ratioLabel}
        </Typography>
      </Box>

      {/* Ratio bar */}
      <Box sx={{ position: 'relative', height: 24, borderRadius: 12, overflow: 'hidden', bgcolor: theme.palette.error.light + '30', mb: 3 }}>
        <Box
          sx={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${positiveWidth}%`,
            bgcolor: ratioColor,
            borderRadius: 12,
            transition: 'width 0.6s ease, background-color 0.3s ease',
            minWidth: positiveWidth > 0 ? 8 : 0,
          }}
        />
        {/* Zone markers */}
        {[3, 5].map((threshold) => {
          const pct = (threshold / (threshold + 1)) * 100;
          return (
            <Box key={threshold} sx={{
              position: 'absolute', left: `${pct}%`, top: 0, bottom: 0,
              width: 1, bgcolor: theme.palette.text.secondary, opacity: 0.3,
            }} />
          );
        })}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: -2, mb: 2 }}>
        <Typography variant="caption" color="error.main">{'<3:1'}</Typography>
        <Typography variant="caption" color="warning.main">3:1–5:1</Typography>
        <Typography variant="caption" color="success.main">{'≥5:1'}</Typography>
      </Box>

      {/* Historical trend */}
      {chartData && (
        <Box sx={{ height: { xs: 180, md: 220 } }}>
          <Line data={chartData.data} options={chartData.options} />
        </Box>
      )}
    </Box>
  );
};

export default FiveToOneRatio;
