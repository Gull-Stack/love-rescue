import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Snackbar,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import ShareIcon from '@mui/icons-material/Share';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { transformationApi } from '../../services/api';

const TransformationMirror = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    document.title = 'Transformation Mirror | Love Rescue';
    fetchTransformation();
  }, []);

  const fetchTransformation = async () => {
    try {
      const res = await transformationApi.get();
      setData(res.data);
    } catch {
      setError('Failed to load transformation data');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const shareText = data?.shifts?.length > 0
      ? `I've been working on my relationship for ${data.daysActive} days and noticed real growth: ${data.shifts.map((s) => s.label).join(', ')}. #LoveRescue`
      : `I've been investing in my relationship for ${data.daysActive} days. Growth is happening! #LoveRescue`;

    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
      } catch {
        // Share cancelled
      }
    } else {
      navigator.clipboard.writeText(shareText);
      setShared(true);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh" flexDirection="column" gap={2}>
        <CircularProgress size={48} />
        <Typography color="text.secondary">Analyzing your growth...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 2 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
        <Button onClick={() => navigate('/reports')} startIcon={<ArrowBackIcon />} sx={{ mt: 2 }}>
          Back to Reports
        </Button>
      </Box>
    );
  }

  // Not enough data yet
  if (!data?.available) {
    return (
      <Box sx={{ pb: 4, maxWidth: 600, mx: 'auto' }}>
        <Box display="flex" alignItems="center" gap={1} mb={3}>
          <IconButton onClick={() => navigate('/reports')} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" fontWeight="bold">
            Transformation Mirror
          </Typography>
        </Box>

        <Card sx={{ textAlign: 'center', p: 4, borderRadius: 3 }}>
          <CompareArrowsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Your Mirror Is Forming
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {data?.reason === 'not_enough_days'
              ? `You need ${data.daysRequired - data.daysActive} more days of journaling to see your transformation. Keep going!`
              : 'Start logging daily entries to track your personal growth over time.'}
          </Typography>
          {data?.daysActive > 0 && (
            <Chip
              icon={<CalendarTodayIcon />}
              label={`${data.daysActive} days active`}
              color="primary"
              variant="outlined"
            />
          )}
          <Box sx={{ mt: 3 }}>
            <Button variant="contained" onClick={() => navigate('/daily')} sx={{ borderRadius: 2 }}>
              Log Today
            </Button>
          </Box>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4, maxWidth: 600, mx: 'auto' }}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <IconButton onClick={() => navigate('/reports')} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" fontWeight="bold" flex={1}>
          Transformation Mirror
        </Typography>
        <IconButton onClick={handleShare} size="small">
          <ShareIcon />
        </IconButton>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {data.daysActive} days of growth
      </Typography>

      {/* THEN vs NOW Comparison */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        {/* THEN */}
        <Card
          sx={{
            flex: 1,
            borderRadius: 3,
            border: '2px solid',
            borderColor: 'grey.300',
            background: 'linear-gradient(180deg, #f5f5f5 0%, #ffffff 100%)',
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Chip label="THEN" size="small" sx={{ mb: 1, bgcolor: 'grey.300', fontWeight: 'bold' }} />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              First {data.earlyPeriod.entryCount} entries
            </Typography>
            {data.thenQuote ? (
              <Typography
                variant="body2"
                sx={{
                  fontStyle: 'italic',
                  color: 'text.secondary',
                  fontSize: '0.8rem',
                  lineHeight: 1.5,
                }}
              >
                "{data.thenQuote}"
              </Typography>
            ) : (
              <Typography variant="body2" color="text.disabled">
                No journal text found
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* NOW */}
        <Card
          sx={{
            flex: 1,
            borderRadius: 3,
            border: '2px solid',
            borderColor: 'success.main',
            background: 'linear-gradient(180deg, #e8f5e9 0%, #ffffff 100%)',
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Chip label="NOW" size="small" color="success" sx={{ mb: 1, fontWeight: 'bold' }} />
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Last {data.recentPeriod.entryCount} entries
            </Typography>
            {data.nowQuote ? (
              <Typography
                variant="body2"
                sx={{
                  fontStyle: 'italic',
                  color: 'text.primary',
                  fontSize: '0.8rem',
                  lineHeight: 1.5,
                }}
              >
                "{data.nowQuote}"
              </Typography>
            ) : (
              <Typography variant="body2" color="text.disabled">
                No journal text found
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Detected Shifts */}
      {data.shifts.length > 0 ? (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>
            Detected Growth Patterns
          </Typography>
          {data.shifts.map((shift, i) => (
            <Card
              key={i}
              sx={{
                mb: 1.5,
                borderRadius: 2,
                borderLeft: '4px solid',
                borderLeftColor: shift.improvement ? 'success.main' : 'warning.main',
              }}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                  <TrendingUpIcon fontSize="small" color="success" />
                  <Typography variant="subtitle2" fontWeight="bold">
                    {shift.label}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {shift.description}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        <Card sx={{ mb: 3, borderRadius: 2, bgcolor: 'action.hover' }}>
          <CardContent sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Keep journaling — your growth patterns will appear as your language evolves.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Ratio Comparison */}
      {data.ratios.then && data.ratios.now && (
        <Card sx={{ mb: 3, borderRadius: 2 }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Positive-to-Negative Ratio
            </Typography>
            <Box display="flex" justifyContent="center" alignItems="center" gap={3}>
              <Box textAlign="center">
                <Typography variant="caption" color="text.secondary">THEN</Typography>
                <Typography variant="h5" color="text.secondary">{data.ratios.then}</Typography>
              </Box>
              <CompareArrowsIcon color="primary" />
              <Box textAlign="center">
                <Typography variant="caption" color="text.secondary">NOW</Typography>
                <Typography variant="h5" color="success.main" fontWeight="bold">{data.ratios.now}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Expert Quote */}
      {data.expertQuote && (
        <Card
          sx={{
            borderRadius: 3,
            background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fbcfe8 100%)',
            border: '1px solid #f9a8d4',
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Box display="flex" gap={1} mb={1}>
              <FormatQuoteIcon sx={{ color: '#be185d', transform: 'rotate(180deg)' }} />
            </Box>
            <Typography
              variant="body2"
              sx={{ fontStyle: 'italic', color: '#831843', mb: 1, lineHeight: 1.6 }}
            >
              {data.expertQuote.quote}
            </Typography>
            <Typography variant="caption" sx={{ color: '#9d174d', fontWeight: 'bold' }}>
              — {data.expertQuote.expert}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Share Snackbar */}
      <Snackbar
        open={shared}
        autoHideDuration={3000}
        onClose={() => setShared(false)}
        message="Copied to clipboard!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default TransformationMirror;
