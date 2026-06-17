import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button,
  CircularProgress, Alert, ToggleButton, ToggleButtonGroup,
  Skeleton,
} from '@mui/material';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
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

  useEffect(() => {
    document.title = 'Therapist Dashboard | Love Rescue';
    fetchData();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashRes, clientsRes, alertsRes] = await Promise.all([
        therapistService.getDashboard(),
        therapistService.getClients(),
        therapistService.getAlerts({ limit: 10, unreadOnly: true }),
      ]);
      setDashboard({
        stats: dashRes.data.stats || {},
        clients: clientsRes.data.clients || [],
        alerts: alertsRes.data.alerts || [],
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
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

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={<Button onClick={fetchData}>Retry</Button>}>
          {error}
        </Alert>
      </Box>
    );
  }

  const { stats = {}, clients = [], alerts = [] } = dashboard || {};

  const openBilling = async () => {
    setBillingLoading(true);
    try {
      const res = await therapistService.getBillingSsoUrl();
      window.location.href = res.data.url;
    } catch (err) {
      setError('Could not launch Medical Billing. Please try again.');
      setBillingLoading(false);
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
          onClick={openBilling}
          disabled={billingLoading}
          sx={{ minHeight: 44 }}
        >
          Medical Billing
        </Button>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <StatCard icon={<PeopleIcon />} label="Total Clients" value={stats.totalClients || 0} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard icon={<TrendingUpIcon />} label="Active This Week" value={stats.activeThisWeek || 0} color="success.main" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard icon={<WarningAmberIcon />} label="Alerts" value={stats.alertsCount || 0} color="warning.main" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard icon={<NotificationsActiveIcon />} label="Avg Progress" value={`${stats.avgProgress || 0}%`} color="secondary.main" />
        </Grid>
      </Grid>

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
            <Typography color="text.secondary">No unread alerts 🎉</Typography>
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
