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

const InsightText = ({ text }) => {
  const [expanded, setExpanded] = useState(false);
  const MAX_CHARS = 120;
  const isLong = text && text.length > MAX_CHARS;
  const displayText = isLong && !expanded ? text.slice(0, MAX_CHARS).trim() + '...' : text;

  return (
    <Box>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
        {displayText}
      </Typography>
      {isLong && (
        <Button
          size="small"
          onClick={() => setExpanded(!expanded)}
          sx={{ mt: 0.5, p: 0, minWidth: 0, textTransform: 'none', fontWeight: 'bold' }}
        >
          {expanded ? 'Show less' : 'Read more'}
        </Button>
      )}
    </Box>
  );
};

const DailyInsight = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState(null);
  useEffect(() => {
    fetchInsight();
  }, []);

  const fetchInsight = async () => {
    try {
      const res = await insightsApi.getDaily();
      setInsight(res.data.insight);
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
        <InsightText text={insight.text} />
      </CardContent>
    </Card>
  );
};

export default DailyInsight;
