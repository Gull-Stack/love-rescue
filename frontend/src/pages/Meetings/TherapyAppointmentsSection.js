import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Chip, Alert, Dialog,
  DialogTitle, DialogContent, DialogActions, CircularProgress, Divider,
} from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import VideocamIcon from '@mui/icons-material/Videocam';
import PhoneIcon from '@mui/icons-material/Phone';
import PlaceIcon from '@mui/icons-material/Place';
import api from '../../services/api';

const LOCATION_META = {
  video: { label: 'Video', icon: <VideocamIcon fontSize="inherit" /> },
  phone: { label: 'Phone', icon: <PhoneIcon fontSize="inherit" /> },
  in_person: { label: 'In person', icon: <PlaceIcon fontSize="inherit" /> },
};

const STATUS_META = {
  scheduled: { label: 'Scheduled', color: 'primary' },
  completed: { label: 'Completed', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'default' },
  no_show: { label: 'No-show', color: 'warning' },
};

const fmtWhen = (date) =>
  new Date(date).toLocaleString([], {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });

const AppointmentItem = ({ appt, onCancel }) => {
  const location = LOCATION_META[appt.locationType];
  const status = STATUS_META[appt.status] || { label: appt.status, color: 'default' };
  const cancellable = appt.status === 'scheduled';
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap', py: 1.5 }}>
      <Box sx={{ flex: 1, minWidth: 200 }}>
        <Typography variant="subtitle1" fontWeight="bold">
          {appt.therapistName || 'Your therapist'}
          {appt.practiceName ? ` · ${appt.practiceName}` : ''}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {fmtWhen(appt.scheduledAt)} ({appt.durationMinutes || 50} min)
        </Typography>
        <Box display="flex" gap={1} mt={0.5} flexWrap="wrap">
          <Chip label={status.label} size="small" color={status.color} variant="outlined" />
          {location && <Chip icon={location.icon} label={location.label} size="small" variant="outlined" />}
          {appt.status === 'cancelled' && appt.cancelledBy && (
            <Chip label={`Cancelled by ${appt.cancelledBy}`} size="small" variant="outlined" />
          )}
        </Box>
        {appt.clientNote && (
          <Typography variant="body2" sx={{ mt: 0.75, fontStyle: 'italic' }} color="text.secondary">
            Note from your therapist: “{appt.clientNote}”
          </Typography>
        )}
      </Box>
      {cancellable && (
        <Button
          variant="outlined"
          size="small"
          color="error"
          startIcon={<CancelIcon />}
          onClick={() => onCancel(appt)}
          sx={{ minHeight: 44 }}
        >
          Cancel
        </Button>
      )}
    </Box>
  );
};

/**
 * "Therapy Appointments" section for the client-side Meetings page.
 * Lists appointments the user's therapist scheduled with them (upcoming +
 * past) and lets them cancel scheduled ones. Renders nothing when the user
 * has no therapist appointments (or the fetch fails) so the mediated-meetings
 * flow stays uncluttered for everyone else.
 */
const TherapyAppointmentsSection = () => {
  const [appointments, setAppointments] = useState(null); // null = loading/failed
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [message, setMessage] = useState('');

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await api.get('/therapist/my/appointments');
      setAppointments(res.data.appointments || []);
    } catch {
      // Supplementary section — never break the Meetings page over it.
      setAppointments(null);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  if (!appointments || appointments.length === 0) return null;

  const now = new Date();
  const upcoming = appointments
    .filter((a) => a.status === 'scheduled' && new Date(a.scheduledAt) >= now)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  const past = appointments
    .filter((a) => !upcoming.includes(a))
    .sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));

  const handleCancel = async () => {
    setCancelling(true);
    setCancelError('');
    try {
      await api.patch(`/therapist/my/appointments/${cancelTarget.id}/cancel`);
      setCancelTarget(null);
      setMessage('Appointment cancelled. Your therapist has been notified.');
      await fetchAppointments();
    } catch (err) {
      if (err.response?.data?.code === 'INVALID_STATUS_TRANSITION') {
        setCancelError('This appointment can no longer be cancelled.');
      } else {
        setCancelError(err.response?.data?.error || 'Could not cancel the appointment. Please try again.');
      }
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Therapy Appointments</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Sessions scheduled by your therapist. These are separate from mediated meetings.
        </Typography>

        {message && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMessage('')}>{message}</Alert>
        )}

        {upcoming.length > 0 && (
          <>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>Upcoming</Typography>
            {upcoming.map((a) => (
              <AppointmentItem key={a.id} appt={a} onCancel={(appt) => { setCancelError(''); setCancelTarget(appt); }} />
            ))}
          </>
        )}

        {upcoming.length > 0 && past.length > 0 && <Divider sx={{ my: 1 }} />}

        {past.length > 0 && (
          <>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 1 }}>Past</Typography>
            {past.map((a) => (
              <AppointmentItem key={a.id} appt={a} onCancel={(appt) => { setCancelError(''); setCancelTarget(appt); }} />
            ))}
          </>
        )}
      </CardContent>

      {/* Cancel confirmation */}
      <Dialog open={Boolean(cancelTarget)} onClose={cancelling ? undefined : () => setCancelTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancel this appointment?</DialogTitle>
        <DialogContent>
          {cancelError && <Alert severity="error" sx={{ mb: 2 }}>{cancelError}</Alert>}
          <Typography>
            Your {cancelTarget && fmtWhen(cancelTarget.scheduledAt)} appointment with{' '}
            {cancelTarget?.therapistName || 'your therapist'} will be cancelled and they will be notified.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)} disabled={cancelling} sx={{ minHeight: 44 }}>
            Keep it
          </Button>
          <Button color="error" variant="contained" onClick={handleCancel} disabled={cancelling} sx={{ minHeight: 44 }}>
            {cancelling ? <CircularProgress size={20} /> : 'Cancel appointment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default TherapyAppointmentsSection;
