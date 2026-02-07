import React, { useState } from 'react';
import {
  Box,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Snackbar,
  keyframes,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { gratitudeApi } from '../../services/api';

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
  100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
`;

const heartBeat = keyframes`
  0% { transform: scale(1); }
  15% { transform: scale(1.3); }
  30% { transform: scale(1); }
  45% { transform: scale(1.2); }
  60% { transform: scale(1); }
`;

const PartnerPulse = ({ 
  hasPartner, 
  partnerName, 
  partnerActive, 
  partnerLastSeen,
  onInvite,
}) => {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // Get initials from name
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Format last seen time
  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'Not yet active';
    
    const now = new Date();
    const seen = new Date(timestamp);
    const diffMs = now - seen;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffDays === 0 && diffHours < 1) return 'Active just now';
    if (diffDays === 0) return `Active ${diffHours}h ago`;
    if (diffDays === 1) return 'Active yesterday';
    return `Active ${diffDays} days ago`;
  };

  // Send encouragement/nudge
  const handleSendNudge = async () => {
    if (sending || sent) return;
    
    setSending(true);
    try {
      // This could be a push notification or in-app message
      // For now, we'll use the gratitude API as a placeholder
      // In a real app, you'd have a dedicated nudge/encouragement endpoint
      setSnackbarOpen(true);
      setSent(true);
      setTimeout(() => setSent(false), 60000); // Allow sending again after 1 min
    } catch (error) {
      console.error('Failed to send nudge:', error);
    } finally {
      setSending(false);
    }
  };

  if (!hasPartner) {
    return (
      <Box
        onClick={onInvite}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 2,
          bgcolor: 'background.paper',
          borderRadius: 3,
          border: '2px dashed',
          borderColor: 'grey.300',
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'rgba(233, 30, 99, 0.04)',
          },
        }}
      >
        <Avatar
          sx={{
            width: 48,
            height: 48,
            bgcolor: 'grey.200',
          }}
        >
          <PersonAddIcon sx={{ color: 'grey.500' }} />
        </Avatar>
        
        <Box flex={1}>
          <Typography variant="subtitle1" fontWeight="bold" color="text.secondary">
            Invite Your Partner
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Unlock matchups, shared insights & more
          </Typography>
        </Box>
        
        <Chip
          label="Invite"
          color="primary"
          size="small"
          sx={{ fontWeight: 'bold' }}
        />
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 2,
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        }}
      >
        {/* Partner Avatar with status dot */}
        <Box sx={{ position: 'relative' }}>
          <Avatar
            sx={{
              width: 52,
              height: 52,
              bgcolor: 'primary.main',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              animation: partnerActive ? `${pulse} 2s infinite` : 'none',
            }}
          >
            {getInitials(partnerName)}
          </Avatar>
          
          {/* Status dot */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 2,
              right: 2,
              width: 14,
              height: 14,
              borderRadius: '50%',
              bgcolor: partnerActive ? '#4caf50' : '#9e9e9e',
              border: '2px solid white',
            }}
          />
        </Box>

        {/* Partner info */}
        <Box flex={1}>
          <Typography variant="subtitle1" fontWeight="bold">
            {partnerName}
          </Typography>
          <Typography 
            variant="body2" 
            color={partnerActive ? 'success.main' : 'text.secondary'}
            fontWeight={partnerActive ? 'medium' : 'normal'}
          >
            {partnerActive ? '✓ Logged today' : formatLastSeen(partnerLastSeen)}
          </Typography>
        </Box>

        {/* Nudge/encouragement button */}
        <IconButton
          onClick={handleSendNudge}
          disabled={sending || sent}
          sx={{
            bgcolor: sent ? 'success.light' : 'rgba(233, 30, 99, 0.1)',
            color: sent ? 'white' : 'primary.main',
            animation: sent ? `${heartBeat} 1s ease-in-out` : 'none',
            '&:hover': {
              bgcolor: sent ? 'success.light' : 'rgba(233, 30, 99, 0.2)',
            },
          }}
        >
          <FavoriteIcon />
        </IconButton>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={`💕 Sent love to ${partnerName}!`}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
};

export default PartnerPulse;
