/**
 * Weekly Summary Page (Improvement 15)
 * Full screen week-in-review with stats, narrative, and expert citations
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Snackbar,
  Alert,
  keyframes,
} from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import api from '../../services/api';

const fillAnimation = keyframes`
  from { stroke-dashoffset: 283; }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// Progress Ring sub-component (matches ProgressRings pattern)
const SummaryRing = ({ value, max, size = 72, strokeWidth = 7, color, label, delay = 0 }) => {
  const [animated, setAnimated] = useState(false);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const strokeDashoffset = circumference * (1 - progress);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Box sx={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e0e0e0"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animated ? strokeDashoffset : circumference}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <Typography variant="subtitle2" fontWeight="bold" sx={{ lineHeight: 1, color }}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
            /{max}
          </Typography>
        </Box>
      </Box>
      <Typography
        variant="caption"
        fontWeight="medium"
        color="text.secondary"
        sx={{ textAlign: 'center', maxWidth: 65, fontSize: '0.7rem' }}
      >
        {label}
      </Typography>
    </Box>
  );
};

const WeeklySummary = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.title = 'Weekly Review | Love Rescue';

    const fetchSummary = async () => {
      try {
        const res = await api.get('/weekly-summary');
        setData(res.data);
      } catch {
        setError('Failed to load weekly summary');
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  const handleShare = async () => {
    if (!data) return;

    const shareText = [
      `My Week in Review (Love Rescue)`,
      `---`,
      `Streak: ${data.stats.streakDays} days`,
      `Techniques: ${data.stats.techniquesUsed.join(', ') || 'None'}`,
      `Appreciations: ${data.stats.appreciationsSent}`,
      `Ratio: ${data.stats.avgRatio}:1`,
      `---`,
      `"${data.expertQuote.quote}" — ${data.expertQuote.expert}`,
    ].join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Weekly Review', text: shareText });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
    } catch {
      // Ignore
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh" flexDirection="column" gap={2}>
        <CircularProgress size={48} />
        <Typography color="text.secondary">Building your weekly review...</Typography>
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'No data available'}</Alert>
        <Button variant="contained" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  const weekLabel = `${new Date(data.weekStart).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} – ${new Date(data.weekEnd).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })}`;

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', pb: 4 }}>
      {/* Hero header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          mx: -3,
          mt: -3,
          px: 3,
          pt: 4,
          pb: 3,
          mb: 3,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Shimmer overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.05) 50%, transparent 70%)',
            backgroundSize: '200% 100%',
            animation: `${shimmer} 4s linear infinite`,
            pointerEvents: 'none',
          }}
        />

        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <CalendarTodayIcon sx={{ fontSize: 18, opacity: 0.8 }} />
          <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 'bold', letterSpacing: 0.5 }}>
            WEEKLY REVIEW
          </Typography>
        </Box>

        <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
          Your Week in Review
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          {weekLabel}
        </Typography>
      </Box>

      {/* Key stats row */}
      <Card sx={{ mb: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 1,
              textAlign: 'center',
            }}
          >
            <Box>
              <Typography variant="h5" fontWeight="bold" color="primary.main">
                {data.stats.streakDays}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Streak
              </Typography>
            </Box>
            <Box>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {data.stats.techniquesUsed.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Techniques
              </Typography>
            </Box>
            <Box>
              <Typography variant="h5" fontWeight="bold" sx={{ color: '#f59e0b' }}>
                {data.stats.appreciationsSent}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Appreciations
              </Typography>
            </Box>
            <Box>
              <Typography variant="h5" fontWeight="bold" color="error.main">
                {data.stats.conflictDays}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Conflicts
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Progress Rings - Dimension breakdown */}
      <Card sx={{ mb: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
            Dimension Scores
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 1 }}>
            <SummaryRing value={Math.round(data.dimensions.appreciation)} max={100} color="#ff9800" label="Appreciation" delay={0} />
            <SummaryRing value={Math.round(data.dimensions.consistency)} max={100} color="#e91e63" label="Consistency" delay={150} />
            <SummaryRing value={Math.round(data.dimensions.vulnerability)} max={100} color="#9c27b0" label="Vulnerability" delay={300} />
            <SummaryRing value={Math.round(data.dimensions.communication)} max={100} color="#4caf50" label="Communication" delay={450} />
          </Box>

          {/* Dominant dimension chip */}
          <Box display="flex" justifyContent="center" mt={2}>
            <Chip
              label={`Strongest: ${data.dominantDimension.charAt(0).toUpperCase() + data.dominantDimension.slice(1)}`}
              color="primary"
              variant="outlined"
              size="small"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Narrative */}
      <Card sx={{ mb: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1.5 }}>
            Your Story This Week
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.7, color: 'text.secondary', mb: 2 }}>
            {data.narrative}
          </Typography>

          {/* Techniques used */}
          {data.stats.techniquesUsed.length > 0 && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                Techniques You Used
              </Typography>
              <Box display="flex" gap={0.5} flexWrap="wrap">
                {data.stats.techniquesUsed.map((t) => (
                  <Chip key={t} label={t} size="small" variant="outlined" />
                ))}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Expert quote */}
      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
          border: '1px solid #e9d5ff',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        }}
      >
        <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
          <FormatQuoteIcon sx={{ fontSize: 28, color: 'primary.light', opacity: 0.6, mb: 1 }} />
          <Typography
            variant="body2"
            sx={{ fontStyle: 'italic', lineHeight: 1.6, color: 'text.primary', mb: 1 }}
          >
            "{data.expertQuote.quote}"
          </Typography>
          <Typography variant="caption" color="text.secondary">
            — {data.expertQuote.expert}, {data.expertQuote.framework}
          </Typography>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <Box display="flex" gap={1.5} flexDirection="column">
        <Button
          fullWidth
          variant="contained"
          size="large"
          endIcon={<ArrowForwardIcon />}
          onClick={() => navigate('/dashboard')}
          sx={{
            py: 1.5,
            borderRadius: 3,
            fontWeight: 'bold',
            textTransform: 'none',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
          }}
        >
          Start Next Week
        </Button>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<ShareIcon />}
          onClick={handleShare}
          sx={{
            py: 1.2,
            borderRadius: 3,
            textTransform: 'none',
          }}
        >
          Share Your Progress
        </Button>
      </Box>

      <Snackbar
        open={copied}
        autoHideDuration={3000}
        onClose={() => setCopied(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setCopied(false)} severity="success" variant="filled">
          Summary copied to clipboard!
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WeeklySummary;
