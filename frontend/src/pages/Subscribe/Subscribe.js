import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  TextField,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ToggleButton,
  ToggleButtonGroup,
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
import { useAuth } from '../../contexts/AuthContext';
import { isPremiumUser } from '../../utils/featureGating';
import { isNative } from '../../utils/platform';
import api from '../../services/api';

const FEATURES_LIST = [
  { icon: <PsychologyIcon />, text: 'All 12 relationship assessments', sub: 'Attachment, personality, EQ, conflict style & more' },
  { icon: <FavoriteIcon />, text: 'Matchup compatibility scores', sub: 'See how you & your partner complement each other' },
  { icon: <TrendingUpIcon />, text: 'AI-powered strategies', sub: 'Personalized weekly action plans' },
  { icon: <MenuBookIcon />, text: 'Full daily tracking', sub: 'Mood, gratitude, journal & interaction logging' },
  { icon: <GroupsIcon />, text: 'Partner features', sub: 'Invite your partner and grow together' },
  { icon: <CalendarMonthIcon />, text: 'Detailed reports & insights', sub: 'Track your relationship health over time' },
];

const PRICING = {
  monthly: { price: '$9.99', period: '/month', savings: null },
  yearly: { price: '$79.99', period: '/year', savings: 'Save 33%' },
};

const Subscribe = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [plan, setPlan] = useState('yearly');
  const [email, setEmail] = useState(user?.email || '');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const native = isNative();

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

  const handleSendLink = async () => {
    setSending(true);
    setError('');
    try {
      await api.post('/upgrade/send-link', { email, plan });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send upgrade link. Try again later.');
    } finally {
      setSending(false);
    }
  };

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
            {PRICING.yearly.savings && (
              <Chip label={PRICING.yearly.savings} size="small" color="success" sx={{ ml: 1, fontWeight: 'bold' }} />
            )}
          </ToggleButton>
        </ToggleButtonGroup>

        <Typography variant="h3" fontWeight="bold" gutterBottom>
          {PRICING[plan].price}
          <Typography component="span" variant="h6" color="text.secondary" fontWeight="normal">
            {PRICING[plan].period}
          </Typography>
        </Typography>
      </Box>

      {/* CTA */}
      <Card sx={{ maxWidth: 480, mx: 'auto', borderRadius: 3, mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {sent && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Check your email! We sent you a personalized upgrade link.
            </Alert>
          )}

          {native ? (
            // Native iOS: can't link to Stripe directly, send email
            <>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Get Your Upgrade Link
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                We'll send you a secure checkout link to your email — takes 30 seconds.
              </Typography>
              <TextField
                fullWidth
                label="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{ mb: 2 }}
                size="small"
              />
              <Button
                variant="contained"
                fullWidth
                onClick={handleSendLink}
                disabled={sending || !email || sent}
                startIcon={<AutoAwesomeIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
                  fontWeight: 'bold',
                  py: 1.2,
                  borderRadius: 2,
                }}
              >
                {sending ? 'Sending...' : sent ? 'Link Sent!' : 'Send Upgrade Link'}
              </Button>
            </>
          ) : (
            // Web: direct Stripe checkout
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
                {sending ? 'Starting Checkout...' : `Subscribe — ${PRICING[plan].price}${PRICING[plan].period}`}
              </Button>
              <Typography variant="caption" color="text.disabled" display="block" textAlign="center" mt={1}>
                Secure checkout powered by Stripe. Cancel anytime.
              </Typography>
            </>
          )}
        </CardContent>
      </Card>

      {/* What you already get (free tier) */}
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
