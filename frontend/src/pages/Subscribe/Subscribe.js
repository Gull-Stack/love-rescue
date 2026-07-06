import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Chip,
  CircularProgress,
  Stack,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FavoriteIcon from '@mui/icons-material/Favorite';
import StarIcon from '@mui/icons-material/Star';
import { paymentsApi } from '../../services/api';
import iapService from '../../services/iapService';
import { useAppleIAP, useStripeCheckout } from '../../utils/platform';
import { clearSubscriptionCache } from '../../components/common/PremiumGate';
import { isPremiumUser } from '../../utils/featureGating';

// Highlights shown under every plan. Not prices — those come from the API.
const PLAN_PERKS = [
  'All 10 relationship assessments',
  'Couple matchup & compatibility insights',
  'Personalized weekly strategies & skill tree',
  'Detailed progress reports',
  'One subscription covers both partners',
];

const Subscribe = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [trialDays, setTrialDays] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState('');
  const [purchasing, setPurchasing] = useState(null); // tier being purchased

  const onApple = useAppleIAP();
  const onWeb = useStripeCheckout();

  useEffect(() => {
    document.title = 'Plans | Love Rescue';
    // Surface a cancelled Stripe redirect (Settings also handles this param).
    if (searchParams.get('payment') === 'cancelled') {
      setError('Checkout was cancelled. You can pick a plan whenever you’re ready.');
    }
  }, [searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [plansRes, subRes] = await Promise.all([
        paymentsApi.getPlans(),
        paymentsApi.getSubscription().catch(() => ({ data: null })),
      ]);
      setPlans(plansRes.data?.plans || []);
      setTrialDays(plansRes.data?.trialDays ?? null);
      setSubscription(subRes.data || null);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleWebCheckout = async (tier) => {
    setPurchasing(tier);
    setError('');
    try {
      const res = await paymentsApi.createCheckout(tier);
      const url = res.data?.url;
      if (!url) throw new Error('No checkout URL returned.');
      // Full-page redirect to Stripe Checkout.
      window.location.href = url;
    } catch (err) {
      setError(
        err.response?.data?.error || 'Could not start checkout. Please try again.'
      );
      setPurchasing(null);
    }
  };

  const handleApplePurchase = async (tier) => {
    setPurchasing(tier);
    setError('');
    try {
      const receipt = await iapService.purchase(tier);
      await paymentsApi.verifyAppleReceipt(receipt);
      clearSubscriptionCache();
      await load(); // reflect the new entitlement
    } catch (err) {
      const msg = err?.message || 'Purchase could not be completed.';
      // A user-cancelled purchase isn't an error worth alarming over.
      if (!/cancel/i.test(msg)) {
        setError(msg);
      }
    } finally {
      setPurchasing(null);
    }
  };

  const handleSelect = (tier) => {
    if (onApple) return handleApplePurchase(tier);
    if (onWeb) return handleWebCheckout(tier);
    // Fallback (e.g. native Android): use Stripe checkout redirect.
    return handleWebCheckout(tier);
  };

  const entitled = isPremiumUser(subscription);
  const onTrial =
    subscription &&
    (subscription.status === 'trial' || subscription.trialDaysRemaining > 0);
  const trialLeft =
    subscription?.trialDaysRemaining ?? subscription?.trialDaysLeft ?? null;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      maxWidth="md"
      mx="auto"
      sx={{
        // Respect the iOS home indicator when this renders full-height.
        pb: 'calc(24px + env(safe-area-inset-bottom))',
      }}
    >
      {/* Header */}
      <Box textAlign="center" mb={3}>
        <FavoriteIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {entitled ? 'Your Membership' : 'Unlock Love Rescue'}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 520, mx: 'auto' }}>
          {entitled
            ? 'Thanks for supporting your relationship. Here’s where things stand.'
            : 'Give your relationship the full toolkit. One plan covers both you and your partner.'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="info" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loadError && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={load}>
              Retry
            </Button>
          }
        >
          We couldn’t load the plans. Please try again.
        </Alert>
      )}

      {/* Trial banner */}
      {!entitled && trialDays ? (
        <Alert icon={<StarIcon fontSize="inherit" />} severity="success" sx={{ mb: 3 }}>
          Start with a {trialDays}-day free trial. Cancel anytime.
        </Alert>
      ) : null}

      {onTrial && trialLeft != null ? (
        <Alert severity="info" sx={{ mb: 3 }}>
          You’re on a free trial —{' '}
          <strong>
            {trialLeft} {trialLeft === 1 ? 'day' : 'days'} remaining
          </strong>
          . Choose a plan to keep your access after it ends.
        </Alert>
      ) : null}

      {/* Already subscribed (non-trial) */}
      {entitled && !onTrial ? (
        <Card sx={{ mb: 3, borderColor: 'success.main', borderWidth: 1, borderStyle: 'solid' }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              You’re subscribed
            </Typography>
            {subscription?.coveredByPartner ? (
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Your access is covered by your partner’s subscription. 💜
              </Typography>
            ) : (
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                {subscription?.tier ? `Current plan: ${subscription.tier}. ` : ''}
                {subscription?.cancelAtPeriodEnd
                  ? 'Your plan is set to cancel at the end of the current period.'
                  : 'Thanks for being a member.'}
              </Typography>
            )}
            <Button variant="outlined" onClick={() => navigate('/settings')}>
              Manage Subscription
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Plan cards — shown when the user still needs to pick/keep a plan */}
      {(!entitled || onTrial) && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems="stretch"
          justifyContent="center"
        >
          {plans.map((plan) => {
            const highlight = plan.id === 'annual';
            return (
              <Card
                key={plan.id}
                sx={{
                  flex: 1,
                  maxWidth: { sm: 320 },
                  position: 'relative',
                  border: '2px solid',
                  borderColor: highlight ? 'secondary.main' : 'divider',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {highlight && (
                  <Chip
                    label="Best value"
                    color="secondary"
                    size="small"
                    sx={{ position: 'absolute', top: 12, right: 12 }}
                  />
                )}
                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    {plan.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
                    <Typography variant="h4" fontWeight="bold">
                      {plan.priceDisplay}
                    </Typography>
                    {plan.interval && (
                      <Typography variant="body2" color="text.secondary">
                        /{plan.interval}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ flex: 1, my: 2 }}>
                    <Stack spacing={1}>
                      {PLAN_PERKS.map((perk) => (
                        <Box key={perk} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                          <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main', mt: '2px' }} />
                          <Typography variant="body2" color="text.secondary">
                            {perk}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                  <Button
                    variant={highlight ? 'contained' : 'outlined'}
                    color={highlight ? 'secondary' : 'primary'}
                    size="large"
                    fullWidth
                    disabled={!!purchasing}
                    onClick={() => handleSelect(plan.id)}
                  >
                    {purchasing === plan.id ? (
                      <CircularProgress size={22} color="inherit" />
                    ) : trialDays && !onTrial ? (
                      `Start ${trialDays}-day free trial`
                    ) : (
                      'Choose plan'
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      {!loadError && plans.length === 0 && !entitled && (
        <Typography align="center" color="text.secondary" sx={{ mt: 4 }}>
          Plans are not available right now. Please check back soon.
        </Typography>
      )}

      <Typography
        variant="caption"
        color="text.secondary"
        align="center"
        sx={{ display: 'block', mt: 4 }}
      >
        {onApple
          ? 'Purchases are billed through your Apple ID. Manage or cancel in your device Settings.'
          : 'Secure checkout powered by Stripe. Cancel anytime from Settings.'}
      </Typography>
    </Box>
  );
};

export default Subscribe;
