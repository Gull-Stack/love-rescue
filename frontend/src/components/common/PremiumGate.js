/**
 * PremiumGate — renders children only when the user (or their partner) is
 * entitled; otherwise shows an upgrade prompt that routes to /subscribe.
 *
 * There is no global subscription context in the app, so the gate fetches the
 * subscription once and caches it at module scope (shared across every gate
 * instance). The cache can be primed/cleared by callers that already know the
 * subscription (e.g. after a successful checkout or a Settings refresh).
 */
import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useNavigate } from 'react-router-dom';
import { paymentsApi } from '../../services/api';
import { isPremiumUser } from '../../utils/featureGating';

// Module-level cache so N gates on a screen don't each hit the network.
let cachedSubscription = null;
let inflight = null;

/** Seed the cache from a subscription you already fetched. */
export function primeSubscriptionCache(subscription) {
  cachedSubscription = subscription || null;
}

/** Invalidate the cache (call after a purchase / cancel / plan change). */
export function clearSubscriptionCache() {
  cachedSubscription = null;
  inflight = null;
}

async function loadSubscription() {
  if (cachedSubscription) return cachedSubscription;
  if (!inflight) {
    inflight = paymentsApi
      .getSubscription()
      .then((res) => {
        cachedSubscription = res.data;
        inflight = null;
        return cachedSubscription;
      })
      .catch((err) => {
        inflight = null;
        throw err;
      });
  }
  return inflight;
}

const UpgradePrompt = ({ title, description }) => {
  const navigate = useNavigate();
  return (
    <Box
      sx={{
        textAlign: 'center',
        py: 6,
        px: 3,
        maxWidth: 460,
        mx: 'auto',
      }}
    >
      <LockOutlinedIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1.5 }} />
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        {title || 'Unlock this with Premium'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {description ||
          'This is a premium feature. Start your free trial or subscribe to get full access for you and your partner.'}
      </Typography>
      <Button variant="contained" size="large" onClick={() => navigate('/subscribe')}>
        See Plans
      </Button>
    </Box>
  );
};

/**
 * @param {node}    children     content shown when entitled
 * @param {node}    [fallback]   custom locked-state UI (overrides UpgradePrompt)
 * @param {string}  [title]      upgrade prompt title
 * @param {string}  [description]upgrade prompt body
 */
const PremiumGate = ({ children, fallback, title, description }) => {
  const [status, setStatus] = useState({ loading: true, entitled: false });

  useEffect(() => {
    let alive = true;
    loadSubscription()
      .then((sub) => {
        if (alive) setStatus({ loading: false, entitled: isPremiumUser(sub) });
      })
      .catch(() => {
        // On failure, fail closed (show the prompt) rather than leaking access.
        if (alive) setStatus({ loading: false, entitled: false });
      });
    return () => {
      alive = false;
    };
  }, []);

  if (status.loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (status.entitled) {
    return children || null;
  }

  if (fallback) return fallback;
  return <UpgradePrompt title={title} description={description} />;
};

export default PremiumGate;
