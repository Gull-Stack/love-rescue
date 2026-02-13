import React from 'react';
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
} from 'chart.js';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const AssessmentChart = ({ assessments = [], height = 300 }) => {
  const theme = useTheme();
  const ASSESSMENT_COLORS = [
    theme.palette.primary.main, theme.palette.secondary.main,
    theme.palette.info.main, theme.palette.success.main,
    theme.palette.warning.main, theme.palette.error.main,
    theme.palette.primary.dark, theme.palette.secondary.dark,
    theme.palette.info.dark, theme.palette.success.dark,
    theme.palette.warning.dark, theme.palette.error.dark,
    theme.palette.primary.light,
  ];
  if (!assessments.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height, color: 'text.secondary' }}>
        <Typography>No assessment data yet</Typography>
      </Box>
    );
  }

  // assessments: [{ type, label, scores: [{ date, value }] }]
  const allDates = [...new Set(assessments.flatMap(a => a.scores.map(s => s.date)))].sort();
  const labels = allDates.map(d => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));

  const datasets = assessments.map((a, i) => ({
    label: a.label || a.type,
    data: allDates.map(d => {
      const entry = a.scores.find(s => s.date === d);
      return entry ? entry.value : null;
    }),
    borderColor: ASSESSMENT_COLORS[i % ASSESSMENT_COLORS.length],
    backgroundColor: ASSESSMENT_COLORS[i % ASSESSMENT_COLORS.length] + '22',
    tension: 0.3,
    spanGaps: true,
    pointRadius: 4,
    pointHitRadius: 10,
  }));

  return (
    <Box sx={{ height, position: 'relative' }} role="img" aria-label="Assessment scores over time chart">
      <Line
        data={{ labels, datasets }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
          },
          scales: {
            y: { beginAtZero: true, max: 100, title: { display: true, text: 'Score' } },
          },
        }}
      />
    </Box>
  );
};

export default AssessmentChart;
