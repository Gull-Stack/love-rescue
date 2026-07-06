import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Checkbox, FormControlLabel,
  ToggleButton, ToggleButtonGroup, Alert, Skeleton, Card, CardContent,
} from '@mui/material';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import therapistService from '../../services/therapistService';
import { AlertCard } from '../../components/therapist';

// Values must match the backend AlertType enum (uppercase); labels are shown capitalized.
const TYPES = [
  { value: 'CRISIS', label: 'Crisis' },
  { value: 'RISK', label: 'Risk' },
  { value: 'MILESTONE', label: 'Milestone' },
  { value: 'STAGNATION', label: 'Stagnation' },
];

const AlertsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [filterType, setFilterType] = useState(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await therapistService.getAlerts({
        type: filterType || undefined,
        unreadOnly: unreadOnly || undefined,
      });
      setAlerts(res.data.alerts || []);
      setSelected(new Set());
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [filterType, unreadOnly]);

  useEffect(() => {
    document.title = 'Alerts | Love Rescue';
    fetchAlerts();
  }, [fetchAlerts]);

  const handleMarkRead = async (id) => {
    try {
      await therapistService.markAlertRead(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, readAt: new Date().toISOString() } : a));
    } catch (err) {
      console.error('Failed to mark alert as read:', err);
    }
  };

  const handleBulkMarkRead = async () => {
    if (selected.size === 0) return;
    try {
      await therapistService.markAlertsRead([...selected]);
      setAlerts(prev => prev.map(a => selected.has(a.id) ? { ...a, readAt: new Date().toISOString() } : a));
      setSelected(new Set());
    } catch (err) {
      console.error('Failed to mark alerts as read:', err);
    }
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h3" gutterBottom>Alerts</Typography>

      {/* Filters */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center' }}>
        <ToggleButtonGroup
          value={filterType}
          exclusive
          onChange={(_, v) => setFilterType(v)}
          size="small"
          aria-label="Filter by type"
        >
          {TYPES.map(t => (
            <ToggleButton key={t.value} value={t.value} sx={{ minHeight: 44 }}>
              {t.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <FormControlLabel
          control={<Checkbox checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />}
          label="Unread only"
          sx={{ ml: 1 }}
        />
        {selected.size > 0 && (
          <Button
            startIcon={<DoneAllIcon />}
            variant="outlined"
            onClick={handleBulkMarkRead}
            sx={{ ml: 'auto', minHeight: 44 }}
          >
            Mark {selected.size} Read
          </Button>
        )}
      </Box>

      {loading ? (
        [1, 2, 3, 4, 5].map(i => <Skeleton key={i} variant="rounded" height={70} sx={{ mb: 1 }} />)
      ) : error ? (
        <Alert severity="error" action={<Button onClick={fetchAlerts}>Retry</Button>}>{error}</Alert>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              {filterType || unreadOnly ? 'No alerts match your filters.' : 'No alerts — all clear! 🎉'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        alerts.map(a => {
          const clientName = a.client
            ? [a.client.firstName, a.client.lastName].filter(Boolean).join(' ') || 'client'
            : 'client';
          return (
            <Box key={a.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Checkbox
                checked={selected.has(a.id)}
                onChange={() => toggleSelect(a.id)}
                sx={{ mt: 0.5, minWidth: 44, minHeight: 44 }}
                inputProps={{ 'aria-label': `Select alert for ${clientName}` }}
              />
              <Box sx={{ flex: 1 }}>
                <AlertCard
                  alert={a}
                  onClick={() => {
                    if (!a.readAt) handleMarkRead(a.id);
                    navigate(`/therapist/clients/${a.clientId}`);
                  }}
                />
              </Box>
            </Box>
          );
        })
      )}
    </Box>
  );
};

export default AlertsPage;
