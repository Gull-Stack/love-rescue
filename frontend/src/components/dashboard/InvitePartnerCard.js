import React, { useState } from 'react';
import { Box, Typography, Button, Snackbar } from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import IosShareIcon from '@mui/icons-material/IosShare';
import { useAuth } from '../../contexts/AuthContext';

/**
 * The solo user's path to a partner, on the home screen where it belongs.
 * (Previously the only invite entry point was the 7th card down in Settings,
 * and the dashboard's invite empty-state was dead code.)
 *
 * Uses relationship.inviteCode from /auth/me when it exists so the pending
 * invite survives reloads; otherwise creates one on first tap.
 */
const InvitePartnerCard = () => {
  const { relationship, invitePartner, refreshUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const existingCode = relationship?.inviteCode || null;
  const linkFor = (code) => `${window.location.origin}/join/${code}`;

  const shareLink = async (link) => {
    const text = `Join me on Love Rescue so we can work on us together — ${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Love Rescue', text, url: link });
        return;
      } catch {
        return; // user dismissed the sheet — not an error
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setToast('Invite link copied — send it to your partner 💛');
    } catch {
      setToast(link); // last resort: show the link itself
    }
  };

  const handleInvite = async () => {
    setBusy(true);
    try {
      let code = existingCode;
      if (!code) {
        const res = await invitePartner();
        code = res.inviteCode || res.inviteLink?.split('/join/')?.[1];
        refreshUser?.();
      }
      if (code) await shareLink(linkFor(code));
      else setToast("Couldn't create an invite right now — try again in a moment.");
    } catch {
      setToast("Couldn't create an invite right now — try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2.5,
        mb: 3,
        bgcolor: 'background.paper',
        borderRadius: 4,
        border: '2px dashed',
        borderColor: 'rgba(224, 138, 60, 0.5)',
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          flexShrink: 0,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(224, 138, 60, 0.12)',
        }}
      >
        <FavoriteBorderIcon sx={{ color: '#E08A3C' }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle1" fontWeight="bold">
          Better together
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {existingCode
            ? 'Your invite is waiting — share it again anytime.'
            : 'Invite your partner to unlock matchups, shared insights and more.'}
        </Typography>
      </Box>
      <Button
        variant="contained"
        onClick={handleInvite}
        disabled={busy}
        startIcon={<IosShareIcon />}
        sx={{ minHeight: 44, borderRadius: 2, flexShrink: 0 }}
      >
        {busy ? 'One sec…' : 'Invite'}
      </Button>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast('')}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default InvitePartnerCard;
