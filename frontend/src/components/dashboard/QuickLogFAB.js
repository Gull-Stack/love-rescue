import React, { useState } from 'react';
import {
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  ButtonBase,
  Zoom,
  keyframes,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { logsApi } from '../../services/api';
import { celebrate } from '../../utils/celebrate';
import { hapticLight } from '../../utils/haptics';

const bounce = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
`;

const QuickLogFAB = ({ onLogComplete, partnerName }) => {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);

  const moods = [
    { emoji: '😊', label: 'Good', value: 4 },
    { emoji: '😐', label: 'Okay', value: 3 },
    { emoji: '😔', label: 'Tough', value: 2 },
  ];

  const handleMoodSelect = async (mood) => {
    setSelectedMood(mood.value);
    setSubmitting(true);

    try {
      // Quick log with minimal data
      await logsApi.submitDaily({
        positives: mood.value >= 3 ? 3 : 1,
        negatives: mood.value >= 3 ? 0 : 2,
        mood: mood.value,
        quickLog: true,
      });

      // Variable reward - sometimes extra celebration
      const isBonus = Math.random() > 0.7;

      // Confetti + haptic (bigger burst on a bonus)
      setShowConfetti(true);
      celebrate({ big: isBonus });

      setTimeout(() => {
        setShowConfetti(false);
        setOpen(false);
        setSelectedMood(null);
        if (onLogComplete) {
          onLogComplete(isBonus);
        }
      }, 1500);

    } catch (error) {
      console.error('Quick log failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* FAB - positioned in thumb zone */}
      <Zoom in={!open}>
        <Fab
          color="primary"
          aria-label="Quick log"
          onClick={() => { hapticLight(); setOpen(true); }}
          sx={{
            position: 'fixed',
            bottom: { xs: 80, sm: 32 }, // Above bottom nav on mobile
            right: { xs: 16, sm: 32 },
            width: 64,
            height: 64,
            background: 'linear-gradient(135deg, #E08A3C 0%, #F0A55C 100%)',
            boxShadow: '0 4px 20px rgba(224, 138, 60, 0.45)',
            animation: `${bounce} 2s ease-in-out infinite`,
            '&:hover': {
              background: 'linear-gradient(135deg, #B86A22 0%, #E08A3C 100%)',
            },
            '&:active': {
              transform: 'scale(0.92)',
            },
          }}
        >
          <AddIcon sx={{ fontSize: 32 }} />
        </Fab>
      </Zoom>

      {/* Quick Log Modal */}
      <Dialog
        open={open}
        onClose={() => !submitting && setOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 4,
            maxWidth: 340,
            width: '100%',
            m: 2,
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle sx={{ pb: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold">
            Quick Check-in
          </Typography>
          <IconButton onClick={() => setOpen(false)} size="small" disabled={submitting}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 2, pb: 4 }}>
          <Typography variant="body1" color="text.secondary" textAlign="center" mb={3}>
            {partnerName ? `How are things with ${partnerName}?` : 'How are things today?'}
          </Typography>

          {/* Mood buttons */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 2,
            }}
          >
            {moods.map((mood) => (
              <ButtonBase
                key={mood.value}
                onClick={() => !submitting && handleMoodSelect(mood)}
                disabled={submitting}
                aria-label={`Mood: ${mood.label}`}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 44,
                  minHeight: 44,
                  p: 1,
                  borderRadius: 2,
                  cursor: submitting ? 'default' : 'pointer',
                  opacity: submitting && selectedMood !== mood.value ? 0.4 : 1,
                  transform: selectedMood === mood.value ? 'scale(1.2)' : 'scale(1)',
                  transition: 'all 0.2s ease',
                  '&:hover': !submitting && {
                    transform: 'scale(1.1)',
                  },
                  '&:active': {
                    transform: 'scale(0.92)',
                  },
                }}
              >
                <Box
                  sx={{
                    fontSize: '3.5rem',
                    lineHeight: 1,
                    mb: 0.5,
                    filter: submitting && selectedMood === mood.value ? 'none' : 'none',
                  }}
                >
                  {mood.emoji}
                </Box>
                <Typography
                  variant="caption"
                  fontWeight="medium"
                  color={selectedMood === mood.value ? 'primary' : 'text.secondary'}
                >
                  {mood.label}
                </Typography>
              </ButtonBase>
            ))}
          </Box>

          {showConfetti && (
            <Typography
              variant="h6"
              textAlign="center"
              color="primary"
              fontWeight="bold"
              mt={3}
              sx={{ animation: `${bounce} 0.5s ease-in-out` }}
            >
              🎉 Logged!
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuickLogFAB;
