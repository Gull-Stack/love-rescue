import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Button,
  CircularProgress, Alert, ToggleButton, ToggleButtonGroup,
  Skeleton, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SchoolIcon from '@mui/icons-material/School';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import FavoriteIcon from '@mui/icons-material/Favorite';
import EventIcon from '@mui/icons-material/Event';
import therapistService from '../../services/therapistService';
import { ClientCard, AlertCard } from '../../components/therapist';

const StatCard = ({ icon, label, value, color = 'primary.main' }) => (
  <Card>
    <CardContent sx={{ textAlign: 'center', py: 2 }}>
      <Box sx={{ color, mb: 0.5 }}>{icon}</Box>
      <Typography variant="h4" fontWeight={700}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </CardContent>
  </Card>
);

const TherapistDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('card');
  const [dashboard, setDashboard] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingConfirmOpen, setBillingConfirmOpen] = useState(false);
  const [pairOpen, setPairOpen] = useState(false);
  const [pairA, setPairA] = useState('');
  const [pairB, setPairB] = useState('');
  const [pairing, setPairing] = useState(false);
  const [pairError, setPairError] = useState('');
  const [todayAppointments, setTodayAppointments] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashRes, clientsRes, alertsRes, outcomesRes] = await Promise.all([
        therapistService.getDashboard(),
        therapistService.getClients(),
        therapistService.getAlerts({ limit: 10, unreadOnly: true }),
        // Outcomes are supplementary — don't fail the whole dashboard if they error.
        therapistService.getOutcomes().catch(() => null),
      ]);
      setDashboard({
        stats: dashRes.data.stats || {},
        clients: clientsRes.data.clients || [],
        alerts: alertsRes.data.alerts || [],
        outcomes: outcomesRes?.data?.outcomes || null,
      });
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Therapist Dashboard | Love Rescue';
    fetchData();
  }, [fetchData]);

  // Today's appointments — supplementary; never blocks or breaks the dashboard.
  useEffect(() => {
    let cancelled = false;
    const from = new Date(); from.setHours(0, 0, 0, 0);
    const to = new Date(); to.setHours(23, 59, 59, 999);
    therapistService.getAppointments({ from: from.toISOString(), to: to.toISOString() })
      .then((res) => { if (!cancelled) setTodayAppointments(res.data.appointments || []); })
      .catch(() => { if (!cancelled) setTodayAppointments(null); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[1, 2, 3, 4].map(i => (
            <Grid item xs={6} md={3} key={i}>
              <Skeleton variant="rounded" height={100} />
            </Grid>
          ))}
        </Grid>
        {[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={80} sx={{ mb: 1 }} />)}
      </Box>
    );
  }

  // Full-page error only when the dashboard itself failed to load. Errors that
  // occur after load (e.g. billing SSO) render inline in the main view below.
  if (error && !dashboard) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={<Button onClick={fetchData}>Retry</Button>}>
          {error}
        </Alert>
      </Box>
    );
  }

  const { stats = {}, clients = [], alerts = [], outcomes = null } = dashboard || {};

  const openBilling = async () => {
    setBillingConfirmOpen(false);
    setBillingLoading(true);
    try {
      const res = await therapistService.getBillingSsoUrl();
      window.location.href = res.data.url;
    } catch (err) {
      setError('Could not launch Medical Billing. Please try again.');
      setBillingLoading(false);
    }
  };

  // Distinct couples derived from the roster (clients sharing a couple id).
  const couples = Object.values(
    clients.reduce((acc, c) => {
      if (c.couple?.id) acc[c.couple.id] = c.couple;
      return acc;
    }, {})
  );
  const coupleName = (cp) => {
    const a = cp.user1 ? [cp.user1.firstName, cp.user1.lastName].filter(Boolean).join(' ') : 'Partner 1';
    const b = cp.user2 ? [cp.user2.firstName, cp.user2.lastName].filter(Boolean).join(' ') : 'Partner 2';
    return `${a} & ${b}`;
  };

  const handlePairCouple = async () => {
    setPairError('');
    if (!pairA || !pairB || pairA === pairB) {
      setPairError('Pick two different clients.');
      return;
    }
    setPairing(true);
    try {
      await therapistService.createCouple(pairA, pairB);
      setPairOpen(false);
      setPairA(''); setPairB('');
      await fetchData();
    } catch (err) {
      setPairError(err.response?.data?.error || 'Could not link these clients.');
    } finally {
      setPairing(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h3">Therapist Dashboard</Typography>
        <Button
          variant="contained"
          color="secondary"
          startIcon={billingLoading ? <CircularProgress size={16} color="inherit" /> : <LocalHospitalIcon />}
          onClick={() => setBillingConfirmOpen(true)}
          disabled={billingLoading}
          sx={{ minHeight: 44 }}
        >
          Medical Billing
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <StatCard icon={<PeopleIcon />} label="Total Clients" value={stats.totalClients || 0} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard icon={<NotificationsActiveIcon />} label="Unread Alerts" value={stats.unreadAlerts || 0} color="warning.main" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard icon={<AssignmentIcon />} label="Pending Tasks" value={stats.pendingTasks || 0} color="secondary.main" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard icon={<FavoriteIcon />} label="Linked Couples" value={couples.length} color="success.main" />
        </Grid>
      </Grid>

      {/* Today's appointments — rendered only when the fetch succeeded */}
      {todayAppointments !== null && (() => {
        const scheduledToday = todayAppointments.filter(a => a.status === 'scheduled');
        const next = scheduledToday.find(a => new Date(a.scheduledAt) >= new Date()) || null;
        return (
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <EventIcon color="primary" />
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography fontWeight={600}>
                  {scheduledToday.length === 0
                    ? 'No appointments today'
                    : `${scheduledToday.length} appointment${scheduledToday.length === 1 ? '' : 's'} today`}
                </Typography>
                {next && (
                  <Typography variant="body2" color="text.secondary">
                    Next: {new Date(next.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    {next.clientName ? ` with ${next.clientName}` : ''}
                  </Typography>
                )}
              </Box>
              <Button size="small" onClick={() => navigate('/therapist/appointments')} sx={{ minHeight: 44, flexShrink: 0 }}>
                Open calendar
              </Button>
            </CardContent>
          </Card>
        );
      })()}

      {/* Client Roster */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Clients</Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PersonAddIcon />}
            onClick={() => navigate('/therapist/clients')}
            sx={{ minHeight: 44 }}
          >
            Invite Client
          </Button>
          {clients.length >= 2 && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<FavoriteIcon />}
              onClick={() => { setPairError(''); setPairOpen(true); }}
              sx={{ minHeight: 44 }}
            >
              Link Couple
            </Button>
          )}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, v) => v && setViewMode(v)}
            size="small"
            aria-label="View mode"
          >
            <ToggleButton value="card" aria-label="Card view" sx={{ minWidth: 44, minHeight: 44 }}>
              <ViewModuleIcon />
            </ToggleButton>
            <ToggleButton value="list" aria-label="List view" sx={{ minWidth: 44, minHeight: 44 }}>
              <ViewListIcon />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {clients.length === 0 ? (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 5 }}>
            <PeopleIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
            <Typography variant="h6" gutterBottom>No clients yet</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Invite clients to connect with you on Love Rescue. They'll control what data they share.
            </Typography>
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => navigate('/therapist/clients')}
            >
              Invite Your First Client
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'card' ? (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {clients.map(c => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={c.id}>
              <ClientCard client={c} view="card" onClick={() => navigate(`/therapist/clients/${c.id}`)} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ mb: 3 }}>
          {clients.map(c => (
            <ClientCard key={c.id} client={c} view="list" onClick={() => navigate(`/therapist/clients/${c.id}`)} />
          ))}
        </Box>
      )}

      {/* Couples */}
      {couples.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>Couples</Typography>
          <Grid container spacing={2}>
            {couples.map((cp) => (
              <Grid item xs={12} sm={6} key={cp.id}>
                <Card>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                      <FavoriteIcon color="secondary" />
                      <Typography fontWeight={600} noWrap>{coupleName(cp)}</Typography>
                    </Box>
                    <Button size="small" onClick={() => navigate(`/therapist/couples/${cp.id}`)} sx={{ minHeight: 44, flexShrink: 0 }}>
                      View couple
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Link-as-couple dialog */}
      <Dialog open={pairOpen} onClose={() => setPairOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Link two clients as a couple</DialogTitle>
        <DialogContent>
          {pairError && <Alert severity="error" sx={{ mb: 2 }}>{pairError}</Alert>}
          <FormControl fullWidth size="small" sx={{ mt: 1, mb: 2 }}>
            <InputLabel id="pairA-label">First partner</InputLabel>
            <Select labelId="pairA-label" label="First partner" value={pairA} onChange={(e) => setPairA(e.target.value)}>
              {clients.map((c) => (
                <MenuItem key={c.id} value={c.id} disabled={c.id === pairB}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel id="pairB-label">Second partner</InputLabel>
            <Select labelId="pairB-label" label="Second partner" value={pairB} onChange={(e) => setPairB(e.target.value)}>
              {clients.map((c) => (
                <MenuItem key={c.id} value={c.id} disabled={c.id === pairA}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPairOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handlePairCouple} disabled={pairing || !pairA || !pairB}>
            {pairing ? <CircularProgress size={20} /> : 'Link couple'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Billing redirect confirmation */}
      <Dialog open={billingConfirmOpen} onClose={() => setBillingConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Open billing portal?</DialogTitle>
        <DialogContent>
          <Typography>
            You're leaving Love Rescue to open your billing portal.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBillingConfirmOpen(false)} sx={{ minHeight: 44 }}>Cancel</Button>
          <Button variant="contained" onClick={openBilling} sx={{ minHeight: 44 }}>
            Continue
          </Button>
        </DialogActions>
      </Dialog>

      {/* Caseload Outcomes */}
      {outcomes?.summary && (outcomes.summary.totalClients || 0) > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>Caseload Outcomes</Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={4} md={2.4}>
              <StatCard icon={<SchoolIcon />} label="Active in Course" value={outcomes.summary.activeInCourse || 0} />
            </Grid>
            <Grid item xs={6} sm={4} md={2.4}>
              <StatCard icon={<CheckCircleIcon />} label="Course Completed" value={outcomes.summary.courseCompleted || 0} color="success.main" />
            </Grid>
            <Grid item xs={6} sm={4} md={2.4}>
              <StatCard
                icon={<SchoolIcon />}
                label="Avg Course Week"
                value={outcomes.summary.avgCourseWeek != null ? outcomes.summary.avgCourseWeek : '—'}
                color="secondary.main"
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2.4}>
              <StatCard icon={<EmojiEventsIcon />} label="Milestones" value={outcomes.summary.totalMilestones || 0} color="success.main" />
            </Grid>
            <Grid item xs={6} sm={4} md={2.4}>
              <StatCard icon={<WarningAmberIcon />} label="Crisis Alerts" value={outcomes.summary.totalCrisisAlerts || 0} color="error.main" />
            </Grid>
          </Grid>

          {(outcomes.clients || []).length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>By Client</Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Client</TableCell>
                        <TableCell>Course Week</TableCell>
                        <TableCell align="right">Assessments</TableCell>
                        <TableCell align="right">Milestones</TableCell>
                        <TableCell align="right">Crisis Alerts</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {outcomes.clients.map((oc) => {
                        const roster = clients.find(c => c.id === oc.clientId);
                        return (
                          <TableRow key={oc.clientId} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>{roster?.name || 'Client'}</Typography>
                            </TableCell>
                            <TableCell>
                              {oc.courseCompleted ? 'Completed' : oc.courseWeek != null ? `Week ${oc.courseWeek}` : 'Not enrolled'}
                            </TableCell>
                            <TableCell align="right">{oc.assessmentTypes || 0} types</TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color={oc.milestones ? 'success.main' : 'text.secondary'}>
                                {oc.milestones || 0}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color={oc.crisisAlerts ? 'error.main' : 'text.secondary'}>
                                {oc.crisisAlerts || 0}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Alert Feed */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Recent Alerts</Typography>
        <Button onClick={() => navigate('/therapist/alerts')} size="small" sx={{ minHeight: 44 }}>
          View All
        </Button>
      </Box>

      {alerts.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">No unread alerts.</Typography>
          </CardContent>
        </Card>
      ) : (
        alerts.map(a => (
          <AlertCard
            key={a.id}
            alert={a}
            compact
            onClick={() => navigate(`/therapist/clients/${a.clientId}`)}
          />
        ))
      )}
    </Box>
  );
};

export default TherapistDashboard;
