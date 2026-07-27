/**
 * PremiumGate — soft paywall. Renders children in full when the user (or their
 * partner) is entitled; otherwise renders the children as a blurred, inert
 * preview with a warm upgrade prompt overlaid. The preview is deliberate: the
 * feature stays visible ("here's what's waiting for you") without being usable.
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

// Brand amber (see theme notes: slate #0F1722 / teal / amber #E08A3C).
const AMBER = '#E08A3C';
const AMBER_DARK = '#C9772F';

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

const UpgradePrompt = ({ title, description, from }) => {
  const navigate = useNavigate();
  const target = `/subscribe?from=${encodeURIComponent(from || 'premium')}`;
  return (
    <Box
      sx={{
        textAlign: 'center',
        px: { xs: 3, sm: 4 },
        py: 4,
        maxWidth: 420,
        width: '100%',
        mx: 'auto',
        borderRadius: 3,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 12px 32px rgba(15, 23, 34, 0.18)',
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          mx: 'auto',
          mb: 2,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(224, 138, 60, 0.14)',
        }}
      >
        <LockOutlinedIcon sx={{ fontSize: 28, color: AMBER }} />
      </Box>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        {title || 'This one’s for members'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {description ||
          'Unlock the full toolkit — every assessment, your couple matchup, and weekly strategies. One plan covers both you and your partner.'}
      </Typography>
      <Button
        variant="contained"
        size="large"
        onClick={() => navigate(target)}
        sx={{
          px: 4,
          bgcolor: AMBER,
          '&:hover': { bgcolor: AMBER_DARK },
        }}
      >
        See plans
      </Button>
    </Box>
  );
};

/**
 * @param {node}   children      content shown when entitled (previewed blurred
 *                               behind the prompt when not)
 * @param {node}   [fallback]    custom locked-state UI (overrides the built-in
 *                               prompt + preview treatment entirely)
 * @param {string} [title]       upgrade prompt title
 * @param {string} [description] upgrade prompt body — make it plan-appropriate
 *                               for the gated feature
 * @param {string} [from]        attribution slug appended to the plans link,
 *                               e.g. "matchup" → /subscribe?from=matchup
 */
const PremiumGate = ({ children, fallback, title, description, from }) => {
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

  // No children to preview — just the prompt, comfortably spaced.
  if (!children) {
    return (
      <Box sx={{ py: 6, px: 2 }}>
        <UpgradePrompt title={title} description={description} from={from} />
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', minHeight: 340 }}>
      {/* Inert, blurred preview of the gated content. aria-hidden keeps the
          unusable preview out of the accessibility tree. */}
      <Box
        aria-hidden
        sx={{
          filter: 'blur(6px)',
          opacity: 0.5,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {children}
      </Box>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <UpgradePrompt title={title} description={description} from={from} />
      </Box>
    </Box>
  );
};

export default PremiumGate;
