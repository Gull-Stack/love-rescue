import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

// Bump the version whenever the disclaimer content materially changes so
// existing users re-acknowledge it once. v2 added crisis resources.
const DISCLAIMER_KEY = 'disclaimerAccepted:v2';

const Disclaimer = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const hasAccepted = localStorage.getItem(DISCLAIMER_KEY);
    if (!hasAccepted) {
      setOpen(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(DISCLAIMER_KEY, 'true');
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <InfoOutlinedIcon color="primary" />
          <Typography variant="h5" component="span">
            Important Notice
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography paragraph>
          Welcome to Love Rescue App. Before you continue, please read and acknowledge the following:
        </Typography>
        <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2, mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            This app provides general strategies based on relationship research.
            <strong> It is not a substitute for professional therapy, medical care, or diagnosis.</strong>
          </Typography>
        </Box>
        <Typography paragraph variant="body2">
          The assessments, strategies, and recommendations in this app are for
          educational and informational purposes only. They are based on general
          relationship science principles and should not be considered as professional
          counseling or therapy.
        </Typography>
        <Typography paragraph variant="body2" color="text.secondary">
          If you are experiencing serious relationship difficulties, domestic issues,
          or mental health concerns, please consult a licensed counselor or therapist
          for personalized advice.
        </Typography>
        <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 2 }}>
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            If you need help right now
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div">
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>Suicide &amp; Crisis Lifeline: call or text <strong>988</strong> (24/7)</li>
              <li>
                National Domestic Violence Hotline: <strong>1-800-799-7233</strong>, or
                text <strong>START</strong> to <strong>88788</strong>
              </li>
              <li>If you are in immediate danger, call <strong>911</strong></li>
            </ul>
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleAccept}
          fullWidth
          size="large"
        >
          I Understand and Accept
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default Disclaimer;
