import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Button, Chip, Alert, Skeleton,
  IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Dialog,
  DialogTitle, DialogContent, DialogActions, FormControlLabel, Checkbox,
  CircularProgress, Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EventIcon from '@mui/icons-material/Event';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import PhoneIcon from '@mui/icons-material/Phone';
import PlaceIcon from '@mui/icons-material/Place';
import therapistService from '../../services/therapistService';
import { AppointmentStatusChip, AppointmentFormDialog } from '../../components/therapist';
import EmptyState from '../../components/common/EmptyState';

const LOCATION_META = {
  video: { label: 'Video', icon: <VideocamIcon fontSize="inherit" /> },
  phone: { label: 'Phone', icon: <PhoneIcon fontSize="inherit" /> },
  in_person: { label: 'In person', icon: <PlaceIcon fontSize="inherit" /> },
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const fmtTime = (date) =>
  new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const fmtDayHeading = (date) => {
  const d = new Date(date);
  const today = startOfToday();
  const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dayStart - today) / 86400000);
  const base = d.toLocaleDateString([], {
    weekday: 'long', month: 'long', day: 'numeric',
    ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
  });
  if (diffDays === 0) return `Today — ${base}`;
  if (diffDays === 1) return `Tomorrow — ${base}`;
  if (diffDays === -1) return `Yesterday — ${base}`;
  return base;
};

const endOf = (appt) =>
  new Date(new Date(appt.scheduledAt).getTime() + (appt.durationMinutes || 50) * 60000);

/** Group an ordered list of appointments by local day. */
const groupByDay = (appointments) => {
  const groups = [];
  let current = null;
  for (const appt of appointments) {
    const key = new Date(appt.scheduledAt).toDateString();
    if (!current || current.key !== key) {
      current = { key, date: appt.scheduledAt, items: [] };
      groups.push(current);
    }
    current.items.push(appt);
  }
  return groups;
};

const friendlyActionError = (err) => {
  const code = err.response?.data?.code;
  if (code === 'INVALID_STATUS_TRANSITION') {
    return 'This appointment is no longer "scheduled", so its status can\'t be changed.';
  }
  if (code === 'APPOINTMENT_OVERLAP') {
    return 'That time overlaps another scheduled appointment.';
  }
  if (code === 'PAST_SCHEDULING') {
    return 'That time is in the past — choose a future date and time.';
  }
  return err.response?.data?.error || 'Something went wrong. Please try again.';
};

const AppointmentRow = ({ appt, onMenuOpen }) => {
  const location = LOCATION_META[appt.locationType];
  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25,
        borderBottom: '1px solid', borderColor: 'divider',
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Box sx={{ minWidth: 88 }}>
        <Typography variant="body2" fontWeight={700}>{fmtTime(appt.scheduledAt)}</Typography>
        <Typography variant="caption" color="text.secondary">
          {appt.durationMinutes || 50} min
        </Typography>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography fontWeight={600} noWrap>{appt.clientName || 'Client'}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.25 }}>
          <AppointmentStatusChip status={appt.status} />
          {location && (
            <Chip size="small" variant="outlined" icon={location.icon} label={location.label} />
          )}
          {appt.status === 'cancelled' && appt.cancelledBy && (
            <Typography variant="caption" color="text.secondary">
              by {appt.cancelledBy}
            </Typography>
          )}
        </Box>
        {appt.clientNote && (
          <Typography variant="caption" color="text.secondary" noWrap display="block" sx={{ mt: 0.25 }}>
            Note to client: {appt.clientNote}
          </Typography>
        )}
      </Box>
      {appt.status === 'scheduled' && (
        <IconButton
          aria-label="Appointment actions"
          onClick={(e) => onMenuOpen(e, appt)}
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <MoreVertIcon />
        </IconButton>
      )}
    </Box>
  );
};

const AppointmentsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);

  // Row action menu
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuAppt, setMenuAppt] = useState(null);

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [completeTarget, setCompleteTarget] = useState(null);
  const [noShowTarget, setNoShowTarget] = useState(null);
  const [createNoteOnComplete, setCreateNoteOnComplete] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [toast, setToast] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [apptRes, clientsRes] = await Promise.all([
        therapistService.getAppointments(),
        // The roster only feeds the "New appointment" picker — don't fail the page.
        therapistService.getClients().catch(() => null),
      ]);
      setAppointments(apptRes.data.appointments || []);
      setClients(clientsRes?.data?.clients || []);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Appointments | Love Rescue';
    fetchData();
  }, [fetchData]);

  const openMenu = (e, appt) => { setMenuAnchor(e.currentTarget); setMenuAppt(appt); };
  const closeMenu = () => { setMenuAnchor(null); setMenuAppt(null); };

  const transitionStatus = async (appt, status, extra = {}) => {
    setActionBusy(true);
    setActionError('');
    try {
      const res = await therapistService.updateAppointment(appt.id, { status, ...extra });
      setCancelTarget(null);
      setCompleteTarget(null);
      setNoShowTarget(null);
      if (status === 'completed' && res.data.note) {
        // Jump straight into the freshly-created session note.
        navigate(`/therapist/clients/${appt.clientId}/notes?noteId=${res.data.note.id}`);
        return;
      }
      setToast(
        status === 'completed' ? 'Appointment marked completed.'
          : status === 'cancelled' ? 'Appointment cancelled.'
            : 'Appointment marked as no-show.'
      );
      await fetchData();
    } catch (err) {
      setActionError(friendlyActionError(err));
    } finally {
      setActionBusy(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={220} height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={72} sx={{ mb: 2 }} />
        {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={110} sx={{ mb: 2 }} />)}
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={<Button onClick={fetchData}>Retry</Button>}>{error}</Alert>
      </Box>
    );
  }

  const now = new Date();
  const todayKey = new Date().toDateString();
  const todays = appointments.filter((a) => new Date(a.scheduledAt).toDateString() === todayKey);
  // Upcoming: anything whose day is today or later (ascending — API order).
  const upcoming = appointments.filter((a) => endOf(a) >= now || new Date(a.scheduledAt) >= startOfToday());
  // Past: everything else, most recent first.
  const past = appointments.filter((a) => !upcoming.includes(a)).reverse();

  const upcomingGroups = groupByDay(upcoming);
  const pastGroups = groupByDay(past);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h3">Appointments</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setFormOpen(true)}
          disabled={clients.length === 0}
          sx={{ minHeight: 44 }}
        >
          New appointment
        </Button>
      </Box>

      {clients.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Invite a client from the dashboard before scheduling appointments.
        </Alert>
      )}

      {/* Today strip */}
      <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Typography variant="overline" sx={{ opacity: 0.85 }}>Today</Typography>
          {todays.length === 0 ? (
            <Typography variant="body2">No appointments today.</Typography>
          ) : (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {todays.map((a) => (
                <Chip
                  key={a.id}
                  icon={<EventIcon />}
                  label={`${fmtTime(a.scheduledAt)} · ${a.clientName || 'Client'}${a.status !== 'scheduled' ? ` (${a.status.replace('_', '-')})` : ''}`}
                  sx={{ bgcolor: 'background.paper', height: 32 }}
                />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {appointments.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              emoji="📅"
              title="No appointments yet"
              subtitle="Schedule your first session — your client gets an email confirmation automatically."
              ctaText={clients.length > 0 ? 'New appointment' : undefined}
              onCta={clients.length > 0 ? () => setFormOpen(true) : undefined}
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Upcoming, grouped by day */}
          <Typography variant="h5" sx={{ mb: 1.5 }}>Upcoming</Typography>
          {upcomingGroups.length === 0 ? (
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Typography color="text.secondary">Nothing scheduled ahead.</Typography>
              </CardContent>
            </Card>
          ) : (
            upcomingGroups.map((group) => (
              <Card key={group.key} sx={{ mb: 2 }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {fmtDayHeading(group.date)}
                  </Typography>
                  {group.items.map((a) => (
                    <AppointmentRow key={a.id} appt={a} onMenuOpen={openMenu} />
                  ))}
                </CardContent>
              </Card>
            ))
          )}

          {/* Past, grouped by day */}
          {pastGroups.length > 0 && (
            <>
              <Typography variant="h5" sx={{ mt: 3, mb: 1.5 }}>Past</Typography>
              {pastGroups.map((group) => (
                <Card key={group.key} sx={{ mb: 2 }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                      {fmtDayHeading(group.date)}
                    </Typography>
                    {group.items.map((a) => (
                      <AppointmentRow key={a.id} appt={a} onMenuOpen={openMenu} />
                    ))}
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </>
      )}

      {/* Row actions */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem onClick={() => { setRescheduleTarget(menuAppt); closeMenu(); }} sx={{ minHeight: 44 }}>
          <ListItemIcon><EditCalendarIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Reschedule</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => { setCreateNoteOnComplete(true); setActionError(''); setCompleteTarget(menuAppt); closeMenu(); }}
          sx={{ minHeight: 44 }}
        >
          <ListItemIcon><CheckCircleIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Mark completed</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setActionError(''); setNoShowTarget(menuAppt); closeMenu(); }} sx={{ minHeight: 44 }}>
          <ListItemIcon><PersonOffIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Mark no-show</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setActionError(''); setCancelTarget(menuAppt); closeMenu(); }} sx={{ minHeight: 44 }}>
          <ListItemIcon><CancelIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Cancel appointment</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create / reschedule */}
      <AppointmentFormDialog
        open={formOpen || Boolean(rescheduleTarget)}
        onClose={() => { setFormOpen(false); setRescheduleTarget(null); }}
        clients={clients}
        appointment={rescheduleTarget}
        onSaved={() => {
          setToast(rescheduleTarget ? 'Appointment rescheduled.' : 'Appointment scheduled.');
          fetchData();
        }}
      />

      {/* Complete confirmation (with note creation) */}
      <Dialog open={Boolean(completeTarget)} onClose={actionBusy ? undefined : () => setCompleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Mark session completed?</DialogTitle>
        <DialogContent>
          {actionError && <Alert severity="error" sx={{ mb: 2 }}>{actionError}</Alert>}
          <Typography sx={{ mb: 1 }}>
            {completeTarget?.clientName || 'This client'} — {completeTarget && fmtTime(completeTarget.scheduledAt)},{' '}
            {completeTarget && new Date(completeTarget.scheduledAt).toLocaleDateString()}
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={createNoteOnComplete}
                onChange={(e) => setCreateNoteOnComplete(e.target.checked)}
              />
            }
            label="Create a session note (opens the note editor)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteTarget(null)} disabled={actionBusy} sx={{ minHeight: 44 }}>Back</Button>
          <Button
            variant="contained"
            onClick={() => transitionStatus(completeTarget, 'completed', createNoteOnComplete ? { createNote: true } : {})}
            disabled={actionBusy}
            sx={{ minHeight: 44 }}
          >
            {actionBusy ? <CircularProgress size={20} /> : 'Complete session'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel confirmation */}
      <Dialog open={Boolean(cancelTarget)} onClose={actionBusy ? undefined : () => setCancelTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Cancel this appointment?</DialogTitle>
        <DialogContent>
          {actionError && <Alert severity="error" sx={{ mb: 2 }}>{actionError}</Alert>}
          <Typography>
            {cancelTarget?.clientName || 'The client'} will be notified by email that the{' '}
            {cancelTarget && new Date(cancelTarget.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}{' '}
            appointment is cancelled.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)} disabled={actionBusy} sx={{ minHeight: 44 }}>Keep it</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => transitionStatus(cancelTarget, 'cancelled')}
            disabled={actionBusy}
            sx={{ minHeight: 44 }}
          >
            {actionBusy ? <CircularProgress size={20} /> : 'Cancel appointment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* No-show confirmation */}
      <Dialog open={Boolean(noShowTarget)} onClose={actionBusy ? undefined : () => setNoShowTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Mark as no-show?</DialogTitle>
        <DialogContent>
          {actionError && <Alert severity="error" sx={{ mb: 2 }}>{actionError}</Alert>}
          <Typography>
            Record that {noShowTarget?.clientName || 'the client'} did not attend the{' '}
            {noShowTarget && new Date(noShowTarget.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}{' '}
            appointment.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoShowTarget(null)} disabled={actionBusy} sx={{ minHeight: 44 }}>Back</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => transitionStatus(noShowTarget, 'no_show')}
            disabled={actionBusy}
            sx={{ minHeight: 44 }}
          >
            {actionBusy ? <CircularProgress size={20} /> : 'Mark no-show'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast('')}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default AppointmentsPage;
