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

// Stripe webhook propagation can lag a couple of seconds behind the redirect,
// so after a successful checkout we poll the subscription until it flips.
const CHECKOUT_POLL_INTERVAL_MS = 2000;
const CHECKOUT_POLL_MAX_ATTEMPTS = 5;

const Subscribe = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [trialDays, setTrialDays] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  // { message, severity } — 'error' for real failures (checkout couldn't start,
  // purchase failed), 'info' for benign notices (user cancelled, no charge).
  const [notice, setNotice] = useState(null);
  // tier -> localized StoreKit price string (native iOS only).
  const [iapPrices, setIapPrices] = useState(null);
  const [purchasing, setPurchasing] = useState(null); // tier being purchased
  // null | 'activating' | 'active' | 'pending' — post-checkout activation state
  const [checkoutState, setCheckoutState] = useState(null);

  const onApple = useAppleIAP();
  const onWeb = useStripeCheckout();

  useEffect(() => {
    document.title = 'Plans | Love Rescue';
  }, []);

  useEffect(() => {
    // Backend redirects to /subscribe?status=success|cancelled. Accept the
    // legacy payment= param too so old links keep working.
    const status = searchParams.get('status') || searchParams.get('payment');
    if (!status) return;

    // Strip the query param so a refresh doesn't re-trigger this handling.
    try {
      window.history.replaceState(null, '', window.location.pathname);
    } catch {
      /* history unavailable (some embedded webviews) — worst case a re-run */
    }

    if (status === 'cancelled') {
      // Informational, not a failure — nothing went wrong and nothing was charged.
      setNotice({
        severity: 'info',
        message: 'Checkout was cancelled — no charge was made.',
      });
      return;
    }

    if (status !== 'success') return;

    // Payment done — the entitlement may still be propagating via webhook.
    // Clear the gate cache, then poll until the subscription flips.
    let alive = true;
    clearSubscriptionCache();
    setCheckoutState('activating');

    (async () => {
      for (let attempt = 0; attempt < CHECKOUT_POLL_MAX_ATTEMPTS; attempt++) {
        try {
          const res = await paymentsApi.getSubscription();
          if (!alive) return;
          if (isPremiumUser(res.data)) {
            setSubscription(res.data);
            setCheckoutState('active');
            return;
          }
        } catch {
          /* transient failure — keep polling */
        }
        if (attempt < CHECKOUT_POLL_MAX_ATTEMPTS - 1) {
          await new Promise((resolve) => setTimeout(resolve, CHECKOUT_POLL_INTERVAL_MS));
          if (!alive) return;
        }
      }
      if (alive) setCheckoutState('pending');
    })();

    return () => {
      alive = false;
    };
    // Run once for the landing URL — the param is stripped immediately above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // On native iOS the charge goes through StoreKit, so show StoreKit's live
  // localized prices rather than the Stripe USD display strings. If the store
  // can't be reached we quietly fall back to the Stripe display prices.
  useEffect(() => {
    if (!onApple) return undefined;
    let alive = true;
    (async () => {
      try {
        await iapService.initialize();
        const products = iapService.getProducts();
        if (!alive) return;
        const byTier = {};
        for (const product of products) {
          if (product.price) byTier[product.tier] = product.price;
        }
        if (Object.keys(byTier).length > 0) setIapPrices(byTier);
      } catch {
        /* StoreKit unavailable — keep the Stripe display prices */
      }
    })();
    return () => {
      alive = false;
    };
  }, [onApple]);

  const handleWebCheckout = async (tier) => {
    setPurchasing(tier);
    setNotice(null);
    try {
      const res = await paymentsApi.createCheckout(tier);
      const url = res.data?.url;
      if (!url) throw new Error('No checkout URL returned.');
      // Full-page redirect to Stripe Checkout.
      window.location.href = url;
    } catch (err) {
      setNotice({
        severity: 'error',
        message:
          err.response?.data?.error || 'Could not start checkout. Please try again.',
      });
      setPurchasing(null);
    }
  };

  const handleApplePurchase = async (tier) => {
    setPurchasing(tier);
    setNotice(null);
    try {
      const receipt = await iapService.purchase(tier);
      await paymentsApi.verifyAppleReceipt(receipt);
      clearSubscriptionCache();
      await load(); // reflect the new entitlement
    } catch (err) {
      // Only a genuine user-cancel (flagged by iapService when StoreKit reports
      // PAYMENT_CANCELLED) is silent. Everything else — receipt verification
      // failures, store errors whose message happens to mention "cancel", etc.
      // — is a real failure the user needs to see.
      const userCancelled =
        err?.userCancelled === true || err?.code === 'USER_CANCELLED';
      if (!userCancelled) {
        setNotice({
          severity: 'error',
          message:
            err?.message || 'Purchase could not be completed. Please try again.',
        });
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
  const trialLeft =
    subscription?.trialDaysRemaining ?? subscription?.trialDaysLeft ?? null;
  // A lapsed trial (status 'trial'/'expired' with 0 days left) must NOT show
  // the trial banner — only an explicit isTrial flag or a trial with days left.
  const onTrial =
    !!subscription &&
    (subscription.isTrial === true ||
      (subscription.status === 'trial' && (trialLeft ?? 0) > 0));

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

      {notice && (
        <Alert
          severity={notice.severity}
          sx={{ mb: 3 }}
          onClose={() => setNotice(null)}
        >
          {notice.message}
        </Alert>
      )}

      {/* Post-checkout activation states */}
      {checkoutState === 'activating' && (
        <Alert
          severity="info"
          icon={<CircularProgress size={18} />}
          sx={{ mb: 3 }}
        >
          Payment received — activating your subscription…
        </Alert>
      )}
      {checkoutState === 'active' && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/')}>
              Go to Dashboard
            </Button>
          }
        >
          Your subscription is active — welcome aboard! Everything is unlocked
          for you and your partner.
        </Alert>
      )}
      {checkoutState === 'pending' && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Payment received! Your subscription is taking a moment to activate —
          it will unlock automatically. If it hasn’t after a minute, refresh
          this page.
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
                      {/* Native iOS: live localized StoreKit price (what Apple
                          will actually charge); otherwise the Stripe display. */}
                      {(onApple && iapPrices?.[plan.id]) || plan.priceDisplay}
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
