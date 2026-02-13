import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Chip, Checkbox, FormControlLabel,
  ToggleButton, ToggleButtonGroup, Alert, Skeleton, Card, CardContent,
} from '@mui/material';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import therapistService from '../../services/therapistService';
import { AlertCard } from '../../components/therapist';

const TYPES = ['crisis', 'risk', 'milestone', 'stagnation'];

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
        type: filterType,
        unreadOnly: unreadOnly || undefined,
      });
      setAlerts(res.data.alerts || []);
      setSelected(new Set());
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load alerts');
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
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    } catch (err) {
      console.error('Failed to mark alert as read:', err);
    }
  };

  const handleBulkMarkRead = async () => {
    if (selected.size === 0) return;
    try {
      await therapistService.markAlertsRead([...selected]);
      setAlerts(prev => prev.map(a => selected.has(a.id) ? { ...a, read: true } : a));
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
            <ToggleButton key={t} value={t} sx={{ minHeight: 44, textTransform: 'capitalize' }}>
              {t}
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
        alerts.map(a => (
          <Box key={a.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Checkbox
              checked={selected.has(a.id)}
              onChange={() => toggleSelect(a.id)}
              sx={{ mt: 0.5, minWidth: 44, minHeight: 44 }}
              inputProps={{ 'aria-label': `Select alert for ${a.clientName}` }}
            />
            <Box sx={{ flex: 1 }}>
              <AlertCard
                alert={a}
                onClick={() => {
                  if (!a.read) handleMarkRead(a.id);
                  navigate(`/therapist/clients/${a.clientId}`);
                }}
              />
            </Box>
          </Box>
        ))
      )}
    </Box>
  );
};

export default AlertsPage;
