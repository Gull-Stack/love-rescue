/**
 * Full-Screen Celebration Modal
 * Implements Steve Rogers' Improvement 9 UI Specification
 * Lottie animations + haptic feedback + unlock notifications
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  Box,
  Typography,
  Button,
  Fade,
  Zoom,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

// Celebration configuration from backend API
const CELEBRATION_CONFIG = {
  first_time: {
    animation: 'confetti_burst',
    headline: 'First Step Taken',
    color: '#10b981', // emerald
    haptic: 'success',
  },
  skill_complete: {
    animation: 'skill_unlock',
    headline: 'New Skill Unlocked',
    color: '#8b5cf6', // violet
    haptic: 'impact_medium',
  },
  breakthrough: {
    animation: 'golden_glow',
    headline: 'Breakthrough Moment!',
    color: '#fbbf24', // amber
    haptic: 'impact_heavy',
  },
  streak_3: {
    animation: 'flame_ignite',
    headline: '3-Day Streak',
    color: '#f59e0b', // orange
    haptic: 'success',
  },
  streak_7: {
    animation: 'flame_grow',
    headline: '7-Day Streak!',
    color: '#f97316', // orange
    haptic: 'success',
  },
  streak_21: {
    animation: 'flame_transform',
    headline: '21-Day Streak!',
    color: '#eab308', // yellow
    haptic: 'impact_heavy',
  },
  partner_sync: {
    animation: 'hearts_connect',
    headline: 'Partner Synced!',
    color: '#ec4899', // pink
    haptic: 'success',
  },
};

/**
 * Trigger native haptic feedback based on celebration type
 */
const triggerHaptic = async (hapticType) => {
  try {
    if (hapticType === 'success') {
      await Haptics.notification({ type: 'SUCCESS' });
    } else if (hapticType === 'impact_medium') {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } else if (hapticType === 'impact_heavy') {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    }
  } catch (error) {
    // Haptics not available (web browser)
    console.log('Haptics not available');
  }
};

/**
 * Lottie Animation Placeholder Component
 * TODO: Replace with actual Lottie implementation when assets are ready
 */
const LottieAnimation = ({ animationName, color }) => {
  // Emoji fallback until Lottie files are implemented
  const emojiMap = {
    confetti_burst: '🎉',
    skill_unlock: '🔓',
    golden_glow: '✨',
    flame_ignite: '🔥',
    flame_grow: '🔥🔥',
    flame_transform: '🔥🔥🔥',
    hearts_connect: '💞',
  };

  return (
    <Box
      sx={{
        fontSize: '120px',
        textAlign: 'center',
        animation: 'pulse 2s ease-in-out infinite',
        '@keyframes pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
      }}
    >
      {emojiMap[animationName] || '🎊'}
    </Box>
  );
};

const CelebrationModal = ({ open, onClose, celebration }) => {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      // Trigger haptic immediately on modal appearance
      if (celebration?.haptic) {
        triggerHaptic(celebration.haptic);
      }
      // Auto-dismiss after 8 seconds if no interaction
      const timer = setTimeout(() => {
        onClose();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [open, celebration, onClose]);

  if (!celebration || !shouldRender) return null;

  const config = CELEBRATION_CONFIG[celebration.celebration] || {};
  const {
    animation = 'confetti_burst',
    headline = 'Celebration!',
    color = '#10b981',
  } = config;

  const {
    message = '',
    unlocks = '',
  } = celebration;

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeAfterTransition
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Fade in={open} timeout={400}>
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{
            position: 'relative',
            width: '90%',
            maxWidth: '400px',
            bgcolor: 'background.paper',
            borderRadius: '20px',
            boxShadow: `0 8px 32px ${color}44`,
            p: 4,
            outline: 'none',
            textAlign: 'center',
          }}
        >
          {/* Close button (top-right) */}
          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'text.secondary',
            }}
          >
            <CloseIcon />
          </IconButton>

          {/* Animation Layer */}
          <Zoom in={open} timeout={600} style={{ transitionDelay: '200ms' }}>
            <Box sx={{ mb: 3 }}>
              <LottieAnimation animationName={animation} color={color} />
            </Box>
          </Zoom>

          {/* Headline */}
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              mb: 2,
              color: 'text.primary',
              fontSize: { xs: '1.75rem', sm: '2rem' },
            }}
          >
            {headline}
          </Typography>

          {/* Body Text */}
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              lineHeight: 1.6,
              mb: 3,
              fontSize: { xs: '0.95rem', sm: '1rem' },
            }}
          >
            {message}
          </Typography>

          {/* Separator */}
          {unlocks && (
            <Box
              sx={{
                width: '60px',
                height: '1px',
                bgcolor: 'divider',
                mx: 'auto',
                mb: 2,
              }}
            />
          )}

          {/* Unlock Card */}
          {unlocks && (
            <Box
              sx={{
                bgcolor: 'action.hover',
                borderRadius: '12px',
                p: 2,
                mb: 3,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  fontSize: '0.8rem',
                  color: color,
                }}
              >
                UNLOCKED: {unlocks}
              </Typography>
            </Box>
          )}

          {/* CTA Button */}
          <Button
            variant="contained"
            onClick={onClose}
            fullWidth
            sx={{
              bgcolor: color,
              color: '#fff',
              py: 1.5,
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: 600,
              textTransform: 'none',
              boxShadow: `0 4px 12px ${color}44`,
              '&:hover': {
                bgcolor: color,
                opacity: 0.9,
              },
            }}
          >
            Continue
          </Button>
        </Box>
      </Fade>
    </Modal>
  );
};

export default CelebrationModal;
