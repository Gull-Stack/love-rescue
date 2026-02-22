/**
 * Expert Insight Pop-up Component (Improvement 11)
 * Sheet/modal overlay with expert wisdom triggered by context
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Avatar,
  Dialog,
  DialogContent,
  IconButton,
  Slide,
  keyframes,
} from '@mui/material';
import FormatQuoteIcon from '@mui/icons-material/FormatQuote';
import CloseIcon from '@mui/icons-material/Close';
import api from '../../services/api';

const fadeGlow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(156, 39, 176, 0.2); }
  50% { box-shadow: 0 0 40px rgba(156, 39, 176, 0.4); }
`;

const LOCAL_STORAGE_KEY = 'loverescue_expert_insights';

const hasShownToday = () => {
  try {
    const lastShown = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!lastShown) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(parseInt(lastShown, 10)) >= today;
  } catch {
    return false;
  }
};

const recordShown = () => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, Date.now().toString());
  } catch {
    // Ignore storage errors
  }
};

const SlideUp = React.forwardRef(function SlideUp(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const ExpertInsight = () => {
  const navigate = useNavigate();
  const [insight, setInsight] = useState(null);
  const [open, setOpen] = useState(false);

  const dismiss = useCallback(() => {
    setOpen(false);
    if (insight?.key) {
      api.post('/expert-insights/shown', { key: insight.key }).catch(() => {});
    }
  }, [insight]);

  useEffect(() => {
    // Client-side daily limit check
    if (hasShownToday()) return;

    const fetchInsight = async () => {
      try {
        const res = await api.get('/expert-insights/check');
        if (res.data.insight) {
          setInsight(res.data.insight);
          setOpen(true);
          recordShown();
        }
      } catch {
        // Silently fail — not critical
      }
    };

    // Longer delay — let dashboard + identity hint load first
    const timer = setTimeout(fetchInsight, 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!insight) return null;

  return (
    <Dialog
      open={open}
      onClose={dismiss}
      TransitionComponent={SlideUp}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: 'hidden',
          animation: `${fadeGlow} 3s ease-in-out infinite`,
          m: 2,
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        {/* Header gradient */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            p: 3,
            pb: 4,
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <IconButton
            onClick={dismiss}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'rgba(255,255,255,0.7)',
              '&:hover': { color: 'white' },
            }}
          >
            <CloseIcon />
          </IconButton>

          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255,255,255,0.8)',
              fontWeight: 'bold',
              letterSpacing: 1,
              display: 'block',
              mb: 2,
            }}
          >
            EXPERT INSIGHT
          </Typography>

          <Avatar
            sx={{
              width: 64,
              height: 64,
              mx: 'auto',
              mb: 1.5,
              bgcolor: 'rgba(255,255,255,0.2)',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              border: '2px solid rgba(255,255,255,0.4)',
            }}
          >
            {insight.initials}
          </Avatar>

          <Typography
            variant="subtitle1"
            sx={{ color: 'white', fontWeight: 'bold' }}
          >
            {insight.name}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'rgba(255,255,255,0.7)', display: 'block' }}
          >
            {insight.credentials}
          </Typography>
        </Box>

        {/* Quote body */}
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <FormatQuoteIcon
            sx={{ fontSize: 32, color: 'primary.light', opacity: 0.5, mb: 1 }}
          />
          <Typography
            variant="body1"
            sx={{
              fontStyle: 'italic',
              lineHeight: 1.6,
              color: 'text.primary',
              mb: 1,
            }}
          >
            "{insight.quote}"
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', display: 'block', mb: 3 }}
          >
            — {insight.framework}
          </Typography>

          {/* CTA */}
          <Button
            fullWidth
            variant="contained"
            onClick={() => {
              dismiss();
              navigate(insight.cta.path);
            }}
            sx={{
              mb: 1.5,
              py: 1.2,
              borderRadius: 2,
              fontWeight: 'bold',
              textTransform: 'none',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            {insight.cta.label}
          </Button>
          <Button
            fullWidth
            variant="text"
            onClick={dismiss}
            sx={{
              color: 'text.secondary',
              textTransform: 'none',
            }}
          >
            Maybe Later
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ExpertInsight;
