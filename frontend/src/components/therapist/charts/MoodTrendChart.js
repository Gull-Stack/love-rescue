import React, { useMemo, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Box, Typography, Skeleton, Switch, FormControlLabel } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MoodIcon from '@mui/icons-material/Mood';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const computeMovingAverage = (data, window = 7) => {
  return data.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1).filter((v) => v != null);
    return slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : null;
  });
};

const MoodTrendChart = ({
  moodData = [],
  crisisEvents = [],
  loading = false,
}) => {
  const theme = useTheme();
  const chartRef = useRef(null);
  const [smoothed, setSmoothed] = useState(false);

  const { data, options } = useMemo(() => {
    if (!moodData.length) return { data: null, options: null };

    const dates = moodData.map((d) => d.date);
    const values = moodData.map((d) => d.score);
    const displayValues = smoothed ? computeMovingAverage(values) : values;

    const crisisSet = new Set(crisisEvents.map((e) => e.date));

    // Color segments based on value
    const getColor = (val) => {
      if (val == null) return theme.palette.text.secondary;
      if (val >= 7) return theme.palette.success.main;
      if (val >= 4) return theme.palette.warning.main;
      return theme.palette.error.main;
    };

    return {
      data: {
        labels: dates,
        datasets: [
          {
            label: smoothed ? 'Mood (7-day avg)' : 'Mood Score',
            data: displayValues,
            fill: true,
            borderColor: (ctx) => {
              const chart = ctx.chart;
              const { ctx: canvasCtx, chartArea } = chart;
              if (!chartArea) return theme.palette.primary.main;
              const gradient = canvasCtx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
              gradient.addColorStop(0, theme.palette.error.main);
              gradient.addColorStop(0.4, theme.palette.warning.main);
              gradient.addColorStop(1, theme.palette.success.main);
              return gradient;
            },
            backgroundColor: (ctx) => {
              const chart = ctx.chart;
              const { ctx: canvasCtx, chartArea } = chart;
              if (!chartArea) return theme.palette.primary.main + '20';
              const gradient = canvasCtx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
              gradient.addColorStop(0, theme.palette.error.main + '10');
              gradient.addColorStop(0.4, theme.palette.warning.main + '15');
              gradient.addColorStop(1, theme.palette.success.main + '20');
              return gradient;
            },
            pointBackgroundColor: dates.map((d, i) =>
              crisisSet.has(d) ? theme.palette.error.main : getColor(displayValues[i])
            ),
            pointRadius: dates.map((d) => (crisisSet.has(d) ? 8 : 3)),
            pointHoverRadius: 7,
            tension: 0.4,
            borderWidth: 2.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(255,255,255,0.95)',
            titleColor: theme.palette.text.primary,
            bodyColor: theme.palette.text.secondary,
            borderColor: theme.palette.divider,
            borderWidth: 1,
            padding: 12,
            callbacks: {
              afterBody: (items) => {
                const date = items[0].label;
                if (crisisSet.has(date)) {
                  const ev = crisisEvents.find((e) => e.date === date);
                  return `\n⚠ Crisis: ${ev?.label || 'Event flagged'}`;
                }
                return '';
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: theme.typography.fontFamily, size: 11 },
              color: theme.palette.text.secondary,
              maxRotation: 45,
              maxTicksLimit: 15,
            },
          },
          y: {
            min: 0,
            max: 10,
            grid: { color: theme.palette.divider + '40' },
            ticks: {
              font: { family: theme.typography.fontFamily, size: 11 },
              color: theme.palette.text.secondary,
              stepSize: 2,
            },
          },
        },
      },
    };
  }, [moodData, crisisEvents, smoothed, theme]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={180} height={32} />
        <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2, mt: 2 }} />
      </Box>
    );
  }

  if (!moodData.length) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }} role="img" aria-label="No mood data available">
        <MoodIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        <Typography variant="h6" color="text.secondary">No mood data yet</Typography>
        <Typography variant="body2" color="text.secondary">Mood entries will be visualized as they're logged.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }} role="img" aria-label="Mood trend chart over time">
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
        <FormControlLabel
          control={<Switch size="small" checked={smoothed} onChange={(e) => setSmoothed(e.target.checked)} />}
          label={<Typography variant="caption" color="text.secondary">7-day average</Typography>}
        />
      </Box>
      <Box sx={{ height: { xs: 240, md: 320 }, position: 'relative' }}>
        <Line ref={chartRef} data={data} options={options} />
      </Box>
    </Box>
  );
};

export default MoodTrendChart;
