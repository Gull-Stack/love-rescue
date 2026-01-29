import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Chip,
  CircularProgress,
  Avatar,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import EventIcon from '@mui/icons-material/Event';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { mediatorsApi, meetingsApi } from '../../services/api';

const steps = ['Choose a Facilitator', 'Pick a Time', 'Confirm'];

const ScheduleMeeting = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Step 1: Mediator selection
  const [mediators, setMediators] = useState([]);
  const [selectedMediator, setSelectedMediator] = useState(null);

  // Step 2: Date + time
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Step 3: Confirmation dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  // Upcoming meetings
  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);

  useEffect(() => {
    fetchMediators();
    fetchMeetings();
  }, []);

  const fetchMediators = async () => {
    try {
      const res = await mediatorsApi.getAvailable();
      setMediators(res.data.mediators);
    } catch (err) {
      if (err.response?.data?.code === 'PREMIUM_REQUIRED') {
        setError('Premium subscription required to access mediated meetings.');
      } else {
        setError('Failed to load facilitators.');
      }
    }
  };

  const fetchMeetings = async () => {
    try {
      const res = await meetingsApi.getUpcoming();
      setMeetings(res.data.meetings);
    } catch (err) {
      // Silently fail
    } finally {
      setLoadingMeetings(false);
    }
  };

  const handleSelectMediator = (mediator) => {
    setSelectedMediator(mediator);
    setActiveStep(1);
    setSelectedDate('');
    setSlots([]);
    setSelectedSlot(null);
  };

  const handleDateChange = async (date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setSlots([]);

    if (!date || !selectedMediator) return;

    setLoadingSlots(true);
    try {
      const res = await meetingsApi.checkAvailability(selectedMediator.id, date);
      setSlots(res.data.slots);
    } catch (err) {
      setError('Failed to check availability.');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    setActiveStep(2);
  };

  const handleSchedule = async () => {
    setScheduling(true);
    setError('');
    try {
      await meetingsApi.schedule(selectedMediator.id, selectedSlot.start);
      setSuccess('Meeting scheduled successfully! Both partners will receive calendar invitations.');
      setConfirmOpen(false);
      setActiveStep(0);
      setSelectedMediator(null);
      setSelectedDate('');
      setSlots([]);
      setSelectedSlot(null);
      fetchMeetings();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to schedule meeting.');
    } finally {
      setScheduling(false);
    }
  };

  const handleCancel = async (meetingId) => {
    try {
      await meetingsApi.cancel(meetingId);
      setSuccess('Meeting cancelled.');
      fetchMeetings();
    } catch (err) {
      setError('Failed to cancel meeting.');
    }
  };

  const handleConsent = async (meetingId) => {
    try {
      await meetingsApi.consent(meetingId);
      setSuccess('You have confirmed your participation.');
      fetchMeetings();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to confirm.');
    }
  };

  // Get tomorrow as min date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Mediated Meetings
      </Typography>

      {/* Disclaimer Banner */}
      <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight="bold">
          Not therapy.
        </Typography>
        <Typography variant="body2">
          These are facilitated discussions with a neutral guide to help you and your partner communicate
          more effectively. This is not a substitute for professional therapy or counseling.
        </Typography>
      </Alert>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Upcoming Meetings */}
      {!loadingMeetings && meetings.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Upcoming Meetings
            </Typography>
            {meetings.map((meeting) => (
              <Box
                key={meeting.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 2,
                  p: 2,
                  mb: 1,
                  bgcolor: 'grey.50',
                  borderRadius: 2,
                }}
              >
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {meeting.mediator.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(meeting.scheduledAt).toLocaleString()} ({meeting.duration} min)
                  </Typography>
                  <Box display="flex" gap={1} mt={0.5}>
                    <Chip label={`Week ${meeting.week}`} size="small" variant="outlined" />
                    {meeting.partnerConsent ? (
                      <Chip icon={<CheckCircleIcon />} label="Partner Confirmed" size="small" color="success" />
                    ) : (
                      <Chip label="Awaiting Partner" size="small" color="warning" />
                    )}
                  </Box>
                </Box>
                <Box display="flex" gap={1}>
                  {meeting.meetLink && (
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<VideocamIcon />}
                      href={meeting.meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Join
                    </Button>
                  )}
                  {!meeting.isCreator && !meeting.partnerConsent && (
                    <Button
                      variant="outlined"
                      size="small"
                      color="success"
                      onClick={() => handleConsent(meeting.id)}
                    >
                      Confirm
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    startIcon={<CancelIcon />}
                    onClick={() => handleCancel(meeting.id)}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Scheduling Wizard */}
      <Card>
        <CardContent>
          <Stepper activeStep={activeStep} sx={{ mb: 3 }} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Step 1: Mediator Selection */}
          {activeStep === 0 && (
            <>
              <Typography variant="h6" gutterBottom>
                Choose a Facilitator
              </Typography>
              {mediators.length === 0 && !error ? (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {mediators.map((mediator) => (
                    <Grid item xs={12} sm={6} md={4} key={mediator.id}>
                      <Card
                        variant="outlined"
                        sx={{
                          cursor: 'pointer',
                          transition: '0.2s',
                          '&:hover': { borderColor: 'primary.main', boxShadow: 2 },
                          ...(selectedMediator?.id === mediator.id && {
                            borderColor: 'primary.main',
                            borderWidth: 2,
                          }),
                        }}
                        onClick={() => handleSelectMediator(mediator)}
                      >
                        <CardContent>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                              {mediator.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {mediator.name}
                              </Typography>
                              {mediator.rate === 0 && (
                                <Chip label="Included in Premium" size="small" color="success" />
                              )}
                            </Box>
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {mediator.bio}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </>
          )}

          {/* Step 2: Date + Time */}
          {activeStep === 1 && (
            <>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Button variant="text" onClick={() => setActiveStep(0)}>
                  Back
                </Button>
                <Typography variant="h6">
                  Pick a Date & Time with {selectedMediator?.name}
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <TextField
                  type="date"
                  label="Select Date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: minDate }}
                  fullWidth
                  sx={{ maxWidth: 300 }}
                />
              </Box>

              {loadingSlots && (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                </Box>
              )}

              {!loadingSlots && selectedDate && slots.length === 0 && (
                <Alert severity="info">
                  No available time slots for this date. Try another day.
                </Alert>
              )}

              {!loadingSlots && slots.length > 0 && (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    Available Slots
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {slots.map((slot) => {
                      const time = new Date(slot.start).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const isSelected = selectedSlot?.start === slot.start;
                      return (
                        <Button
                          key={slot.start}
                          variant={isSelected ? 'contained' : 'outlined'}
                          size="small"
                          onClick={() => handleSelectSlot(slot)}
                          startIcon={<EventIcon />}
                        >
                          {time}
                        </Button>
                      );
                    })}
                  </Box>
                </>
              )}
            </>
          )}

          {/* Step 3: Confirmation */}
          {activeStep === 2 && (
            <>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Button variant="text" onClick={() => setActiveStep(1)}>
                  Back
                </Button>
                <Typography variant="h6">Confirm Your Meeting</Typography>
              </Box>

              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    Facilitator
                  </Typography>
                  <Typography variant="body1" fontWeight="bold" gutterBottom>
                    {selectedMediator?.name}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    Date & Time
                  </Typography>
                  <Typography variant="body1" fontWeight="bold" gutterBottom>
                    {selectedSlot && new Date(selectedSlot.start).toLocaleString()}
                    {' — '}
                    {selectedSlot && new Date(selectedSlot.end).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    Duration
                  </Typography>
                  <Typography variant="body1" fontWeight="bold" gutterBottom>
                    30 minutes
                  </Typography>
                  {selectedMediator?.rate === 0 && (
                    <Chip label="Included in Premium — No Extra Cost" color="success" sx={{ mt: 1 }} />
                  )}
                </CardContent>
              </Card>

              <Alert severity="info" sx={{ mb: 2 }}>
                Your partner will receive an invitation and must confirm their participation.
                A Google Meet link will be provided for the video call.
              </Alert>

              <Button
                variant="contained"
                size="large"
                onClick={() => setConfirmOpen(true)}
                startIcon={<VideocamIcon />}
              >
                Schedule Meeting
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Schedule Mediated Meeting?</DialogTitle>
        <DialogContent>
          <Typography paragraph>
            You are scheduling a 30-minute facilitated discussion with{' '}
            <strong>{selectedMediator?.name}</strong> on{' '}
            <strong>{selectedSlot && new Date(selectedSlot.start).toLocaleString()}</strong>.
          </Typography>
          <Typography paragraph>
            Both you and your partner will receive a calendar invitation with a Google Meet link.
            Your partner will need to confirm their participation.
          </Typography>
          <Alert severity="warning" sx={{ mt: 1 }}>
            This is a guided conversation, not therapy. The facilitator helps structure your
            discussion but does not provide clinical advice or diagnosis.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={scheduling}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSchedule}
            disabled={scheduling}
            startIcon={scheduling ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          >
            {scheduling ? 'Scheduling...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScheduleMeeting;
