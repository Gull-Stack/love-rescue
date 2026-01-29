import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Skeleton,
  Box,
} from '@mui/material';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import { insightsApi } from '../../services/api';

const DailyInsight = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState(null);
  const [position, setPosition] = useState(null);

  useEffect(() => {
    fetchInsight();
  }, []);

  const fetchInsight = async () => {
    try {
      const res = await insightsApi.getDaily();
      setInsight(res.data.insight);
      setPosition(res.data.position);
    } catch (err) {
      // Silently fail — component just won't render
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card sx={{ bgcolor: 'secondary.light' }}>
        <CardContent>
          <Skeleton variant="text" width="40%" height={32} />
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="90%" />
          <Skeleton variant="rectangular" width={140} height={36} sx={{ mt: 2, borderRadius: 1 }} />
        </CardContent>
      </Card>
    );
  }

  if (!insight) {
    return null;
  }

  return (
    <Card sx={{ bgcolor: 'secondary.light' }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <LightbulbIcon sx={{ color: 'secondary.dark' }} />
          <Typography variant="h6" sx={{ color: 'secondary.dark' }}>
            Daily Insight
          </Typography>
          <Chip
            label={`Week ${insight.week}, Day ${insight.day}`}
            size="small"
            variant="outlined"
            sx={{ ml: 'auto' }}
          />
          {insight.isPersonalized && (
            <Chip label="Personalized" size="small" color="secondary" />
          )}
        </Box>
        <Typography variant="body1" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
          {insight.text}
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          size="small"
          onClick={() => navigate('/daily')}
        >
          Reflect on This
        </Button>
      </CardContent>
    </Card>
  );
};

export default DailyInsight;
