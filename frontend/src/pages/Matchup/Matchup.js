import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Grid,
  Chip,
  Alert,
} from '@mui/material';
import PageLoader from '../../components/common/PageLoader';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAuth } from '../../contexts/AuthContext';
import { matchupApi, strategiesApi } from '../../services/api';
import { sectionColors } from '../../theme';
import EmptyState from '../../components/common/EmptyState';
import AnimatedScoreRing from '../../components/common/AnimatedScoreRing';
import { celebrate } from '../../utils/celebrate';

function matchVerdict(score) {
  if (score >= 80) return { label: 'Strong match', blurb: 'You two are deeply aligned. Build on it.' };
  if (score >= 60) return { label: 'Solid foundation', blurb: 'A lot to work with, and clear places to grow.' };
  if (score >= 40) return { label: 'Worth the work', blurb: 'Real differences — and a real path through them.' };
  return { label: 'Different wiring', blurb: 'You see the world differently. With the right skills, that becomes a strength.' };
}

const Matchup = () => {
  const navigate = useNavigate();
  const { relationship } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState(null);
  const [matchup, setMatchup] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Matchup Score | Love Rescue';
    fetchData();
  }, []); // Intentional: run once on mount

  const fetchData = async () => {
    try {
      const [statusRes, matchupRes] = await Promise.all([
        matchupApi.getStatus(),
        matchupApi.getCurrent().catch(() => ({ data: { matchup: null } })),
      ]);
      setStatus(statusRes.data);
      setMatchup(matchupRes.data.matchup);
    } catch (err) {
      setError("We couldn't load your matchup. Check your connection and refresh to try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');

    try {
      const response = await matchupApi.generate();
      setMatchup(response.data.matchup);

      // Reveal moment — celebrate the new number (bigger for a high match).
      const score = response.data.matchup?.score || 0;
      celebrate({ big: score >= 80, hearts: score >= 80 });

      // Also generate strategies
      await strategiesApi.generate();
    } catch (err) {
      setError(err.response?.data?.error || "We couldn't build your matchup just now. Give it another try in a moment.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (!relationship?.hasPartner) {
    return (
      <EmptyState
        emoji="💕"
        title="Better together"
        subtitle="When your partner joins and takes their assessments, you'll unlock your compatibility insights and a plan you can work on together."
        ctaText="Invite your partner"
        onCta={() => navigate('/settings')}
      />
    );
  }

  return (
    <Box>
      <Box sx={{ background: sectionColors.matchup.gradient, mx: -3, mt: -3, px: 3, pt: 3, pb: 2, mb: 2 }}>
        <Typography variant="h4" fontWeight="bold">
          Matchup Score
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Assessment Status */}
      {status && !status.canGenerateMatchup && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Where you two stand
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  {status.user1.name}
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {['attachment', 'personality', 'love_language', 'gottman_checkup'].map(
                    (type) => (
                      <Chip
                        key={type}
                        label={type.replace(/_/g, ' ')}
                        size="small"
                        color={status.user1.completed.includes(type) ? 'success' : 'default'}
                        icon={
                          status.user1.completed.includes(type) ? (
                            <CheckCircleIcon />
                          ) : undefined
                        }
                      />
                    )
                  )}
                </Box>
              </Grid>
              {status.user2 && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    {status.user2.name}
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {['attachment', 'personality', 'love_language', 'gottman_checkup'].map(
                      (type) => (
                        <Chip
                          key={type}
                          label={type.replace(/_/g, ' ')}
                          size="small"
                          color={status.user2.completed.includes(type) ? 'success' : 'default'}
                          icon={
                            status.user2.completed.includes(type) ? (
                              <CheckCircleIcon />
                            ) : undefined
                          }
                        />
                      )
                    )}
                  </Box>
                </Grid>
              )}
            </Grid>
            {!status.canGenerateMatchup && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Both partners need to complete all assessments to generate matchup score.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Matchup Score Display */}
      {matchup ? (
        <>
          <Card sx={{ mb: 3, textAlign: 'center', py: 4 }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
                Compatibility
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                {/* key on score so the count-up re-runs on every regenerate */}
                <AnimatedScoreRing key={matchup.score} value={matchup.score} size={200} stroke={16} />
              </Box>
              <Typography variant="h5" fontWeight="bold" sx={{ color: 'text.primary' }}>
                {matchVerdict(matchup.score).label}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: 360, mx: 'auto' }}>
                {matchVerdict(matchup.score).blurb}
              </Typography>
            </CardContent>
          </Card>

          <Grid container spacing={3}>
            {/* Alignments */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <CheckCircleIcon color="success" />
                    <Typography variant="h6">Alignments</Typography>
                  </Box>
                  {matchup.alignments?.length > 0 ? (
                    matchup.alignments.map((alignment, idx) => (
                      <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: 'success.light', borderRadius: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {alignment.area}
                        </Typography>
                        <Typography variant="body2">{alignment.note}</Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography color="text.secondary">
                      No specific alignments identified
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Areas to Work On */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <WarningIcon color="warning" />
                    <Typography variant="h6">Where it gets hard</Typography>
                  </Box>
                  {matchup.misses?.length > 0 ? (
                    matchup.misses.map((miss, idx) => (
                      <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: 'warning.light', borderRadius: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {miss.area}
                        </Typography>
                        <Typography variant="body2">{miss.note}</Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography color="text.secondary">
                      No major concerns identified
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Box textAlign="center" mt={4}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleGenerate}
              disabled={generating || !status?.canGenerateMatchup}
              sx={{ mr: 2 }}
            >
              {generating ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button variant="contained" onClick={() => navigate('/strategies')}>
              View Strategies
            </Button>
          </Box>
        </>
      ) : status?.canGenerateMatchup ? (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <CardContent>
            <FavoriteIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Ready to Generate!
            </Typography>
            <Typography color="text.secondary" paragraph>
              Both partners have completed all assessments. Generate your matchup score now.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={handleGenerate}
              disabled={generating}
            >
              {generating ? <CircularProgress size={24} /> : 'See your matchup'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Complete Assessments First
            </Typography>
            <Typography color="text.secondary" paragraph>
              Both partners need to complete all four assessments.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/assessments')}>
              Go to Assessments
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Matchup;
