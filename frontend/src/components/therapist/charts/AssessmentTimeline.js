import React, { useMemo, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Box, Typography, Skeleton, Chip, Stack } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import TimelineIcon from '@mui/icons-material/Timeline';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const EVENT_ICONS = {
  crisis: { color: '#f44336', symbol: '⚠' },
  milestone: { color: '#4caf50', symbol: '★' },
  phase: { color: '#2196f3', symbol: '◆' },
};

const ASSESSMENT_COLORS = [
  '#e91e63', '#9c27b0', '#2196f3', '#4caf50', '#ff9800',
  '#00bcd4', '#795548', '#607d8b', '#ff5722', '#3f51b5',
];

const AssessmentTimeline = ({
  assessmentHistory = [],
  selectedAssessments = [],
  events = [],
  loading = false,
}) => {
  const theme = useTheme();
  const chartRef = useRef(null);

  const { data, options } = useMemo(() => {
    if (!assessmentHistory.length) return { data: null, options: null };

    const allDates = [...new Set(assessmentHistory.map((h) => h.date))].sort();

    const assessmentTypes = selectedAssessments.length
      ? selectedAssessments
      : [...new Set(assessmentHistory.map((h) => h.type))];

    const datasets = assessmentTypes.map((type, i) => {
      const color = ASSESSMENT_COLORS[i % ASSESSMENT_COLORS.length];
      const entries = assessmentHistory.filter((h) => h.type === type);
      const dataMap = Object.fromEntries(entries.map((e) => [e.date, e.score]));

      return {
        label: type,
        data: allDates.map((d) => dataMap[d] ?? null),
        borderColor: color,
        backgroundColor: color + '20',
        pointBackgroundColor: color,
        pointRadius: 4,
        pointHoverRadius: 7,
        tension: 0.3,
        spanGaps: true,
        borderWidth: 2,
      };
    });

    // Add event markers as scatter points
    if (events.length) {
      const eventData = allDates.map((d) => {
        const ev = events.find((e) => e.date === d);
        return ev ? ev.yPosition ?? 50 : null;
      });

      datasets.push({
        label: 'Events',
        data: eventData,
        pointRadius: allDates.map((d) => (events.find((e) => e.date === d) ? 10 : 0)),
        pointBackgroundColor: allDates.map((d) => {
          const ev = events.find((e) => e.date === d);
          return ev ? EVENT_ICONS[ev.type]?.color || '#757575' : 'transparent';
        }),
        pointStyle: 'triangle',
        showLine: false,
        borderWidth: 0,
      });
    }

    return {
      data: { labels: allDates, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 16,
              font: { family: theme.typography.fontFamily, size: 12 },
              color: theme.palette.text.secondary,
            },
          },
          tooltip: {
            backgroundColor: 'rgba(255,255,255,0.95)',
            titleColor: theme.palette.text.primary,
            bodyColor: theme.palette.text.secondary,
            borderColor: theme.palette.divider,
            borderWidth: 1,
            padding: 12,
            titleFont: { weight: 600 },
            callbacks: {
              title: (items) => {
                const date = new Date(items[0].label);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              },
              afterBody: (items) => {
                const date = items[0].label;
                const ev = events.find((e) => e.date === date);
                return ev ? `\n${EVENT_ICONS[ev.type]?.symbol || '•'} ${ev.label}` : '';
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
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: theme.palette.divider + '40' },
            ticks: {
              font: { family: theme.typography.fontFamily, size: 11 },
              color: theme.palette.text.secondary,
            },
          },
        },
      },
    };
  }, [assessmentHistory, selectedAssessments, events, theme]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={32} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2, mt: 2 }} />
      </Box>
    );
  }

  if (!assessmentHistory.length) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }} role="img" aria-label="No assessment data available">
        <TimelineIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        <Typography variant="h6" color="text.secondary">No assessment data yet</Typography>
        <Typography variant="body2" color="text.secondary">Scores will appear here as assessments are completed.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }} role="img" aria-label="Assessment scores timeline chart">
      {events.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
          {Object.entries(EVENT_ICONS).map(([type, { color, symbol }]) => (
            <Chip key={type} label={`${symbol} ${type}`} size="small" sx={{ bgcolor: color + '15', color, fontSize: 11 }} />
          ))}
        </Stack>
      )}
      <Box sx={{ height: { xs: 250, md: 350 }, position: 'relative' }}>
        <Line ref={chartRef} data={data} options={options} />
      </Box>
    </Box>
  );
};

export default AssessmentTimeline;
