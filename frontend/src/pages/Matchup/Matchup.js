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
import FavoriteIcon from '@mui/icons-material/Favorite';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAuth } from '../../contexts/AuthContext';
import { matchupApi, strategiesApi } from '../../services/api';

const Matchup = () => {
  const navigate = useNavigate();
  const { relationship } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState(null);
  const [matchup, setMatchup] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statusRes, matchupRes] = await Promise.all([
        matchupApi.getStatus(),
        matchupApi.getCurrent().catch(() => ({ data: { matchup: null } })),
      ]);
      setStatus(statusRes.data);
      setMatchup(matchupRes.data.matchup);
    } catch (err) {
      setError('Failed to load matchup data');
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

      // Also generate strategies
      await strategiesApi.generate();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate matchup');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!relationship?.hasPartner) {
    return (
      <Box textAlign="center" py={8}>
        <FavoriteIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Partner Required
        </Typography>
        <Typography color="text.secondary" paragraph>
          Invite your partner to see your matchup score and unlock personalized strategies.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/settings')}>
          Invite Partner
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Matchup Score
      </Typography>

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
              Assessment Progress
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  {status.user1.name}
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {['attachment', 'personality', 'wellness_behavior', 'negative_patterns_closeness'].map(
                    (type) => (
                      <Chip
                        key={type}
                        label={type.replace('_', ' ')}
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
                    {['attachment', 'personality', 'wellness_behavior', 'negative_patterns_closeness'].map(
                      (type) => (
                        <Chip
                          key={type}
                          label={type.replace('_', ' ')}
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
              <FavoriteIcon color="primary" sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="h2" color="primary" fontWeight="bold">
                {matchup.score}%
              </Typography>
              <Typography color="text.secondary">
                Compatibility Score
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
                    <Typography variant="h6">Areas to Work On</Typography>
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
              {generating ? 'Regenerating...' : 'Regenerate'}
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
              {generating ? <CircularProgress size={24} /> : 'Generate Matchup Score'}
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
