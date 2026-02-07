import React, { useState } from 'react';
import {
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Zoom,
  keyframes,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { logsApi } from '../../services/api';

// Confetti animation
const confettiFall = keyframes`
  0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
`;

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

      // Show confetti celebration
      setShowConfetti(true);
      
      // Variable reward - sometimes extra celebration
      const isBonus = Math.random() > 0.7;
      
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

  // Generate confetti pieces
  const confettiColors = ['#FF6B35', '#e91e63', '#9c27b0', '#4caf50', '#ff9800', '#2196f3'];
  const confettiPieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.5}s`,
    duration: `${1 + Math.random() * 1}s`,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
    size: 8 + Math.random() * 8,
  }));

  return (
    <>
      {/* FAB - positioned in thumb zone */}
      <Zoom in={!open}>
        <Fab
          color="primary"
          aria-label="Quick log"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            bottom: { xs: 80, sm: 32 }, // Above bottom nav on mobile
            right: { xs: 16, sm: 32 },
            width: 64,
            height: 64,
            background: 'linear-gradient(135deg, #e91e63 0%, #ff6090 100%)',
            boxShadow: '0 4px 20px rgba(233, 30, 99, 0.4)',
            animation: `${bounce} 2s ease-in-out infinite`,
            '&:hover': {
              background: 'linear-gradient(135deg, #c2185b 0%, #e91e63 100%)',
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
        {/* Confetti overlay */}
        {showConfetti && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              overflow: 'hidden',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            {confettiPieces.map((piece) => (
              <Box
                key={piece.id}
                sx={{
                  position: 'absolute',
                  left: piece.left,
                  top: 0,
                  width: piece.size,
                  height: piece.size,
                  backgroundColor: piece.color,
                  borderRadius: '50%',
                  animation: `${confettiFall} ${piece.duration} ease-out ${piece.delay} forwards`,
                }}
              />
            ))}
          </Box>
        )}

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
              <Box
                key={mood.value}
                onClick={() => !submitting && handleMoodSelect(mood)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: submitting ? 'default' : 'pointer',
                  opacity: submitting && selectedMood !== mood.value ? 0.4 : 1,
                  transform: selectedMood === mood.value ? 'scale(1.2)' : 'scale(1)',
                  transition: 'all 0.2s ease',
                  '&:hover': !submitting && {
                    transform: 'scale(1.1)',
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
              </Box>
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
