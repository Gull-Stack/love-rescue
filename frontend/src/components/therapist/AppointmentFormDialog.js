import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert,
  TextField, FormControl, InputLabel, Select, MenuItem, CircularProgress,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import therapistService from '../../services/therapistService';

export const LOCATION_LABELS = {
  video: 'Video',
  phone: 'Phone',
  in_person: 'In person',
};

const DURATION_OPTIONS = [30, 45, 50, 60, 75, 90, 120];

/** Format a Date for an <input type="datetime-local"> in local time. */
export const toLocalInputValue = (date) => {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Default proposed time: the next full hour. */
const nextHour = () => {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
};

/** Map backend error codes onto messages a therapist can act on. */
const friendlyError = (err) => {
  const code = err.response?.data?.code;
  if (code === 'APPOINTMENT_OVERLAP') {
    return 'That time overlaps another scheduled appointment. Pick a different time.';
  }
  if (code === 'PAST_SCHEDULING') {
    return 'That time is in the past — choose a future date and time.';
  }
  if (code === 'INVALID_STATUS_TRANSITION') {
    return 'This appointment can no longer be changed (it is not in "scheduled" status).';
  }
  return err.response?.data?.error || 'Could not save the appointment. Please try again.';
};

/**
 * Create ("New appointment") or reschedule dialog.
 * - Create mode (no `appointment` prop): client picker + time + duration +
 *   location + optional note visible to the client.
 * - Reschedule mode (`appointment` set): time + duration only.
 * Calls onSaved(appointment) after a successful request.
 */
const AppointmentFormDialog = ({ open, onClose, clients = [], appointment = null, onSaved }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const isReschedule = Boolean(appointment);

  const [clientId, setClientId] = useState('');
  const [when, setWhen] = useState(toLocalInputValue(nextHour()));
  const [duration, setDuration] = useState(50);
  const [locationType, setLocationType] = useState('video');
  const [clientNote, setClientNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setError('');
    setSaving(false);
    if (appointment) {
      setClientId(appointment.clientId || '');
      setWhen(toLocalInputValue(appointment.scheduledAt));
      setDuration(appointment.durationMinutes || 50);
      setLocationType(appointment.locationType || 'video');
      setClientNote(appointment.clientNote || '');
    } else {
      setClientId('');
      setWhen(toLocalInputValue(nextHour()));
      setDuration(50);
      setLocationType('video');
      setClientNote('');
    }
  }, [open, appointment]);

  const handleSave = async () => {
    setError('');
    const parsed = new Date(when);
    if (!when || Number.isNaN(parsed.getTime())) {
      setError('Pick a valid date and time.');
      return;
    }
    if (!isReschedule && !clientId) {
      setError('Pick a client for this appointment.');
      return;
    }
    setSaving(true);
    try {
      // The backend stores the therapist's IANA timezone with the appointment
      // and uses it to format times in client emails — send it on create AND
      // reschedule so notifications always show the intended local time.
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      let res;
      if (isReschedule) {
        res = await therapistService.updateAppointment(appointment.id, {
          scheduledAt: parsed.toISOString(),
          durationMinutes: duration,
          timezone,
        });
      } else {
        res = await therapistService.createAppointment({
          clientId,
          scheduledAt: parsed.toISOString(),
          durationMinutes: duration,
          locationType,
          timezone,
          ...(clientNote.trim() ? { clientNote: clientNote.trim() } : {}),
        });
      }
      if (onSaved) onSaved(res.data.appointment);
      onClose();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth fullScreen={fullScreen}>
      <DialogTitle>{isReschedule ? 'Reschedule appointment' : 'New appointment'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!isReschedule && (
          <FormControl fullWidth size="small" sx={{ mt: 1, mb: 2 }}>
            <InputLabel id="appt-client-label">Client</InputLabel>
            <Select
              labelId="appt-client-label"
              label="Client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              {clients.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <TextField
          type="datetime-local"
          label="Date & time"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          InputLabelProps={{ shrink: true }}
          inputProps={{ min: toLocalInputValue(new Date()) }}
          fullWidth
          size="small"
          sx={{ mt: isReschedule ? 1 : 0, mb: 2 }}
        />

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel id="appt-duration-label">Duration</InputLabel>
          <Select
            labelId="appt-duration-label"
            label="Duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          >
            {DURATION_OPTIONS.map((m) => (
              <MenuItem key={m} value={m}>{m} minutes</MenuItem>
            ))}
          </Select>
        </FormControl>

        {!isReschedule && (
          <>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel id="appt-location-label">Location</InputLabel>
              <Select
                labelId="appt-location-label"
                label="Location"
                value={locationType}
                onChange={(e) => setLocationType(e.target.value)}
              >
                {Object.entries(LOCATION_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Note to client (optional)"
              value={clientNote}
              onChange={(e) => setClientNote(e.target.value)}
              multiline
              minRows={2}
              fullWidth
              size="small"
              inputProps={{ maxLength: 2000 }}
              helperText="Visible to the client — logistics only, never clinical notes."
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving} sx={{ minHeight: 44 }}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || (!isReschedule && !clientId)}
          sx={{ minHeight: 44 }}
        >
          {saving ? <CircularProgress size={20} /> : isReschedule ? 'Reschedule' : 'Schedule'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AppointmentFormDialog;
