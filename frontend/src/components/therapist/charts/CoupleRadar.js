import React, { useMemo } from 'react';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Box, Typography, Skeleton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PeopleIcon from '@mui/icons-material/People';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const CoupleRadar = ({
  partner1Scores = {},
  partner2Scores = {},
  labels = [],
  partner1Name = 'Partner A',
  partner2Name = 'Partner B',
  loading = false,
}) => {
  const theme = useTheme();

  const { data, options } = useMemo(() => {
    const cats = labels.length ? labels : Object.keys(partner1Scores);
    if (!cats.length) return { data: null, options: null };

    const p1 = cats.map((k) => partner1Scores[k] ?? 0);
    const p2 = cats.map((k) => partner2Scores[k] ?? 0);

    return {
      data: {
        labels: cats,
        datasets: [
          {
            label: partner1Name,
            data: p1,
            borderColor: theme.palette.primary.main,
            backgroundColor: theme.palette.primary.main + '25',
            pointBackgroundColor: theme.palette.primary.main,
            pointRadius: 4,
            pointHoverRadius: 7,
            borderWidth: 2,
          },
          {
            label: partner2Name,
            data: p2,
            borderColor: theme.palette.secondary.main,
            backgroundColor: theme.palette.secondary.main + '25',
            pointBackgroundColor: theme.palette.secondary.main,
            pointRadius: 4,
            pointHoverRadius: 7,
            borderWidth: 2,
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
            callbacks: {
              afterBody: (items) => {
                if (items.length >= 2) {
                  const gap = Math.abs(items[0].raw - items[1].raw);
                  return `\nGap: ${gap.toFixed(1)}`;
                }
                return '';
              },
            },
          },
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 10,
            ticks: {
              stepSize: 2,
              font: { size: 10 },
              color: theme.palette.text.secondary,
              backdropColor: 'transparent',
            },
            pointLabels: {
              font: { family: theme.typography.fontFamily, size: 11 },
              color: theme.palette.text.primary,
            },
            grid: { color: theme.palette.divider + '40' },
            angleLines: { color: theme.palette.divider + '30' },
          },
        },
      },
    };
  }, [partner1Scores, partner2Scores, labels, partner1Name, partner2Name, theme]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="circular" width={280} height={280} sx={{ mx: 'auto' }} />
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }} role="img" aria-label="No couple comparison data">
        <PeopleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        <Typography variant="h6" color="text.secondary">No comparison data yet</Typography>
        <Typography variant="body2" color="text.secondary">Both partners need to complete assessments first.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }} role="img" aria-label={`Radar comparison chart for ${partner1Name} and ${partner2Name}`}>
      <Box sx={{ height: { xs: 280, md: 380 }, position: 'relative' }}>
        <Radar data={data} options={options} />
      </Box>
    </Box>
  );
};

export default CoupleRadar;
