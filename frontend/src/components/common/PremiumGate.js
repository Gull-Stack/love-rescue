import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, alpha } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useAuth } from '../../contexts/AuthContext';
import { isPremiumUser } from '../../utils/featureGating';
import { isNative } from '../../utils/platform';

/**
 * PremiumGate — wraps content that requires a premium subscription.
 * Free users see a beautiful blurred teaser with an upgrade CTA.
 *
 * Props:
 *   feature    – feature key (for analytics/tracking)
 *   title      – headline for the gate overlay (default: "Premium Feature")
 *   subtitle   – description shown on the gate
 *   children   – the premium content (rendered blurred for free users)
 *   fullBlock  – if true, don't render children at all (for fully gated pages)
 *   compact    – smaller overlay variant for inline use
 */
const PremiumGate = ({
  feature,
  title = 'Premium Feature',
  subtitle = 'Upgrade to unlock the full LoveRescue experience.',
  children,
  fullBlock = false,
  compact = false,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Premium users see content normally
  if (isPremiumUser(user)) {
    return <>{children}</>;
  }

  const handleUpgrade = () => {
    if (isNative()) {
      // On native iOS, we can't link to web checkout — prompt email
      navigate('/subscribe');
    } else {
      navigate('/subscribe');
    }
  };

  // Full block: don't render children at all
  if (fullBlock) {
    return (
      <Box
        sx={{
          position: 'relative',
          borderRadius: 3,
          overflow: 'hidden',
          minHeight: compact ? 120 : 280,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.12) 50%, rgba(236,72,153,0.08) 100%)',
        }}
      >
        <GateOverlay
          title={title}
          subtitle={subtitle}
          compact={compact}
          onUpgrade={handleUpgrade}
        />
      </Box>
    );
  }

  // Blurred teaser: render children behind blur
  return (
    <Box sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden' }}>
      <Box
        sx={{
          filter: 'blur(6px)',
          pointerEvents: 'none',
          userSelect: 'none',
          opacity: 0.6,
        }}
      >
        {children}
      </Box>
      <GateOverlay
        title={title}
        subtitle={subtitle}
        compact={compact}
        onUpgrade={handleUpgrade}
      />
    </Box>
  );
};

const GateOverlay = ({ title, subtitle, compact, onUpgrade }) => {
  const native = isNative();

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        background: (theme) =>
          `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha('#a855f7', 0.1)} 50%, ${alpha('#ec4899', 0.05)} 100%)`,
        backdropFilter: 'blur(2px)',
        p: compact ? 2 : 4,
        textAlign: 'center',
      }}
    >
      <Box
        sx={{
          width: compact ? 48 : 64,
          height: compact ? 48 : 64,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
          mb: compact ? 1 : 2,
          boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
        }}
      >
        <LockIcon sx={{ color: 'white', fontSize: compact ? 24 : 32 }} />
      </Box>

      <Typography
        variant={compact ? 'subtitle1' : 'h6'}
        fontWeight="bold"
        gutterBottom
        sx={{
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {title}
      </Typography>

      <Typography
        variant={compact ? 'caption' : 'body2'}
        color="text.secondary"
        sx={{ mb: compact ? 1.5 : 2.5, maxWidth: 360, lineHeight: 1.6 }}
      >
        {subtitle}
      </Typography>

      <Button
        variant="contained"
        startIcon={<AutoAwesomeIcon />}
        onClick={onUpgrade}
        size={compact ? 'small' : 'medium'}
        sx={{
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
          fontWeight: 'bold',
          borderRadius: 2,
          px: compact ? 2 : 3,
          py: compact ? 0.5 : 1,
          '&:hover': {
            background: 'linear-gradient(135deg, #4f46e5 0%, #9333ea 50%, #db2777 100%)',
          },
        }}
      >
        {native ? 'Learn More' : 'Unlock Premium'}
      </Button>

      {native && (
        <Typography variant="caption" color="text.disabled" sx={{ mt: 1 }}>
          Check your email for an exclusive upgrade link
        </Typography>
      )}
    </Box>
  );
};

export default PremiumGate;
