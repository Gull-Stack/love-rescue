import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PsychologyIcon from '@mui/icons-material/Psychology';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import GroupsIcon from '@mui/icons-material/Groups';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import RestoreIcon from '@mui/icons-material/Restore';
import AppleIcon from '@mui/icons-material/Apple';
import { useAuth } from '../../contexts/AuthContext';
import { isPremiumUser } from '../../utils/featureGating';
import { useAppleIAP } from '../../utils/platform';
import api from '../../services/api';
import iapService from '../../services/iapService';

const FEATURES_LIST = [
  { icon: <PsychologyIcon />, text: 'All 12 relationship assessments', sub: 'Attachment, personality, EQ, conflict style & more' },
  { icon: <FavoriteIcon />, text: 'Matchup compatibility scores', sub: 'See how you & your partner complement each other' },
  { icon: <TrendingUpIcon />, text: 'AI-powered strategies', sub: 'Personalized weekly action plans' },
  { icon: <MenuBookIcon />, text: 'Full daily tracking', sub: 'Mood, gratitude, journal & interaction logging' },
  { icon: <GroupsIcon />, text: 'Partner features', sub: 'Invite your partner and grow together' },
  { icon: <CalendarMonthIcon />, text: 'Detailed reports & insights', sub: 'Track your relationship health over time' },
];

// Web/Stripe pricing (unchanged)
const STRIPE_PRICING = {
  monthly: { price: '$9.99', period: '/month', savings: null },
  yearly: { price: '$79.99', period: '/year', savings: 'Save 33%' },
};

const Subscribe = () => {
  const theme = useTheme();
  const { user, refreshUser } = useAuth();
  const [plan, setPlan] = useState('yearly');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const appleIAP = useAppleIAP();

  // ── Apple IAP State ────────────────────────────────────────────────
  const [iapReady, setIapReady] = useState(false);
  const [iapLoading, setIapLoading] = useState(appleIAP);
  const [iapProducts, setIapProducts] = useState([]);
  const [restoring, setRestoring] = useState(false);

  // ── Initialize Apple IAP on mount ──────────────────────────────────
  const initializeIAP = useCallback(async () => {
    if (!appleIAP) return;

    setIapLoading(true);
    try {
      const success = await iapService.initialize();
      if (success) {
        setIapReady(true);
        const products = iapService.getProducts();
        setIapProducts(products);
      }
    } catch (err) {
      console.error('[Subscribe] IAP init error:', err);
    } finally {
      setIapLoading(false);
    }
  }, [appleIAP]);

  useEffect(() => {
    initializeIAP();
  }, [initializeIAP]);

  // ── Already Premium ────────────────────────────────────────────────
  if (isPremiumUser(user)) {
    return (
      <Box textAlign="center" py={8}>
        <AutoAwesomeIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          You're Already Premium! 🎉
        </Typography>
        <Typography variant="body1" color="text.secondary">
          You have full access to all LoveRescue features. Thank you for your support!
        </Typography>
      </Box>
    );
  }

  // ── Stripe Checkout (web only — UNTOUCHED) ─────────────────────────
  const handleStripeCheckout = async () => {
    setSending(true);
    setError('');
    try {
      const res = await api.post('/upgrade/checkout', { plan });
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start checkout. Try again later.');
    } finally {
      setSending(false);
    }
  };

  // ── Apple IAP Purchase (iOS native only) ───────────────────────────
  const handleApplePurchase = async () => {
    setSending(true);
    setError('');
    try {
      await iapService.purchase(plan);
      // Purchase succeeded — refresh user data from backend
      await refreshUser();
    } catch (err) {
      const msg = err.message || 'Purchase failed. Please try again.';
      // Don't show error for user cancellations
      if (!msg.toLowerCase().includes('cancel')) {
        setError(msg);
      }
    } finally {
      setSending(false);
    }
  };

  // ── Restore Purchases (iOS native only) ────────────────────────────
  const handleRestore = async () => {
    setRestoring(true);
    setError('');
    try {
      await iapService.restorePurchases();
      // Give a moment for the approved handler to fire
      await new Promise((r) => setTimeout(r, 2000));
      await refreshUser();
      // Check if user is now premium
      if (isPremiumUser(user)) {
        // Component will re-render with the "already premium" view
      } else {
        setError('No previous purchases found for this account.');
      }
    } catch (err) {
      setError(err.message || 'Could not restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  // ── Pricing (Apple IAP or Stripe) ──────────────────────────────────
  const getDisplayPricing = () => {
    if (appleIAP && iapProducts.length > 0) {
      const product = iapProducts.find((p) => p.plan === plan);
      if (product && product.price) {
        return { price: product.price, period: product.period, savings: product.savings };
      }
    }
    // On Apple IAP without loaded products, return null (shows loading)
    if (appleIAP) return null;
    return STRIPE_PRICING[plan];
  };

  const pricing = getDisplayPricing();

  return (
    <Box>
      {/* Hero */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, md: 5 },
          mb: 4,
          borderRadius: 4,
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.12) 50%, rgba(236,72,153,0.08) 100%)',
        }}
      >
        <AutoAwesomeIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
        <Typography
          variant="h4"
          fontWeight="bold"
          gutterBottom
          sx={{
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Unlock Your Full Relationship Potential
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 520, mx: 'auto' }}>
          You've already started your journey with free assessments. Go deeper with all 12 dimensions, partner matchup, and personalized strategies.
        </Typography>
      </Paper>

      {/* Features */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {FEATURES_LIST.map((f, i) => (
          <Grid item xs={12} sm={6} key={i}>
            <Box display="flex" gap={2} alignItems="flex-start">
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main',
                  flexShrink: 0,
                }}
              >
                {f.icon}
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight="bold">{f.text}</Typography>
                <Typography variant="caption" color="text.secondary">{f.sub}</Typography>
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Plan Toggle */}
      <Box textAlign="center" mb={3}>
        <ToggleButtonGroup
          value={plan}
          exclusive
          onChange={(_, v) => v && setPlan(v)}
          sx={{ mb: 2 }}
        >
          <ToggleButton value="monthly" sx={{ px: 3 }}>Monthly</ToggleButton>
          <ToggleButton value="yearly" sx={{ px: 3 }}>
            Yearly
            {pricing && pricing.savings && (
              <Chip label={pricing.savings} size="small" color="success" sx={{ ml: 1, fontWeight: 'bold' }} />
            )}
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Price display — loading state for Apple IAP */}
        {!pricing ? (
          <Box display="flex" alignItems="center" justifyContent="center" gap={1} py={2}>
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary">Loading prices from App Store...</Typography>
          </Box>
        ) : (
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            {pricing.price}
            <Typography component="span" variant="h6" color="text.secondary" fontWeight="normal">
              {pricing.period}
            </Typography>
          </Typography>
        )}
      </Box>

      {/* CTA Card */}
      <Card sx={{ maxWidth: 480, mx: 'auto', borderRadius: 3, mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {/* ── Apple IAP Button (iOS native only) ──────────────────── */}
          {appleIAP ? (
            <>
              <Button
                variant="contained"
                fullWidth
                onClick={handleApplePurchase}
                disabled={sending || iapLoading || !pricing}
                startIcon={sending ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
                size="large"
                sx={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
                  fontWeight: 'bold',
                  py: 1.5,
                  borderRadius: 2,
                  fontSize: '1.1rem',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 50%, #db2777 100%)',
                  },
                }}
              >
                {sending
                  ? 'Processing...'
                  : !pricing
                    ? 'Loading...'
                    : `Subscribe — ${pricing.price}${pricing.period}`}
              </Button>

              {/* Restore Purchases */}
              <Button
                variant="text"
                fullWidth
                onClick={handleRestore}
                disabled={restoring || iapLoading}
                startIcon={restoring ? <CircularProgress size={16} /> : <RestoreIcon />}
                sx={{ mt: 1.5, color: 'text.secondary' }}
              >
                {restoring ? 'Restoring...' : 'Restore Purchases'}
              </Button>

              {/* Powered by Apple */}
              <Box display="flex" alignItems="center" justifyContent="center" gap={0.5} mt={1}>
                <AppleIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                <Typography variant="caption" color="text.disabled">
                  Secure checkout powered by Apple. Cancel anytime.
                </Typography>
              </Box>
            </>
          ) : (
            /* ── Stripe Button (web only — UNCHANGED) ───────────────── */
            <>
              <Button
                variant="contained"
                fullWidth
                onClick={handleStripeCheckout}
                disabled={sending}
                startIcon={<AutoAwesomeIcon />}
                size="large"
                sx={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
                  fontWeight: 'bold',
                  py: 1.5,
                  borderRadius: 2,
                  fontSize: '1.1rem',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 50%, #db2777 100%)',
                  },
                }}
              >
                {sending ? 'Starting Checkout...' : `Subscribe — ${STRIPE_PRICING[plan].price}${STRIPE_PRICING[plan].period}`}
              </Button>
              <Typography variant="caption" color="text.disabled" display="block" textAlign="center" mt={1}>
                Secure checkout powered by Stripe. Cancel anytime.
              </Typography>
            </>
          )}
        </CardContent>
      </Card>

      {/* What's included free */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, bgcolor: alpha(theme.palette.success.main, 0.05), border: `1px solid ${alpha(theme.palette.success.main, 0.2)}` }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="success.main">
          ✅ What's Included Free
        </Typography>
        <List dense disablePadding>
          {[
            'Attachment Style Assessment',
            'Love Language Assessment',
            'Basic daily mood tracking',
            'View-only dashboard',
          ].map((item) => (
            <ListItem key={item} disableGutters sx={{ py: 0.25 }}>
              <ListItemIcon sx={{ minWidth: 28 }}>
                <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
              </ListItemIcon>
              <ListItemText primary={item} primaryTypographyProps={{ variant: 'body2' }} />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default Subscribe;
