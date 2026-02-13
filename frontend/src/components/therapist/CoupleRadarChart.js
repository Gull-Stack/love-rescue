import React from 'react';
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
import { Box, Typography } from '@mui/material';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const CoupleRadarChart = ({ partnerA, partnerB, labels = [], height = 350 }) => {
  if (!labels.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height, color: 'text.secondary' }}>
        <Typography>No comparison data yet</Typography>
      </Box>
    );
  }

  const data = {
    labels,
    datasets: [
      {
        label: partnerA?.name || 'Partner A',
        data: partnerA?.scores || [],
        backgroundColor: 'rgba(233, 30, 99, 0.15)',
        borderColor: '#e91e63',
        pointBackgroundColor: '#e91e63',
        pointHitRadius: 10,
      },
      {
        label: partnerB?.name || 'Partner B',
        data: partnerB?.scores || [],
        backgroundColor: 'rgba(156, 39, 176, 0.15)',
        borderColor: '#9c27b0',
        pointBackgroundColor: '#9c27b0',
        pointHitRadius: 10,
      },
    ],
  };

  return (
    <Box sx={{ height, position: 'relative' }}>
      <Radar
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              beginAtZero: true,
              max: 100,
              ticks: { stepSize: 20 },
            },
          },
          plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true } },
          },
        }}
      />
    </Box>
  );
};

export default CoupleRadarChart;
