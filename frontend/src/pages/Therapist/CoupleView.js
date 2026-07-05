import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button, Divider,
  Alert, Skeleton, IconButton, Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PersonIcon from '@mui/icons-material/Person';
import therapistService from '../../services/therapistService';
import { CoupleRadarChart } from '../../components/therapist';

/** Humanize an assessment type key like "gottman_checkup" → "Gottman Checkup". */
const typeLabel = (type) =>
  String(type || '')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const partnerName = (user, fallback) =>
  user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || fallback : fallback;

const asNumber = (score) => {
  if (typeof score === 'number') return score;
  const n = Number(score);
  return Number.isFinite(n) ? n : null;
};

const CoupleView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Fetch the two endpoints independently. The comparison endpoint 403s
    // (PARTNER_CONSENT_REQUIRED) until BOTH partners consent, while getCouple
    // still returns a redacted 200 when only one has. A shared Promise.all
    // would reject the whole page on that expected 403, so settle them apart:
    // the couple response drives the page, the comparison is best-effort.
    const [coupleResult, compResult] = await Promise.allSettled([
      therapistService.getCouple(id),
      therapistService.getCoupleComparison(id),
    ]);
    setLoading(false);

    if (coupleResult.status !== 'fulfilled') {
      const err = coupleResult.reason;
      setError(err?.response?.data?.error || err?.response?.data?.message || 'Failed to load couple data');
      return;
    }

    const comparisonAvailable = compResult.status === 'fulfilled';
    setData({
      couple: coupleResult.value.data?.couple || null,
      partnerConsentRequired: Boolean(coupleResult.value.data?.partnerConsentRequired),
      comparisonAvailable,
      partners: comparisonAvailable ? (compResult.value.data?.partners || null) : null,
      comparison: comparisonAvailable ? (compResult.value.data?.comparison || []) : [],
      comparisonMessage: comparisonAvailable ? (compResult.value.data?.message || null) : null,
    });
  }, [id]);

  useEffect(() => {
    document.title = 'Couple View | Love Rescue';
    fetchData();
  }, [fetchData]);

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
    couple,
    comparison = [],
    comparisonMessage,
    comparisonAvailable = false,
    partnerConsentRequired = false,
  } = data || {};
  const user1 = couple?.user1 || data?.partners?.user1 || null;
  const user2 = couple?.user2 || data?.partners?.user2 || null;
  const nameA = partnerName(user1, 'Partner 1');
  const nameB = partnerName(user2, 'Partner 2');

  // Radar chart can only plot numeric scores; structured results are listed in the table below.
  const numericRows = comparison.filter(c => asNumber(c.user1) != null || asNumber(c.user2) != null);
  const radarLabels = numericRows.map(c => typeLabel(c.type));
  const radarA = { name: nameA, scores: numericRows.map(c => asNumber(c.user1) ?? 0) };
  const radarB = { name: nameB, scores: numericRows.map(c => asNumber(c.user2) ?? 0) };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={() => navigate('/therapist')} sx={{ minWidth: 44, minHeight: 44 }} aria-label="Back">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" fontWeight={600} sx={{ flex: 1 }}>
          <FavoriteIcon sx={{ verticalAlign: 'middle', mr: 1, color: 'primary.main' }} />
          {nameA} & {nameB}
        </Typography>
        {couple?.status && (
          <Chip label={couple.status} size="small" color="primary" variant="outlined" sx={{ textTransform: 'capitalize' }} />
        )}
      </Box>

      {/* Two-Column Partner Details */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[{ user: user1, name: nameA }, { user: user2, name: nameB }].map((partner, idx) => (
          <Grid item xs={12} md={6} key={idx}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon color={idx === 0 ? 'primary' : 'secondary'} />
                  <Typography variant="h6" color={idx === 0 ? 'primary' : 'secondary'}>
                    {partner.name}
                  </Typography>
                </Box>
                <Divider sx={{ my: 1.5 }} />
                {partner.user ? (
                  <>
                    {partner.user.email && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">Email</Typography>
                        <Typography variant="body2" fontWeight={600}>{partner.user.email}</Typography>
                      </Box>
                    )}
                    {comparisonAvailable && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">Assessments Completed</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {comparison.filter(c => (idx === 0 ? c.user1 : c.user2) != null).length} of {comparison.length || 0}
                        </Typography>
                      </Box>
                    )}
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    This partner hasn't joined Love Rescue yet.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Comparison requires BOTH partners to have consented. When only one has,
          the comparison endpoint 403s and we render an inline note instead of
          the radar/table (the couple view above still renders from getCouple). */}
      {!comparisonAvailable ? (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>Assessment Comparison</Typography>
            <Alert severity="info" sx={{ mt: 1 }}>
              {partnerConsentRequired
                ? 'Both partners must consent to see the side-by-side comparison. This view shows only the partner who has connected with you.'
                : 'The side-by-side comparison is unavailable right now.'}
            </Alert>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Radar Chart Comparison */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Assessment Comparison</Typography>
              {radarLabels.length >= 3 ? (
                <CoupleRadarChart
                  partnerA={radarA}
                  partnerB={radarB}
                  labels={radarLabels}
                  height={350}
                />
              ) : (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  {comparisonMessage || 'The comparison chart will appear once both partners complete at least three scored assessments.'}
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Side-by-side scores table */}
          {comparison.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Latest Scores Side by Side</Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Assessment</TableCell>
                        <TableCell align="right">{nameA}</TableCell>
                        <TableCell align="right">{nameB}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {comparison.map((c) => (
                        <TableRow key={c.type}>
                          <TableCell>{typeLabel(c.type)}</TableCell>
                          <TableCell align="right">{asNumber(c.user1) ?? (c.user1 != null ? 'Completed' : '—')}</TableCell>
                          <TableCell align="right">{asNumber(c.user2) ?? (c.user2 != null ? 'Completed' : '—')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Box>
  );
};

export default CoupleView;
