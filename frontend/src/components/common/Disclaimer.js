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

const Disclaimer = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const hasAccepted = localStorage.getItem('disclaimerAccepted');
    if (!hasAccepted) {
      setOpen(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('disclaimerAccepted', 'true');
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
          Welcome to Marriage Rescue App. Before you continue, please read and acknowledge the following:
        </Typography>
        <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 2, mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            This app provides general strategies based on relationship research.
            <strong> It is not a substitute for professional therapy.</strong>
          </Typography>
        </Box>
        <Typography paragraph variant="body2">
          The assessments, strategies, and recommendations in this app are for
          educational and informational purposes only. They are based on general
          relationship science principles and should not be considered as professional
          counseling or therapy.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          If you are experiencing serious relationship difficulties, domestic issues,
          or mental health concerns, please consult a licensed counselor or therapist
          for personalized advice.
        </Typography>
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
