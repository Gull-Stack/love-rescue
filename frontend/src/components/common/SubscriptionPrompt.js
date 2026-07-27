import React, { useEffect, useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Global soft paywall. Listens for the `lr:subscription-required` event the
 * API layer dispatches on a 402 and shows a warm in-app prompt instead of the
 * old hard redirect. Background 402s (e.g. one dashboard card) are throttled
 * so the dialog can't re-open in a loop.
 */
const SubscriptionPrompt = () => {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState('');
  const lastShownRef = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onGate = (e) => {
      // At most once per 30s — parallel gated calls fire together.
      const now = Date.now();
      if (now - lastShownRef.current < 30000) return;
      lastShownRef.current = now;
      setFrom(e.detail?.from || '');
      setOpen(true);
    };
    window.addEventListener('lr:subscription-required', onGate);
    return () => window.removeEventListener('lr:subscription-required', onGate);
  }, []);

  // Navigating away (e.g. to /subscribe) closes it.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      PaperProps={{ sx: { borderRadius: 4, maxWidth: 360, m: 2 } }}
    >
      <DialogContent sx={{ textAlign: 'center', py: 4, px: 3 }}>
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
            bgcolor: 'rgba(224, 138, 60, 0.12)',
          }}
        >
          <LockOutlinedIcon sx={{ color: '#E08A3C', fontSize: 28 }} />
        </Box>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          That&apos;s part of Premium
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Your daily check-ins, gratitude, and goals are always free. This
          feature comes with a plan — see what&apos;s included.
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Button
            variant="contained"
            fullWidth
            sx={{ minHeight: 44, borderRadius: 2 }}
            onClick={() => {
              setOpen(false);
              navigate(`/subscribe${from ? `?from=${encodeURIComponent(from)}` : ''}`);
            }}
          >
            See plans
          </Button>
          <Button
            fullWidth
            color="inherit"
            sx={{ minHeight: 44, borderRadius: 2, color: 'text.secondary' }}
            onClick={() => setOpen(false)}
          >
            Not now
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionPrompt;
