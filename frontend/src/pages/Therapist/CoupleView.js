import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button, Divider,
  Alert, Skeleton, IconButton, List, ListItem, ListItemText,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FavoriteIcon from '@mui/icons-material/Favorite';
import therapistService from '../../services/therapistService';
import { CoupleRadarChart, PursueWithdrawIndicator } from '../../components/therapist';

const CoupleView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    document.title = 'Couple View | Love Rescue';
    fetchData();
  }, [id]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [coupleRes, compRes] = await Promise.all([
        therapistService.getCouple(id),
        therapistService.getCoupleComparison(id),
      ]);
      setData({ ...coupleRes.data, comparison: compRes.data });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load couple data');
    } finally {
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={300} height={40} />
        <Skeleton variant="rounded" height={120} sx={{ mt: 2, mb: 2 }} />
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}><Skeleton variant="rounded" height={300} /></Grid>
          <Grid item xs={12} md={6}><Skeleton variant="rounded" height={300} /></Grid>
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={<Button onClick={fetchData}>Retry</Button>}>{error}</Alert>
      </Box>
    );
  }

  const {
    partnerA, partnerB, narrativeSummary, attachmentDynamic,
    loveLanguages, conflictStyles, pursueWithdraw,
    sharedStrengths = [], growthEdges = [], comparison,
  } = data || {};

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate('/therapist')} sx={{ minWidth: 44, minHeight: 44 }} aria-label="Back">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" fontWeight={600} sx={{ flex: 1 }}>
          <FavoriteIcon sx={{ verticalAlign: 'middle', mr: 1, color: 'primary.main' }} />
          {partnerA?.name} & {partnerB?.name}
        </Typography>
      </Box>

      {/* Therapist Narrative Summary */}
      {narrativeSummary && (
        <Card sx={{ mb: 3, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Therapist Summary</Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>{narrativeSummary}</Typography>
          </CardContent>
        </Card>
      )}

      {/* Radar Chart Comparison */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Assessment Comparison</Typography>
          <CoupleRadarChart
            partnerA={comparison?.partnerA}
            partnerB={comparison?.partnerB}
            labels={comparison?.labels || []}
            height={350}
          />
        </CardContent>
      </Card>

      {/* Two-Column Partner Details */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[partnerA, partnerB].map((partner, idx) => (
          <Grid item xs={12} md={6} key={idx}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" color={idx === 0 ? 'primary' : 'secondary'} gutterBottom>
                  {partner?.name || `Partner ${idx === 0 ? 'A' : 'B'}`}
                </Typography>
                <Divider sx={{ mb: 1.5 }} />
                {partner?.attachmentStyle && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">Attachment Style</Typography>
                    <Typography variant="body2" fontWeight={600}>{partner.attachmentStyle}</Typography>
                  </Box>
                )}
                {partner?.loveLanguage && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">Love Language</Typography>
                    <Typography variant="body2" fontWeight={600}>{partner.loveLanguage}</Typography>
                  </Box>
                )}
                {partner?.conflictStyle && (
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">Conflict Style</Typography>
                    <Typography variant="body2" fontWeight={600}>{partner.conflictStyle}</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Attachment Dynamic */}
      {attachmentDynamic && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Attachment Dynamic</Typography>
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h5" fontWeight={700} color="primary">
                {attachmentDynamic.pattern}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 500, mx: 'auto' }}>
                {attachmentDynamic.description}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Pursue-Withdraw Pattern */}
      {pursueWithdraw && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Pursue-Withdraw Pattern</Typography>
            <PursueWithdrawIndicator
              pursuer={pursueWithdraw.pursuer}
              withdrawer={pursueWithdraw.withdrawer}
              intensity={pursueWithdraw.intensity}
              trend={pursueWithdraw.trend}
              description={pursueWithdraw.description}
            />
          </CardContent>
        </Card>
      )}

      {/* Strengths & Growth Edges */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="success.main">💪 Shared Strengths</Typography>
              {sharedStrengths.length === 0 ? (
                <Typography color="text.secondary">No strengths identified yet.</Typography>
              ) : (
                <List dense>
                  {sharedStrengths.map((s, i) => (
                    <ListItem key={i}><ListItemText primary={s} /></ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="warning.main">🌱 Growth Edges</Typography>
              {growthEdges.length === 0 ? (
                <Typography color="text.secondary">No growth edges identified yet.</Typography>
              ) : (
                <List dense>
                  {growthEdges.map((g, i) => (
                    <ListItem key={i}><ListItemText primary={g} /></ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CoupleView;
