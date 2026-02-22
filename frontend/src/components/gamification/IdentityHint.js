/**
 * Identity Hint Component (Improvement 10)
 * Toast-style banner: "You might be someone who..."
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Slide,
  keyframes,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import api from '../../services/api';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const CATEGORY_GRADIENTS = {
  appreciation: 'linear-gradient(135deg, #ff9a56 0%, #ff6b6b 50%, #ee5a24 100%)',
  vulnerability: 'linear-gradient(135deg, #a18cd1 0%, #5f72bd 50%, #667eea 100%)',
  communication: 'linear-gradient(135deg, #38ef7d 0%, #11998e 50%, #0f9b8e 100%)',
  regulation: 'linear-gradient(135deg, #667eea 0%, #5c6bc0 50%, #3949ab 100%)',
};

const LOCAL_STORAGE_KEY = 'loverescue_identity_hints';

const getWeeklyHintCount = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return stored.filter((ts) => ts > oneWeekAgo).length;
  } catch {
    return 0;
  }
};

const recordHintShown = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = stored.filter((ts) => ts > oneWeekAgo);
    recent.push(Date.now());
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(recent));
  } catch {
    // Ignore storage errors
  }
};

const IdentityHint = () => {
  const navigate = useNavigate();
  const [hint, setHint] = useState(null);
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    // Record dismissal on server
    if (hint?.trigger) {
      api.post('/identity-hints/shown', { trigger: hint.trigger }).catch(() => {});
    }
  }, [hint]);

  useEffect(() => {
    // Client-side weekly limit check
    if (getWeeklyHintCount() >= 2) return;

    const fetchHint = async () => {
      try {
        const res = await api.get('/identity-hints/check');
        if (res.data.hint) {
          setHint(res.data.hint);
          setVisible(true);
          recordHintShown();
        }
      } catch {
        // Silently fail — not critical
      }
    };

    // Slight delay so dashboard loads first
    const timer = setTimeout(fetchHint, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-dismiss after 12s
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(dismiss, 12000);
    return () => clearTimeout(timer);
  }, [visible, dismiss]);

  if (!hint) return null;

  const gradient = CATEGORY_GRADIENTS[hint.category] || CATEGORY_GRADIENTS.appreciation;

  return (
    <Slide direction="down" in={visible} mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: 'relative',
          mb: 2,
          borderRadius: 3,
          overflow: 'hidden',
          background: gradient,
          color: 'white',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        }}
      >
        {/* Shimmer overlay */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)',
            backgroundSize: '200% 100%',
            animation: `${shimmer} 3s linear infinite`,
            pointerEvents: 'none',
          }}
        />

        <Box sx={{ p: 2.5, position: 'relative' }}>
          {/* Close button */}
          <IconButton
            size="small"
            onClick={dismiss}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'rgba(255,255,255,0.7)',
              '&:hover': { color: 'white' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>

          {/* Sparkle + Label */}
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <AutoAwesomeIcon sx={{ fontSize: 20, color: 'rgba(255,255,255,0.9)' }} />
            <Typography
              variant="caption"
              sx={{ fontWeight: 'bold', letterSpacing: 0.5, opacity: 0.9 }}
            >
              IDENTITY INSIGHT
            </Typography>
          </Box>

          {/* Identity statement */}
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 'bold', mb: 0.5, pr: 3, lineHeight: 1.4 }}
          >
            You might be someone who {hint.identity}
          </Typography>

          {/* Attribution */}
          <Typography
            variant="caption"
            sx={{ opacity: 0.8, display: 'block', mb: 2 }}
          >
            {hint.attribution} · {hint.framework}
          </Typography>

          {/* Action buttons */}
          <Box display="flex" gap={1}>
            <Button
              size="small"
              variant="contained"
              onClick={() => {
                dismiss();
                navigate(hint.cta || '/gratitude');
              }}
              sx={{
                bgcolor: 'rgba(255,255,255,0.25)',
                color: 'white',
                fontWeight: 'bold',
                textTransform: 'none',
                borderRadius: 2,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.35)' },
              }}
            >
              Reflect on This
            </Button>
            <Button
              size="small"
              onClick={dismiss}
              sx={{
                color: 'rgba(255,255,255,0.8)',
                textTransform: 'none',
                '&:hover': { color: 'white' },
              }}
            >
              Dismiss
            </Button>
          </Box>
        </Box>
      </Box>
    </Slide>
  );
};

export default IdentityHint;
