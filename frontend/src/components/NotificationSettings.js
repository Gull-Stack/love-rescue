/**
 * NotificationSettings Component
 * Handles PWA push notification subscription and preferences
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Alert,
  Snackbar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  NotificationsOff as NotificationsOffIcon
} from '@mui/icons-material';

const API_URL = process.env.REACT_APP_API_URL || '';

// Timezone options
const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' }
];

function NotificationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Notification state
  const [permissionState, setPermissionState] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [vapidKey, setVapidKey] = useState(null);
  
  // Preferences
  const [preferences, setPreferences] = useState({
    dailyReminderEnabled: true,
    dailyReminderTime: '09:00',
    timezone: 'America/Denver',
    partnerActivityAlerts: true,
    weeklyDigest: true
  });

  const getAuthToken = () => localStorage.getItem('token');

  // Check browser support
  const isPushSupported = 'serviceWorker' in navigator && 'PushManager' in window;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone === true;

  // Fetch VAPID key and current preferences
  useEffect(() => {
    const init = async () => {
      try {
        // Get VAPID public key
        const vapidRes = await fetch(`${API_URL}/api/push/vapid-public-key`);
        if (vapidRes.ok) {
          const { publicKey } = await vapidRes.json();
          setVapidKey(publicKey);
        }

        // Get current preferences
        const prefsRes = await fetch(`${API_URL}/api/push/preferences`, {
          headers: { 'Authorization': `Bearer ${getAuthToken()}` }
        });
        if (prefsRes.ok) {
          const prefs = await prefsRes.json();
          setPreferences(prefs);
          setIsSubscribed(prefs.hasActiveSubscriptions);
        }

        // Check permission state
        if ('Notification' in window) {
          setPermissionState(Notification.permission);
        }
      } catch (err) {
        console.error('Error initializing notifications:', err);
        setError('Failed to load notification settings');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Convert VAPID key to Uint8Array
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
  };

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isPushSupported || !vapidKey) {
      setError('Push notifications are not supported on this device');
      return;
    }

    try {
      setSaving(true);

      // Request permission
      const permission = await Notification.requestPermission();
      setPermissionState(permission);

      if (permission !== 'granted') {
        setError('Notification permission denied');
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });

      // Send subscription to server
      const res = await fetch(`${API_URL}/api/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ subscription: subscription.toJSON() })
      });

      if (!res.ok) throw new Error('Failed to save subscription');

      setIsSubscribed(true);
      setSuccess('Push notifications enabled! 🎉');
    } catch (err) {
      console.error('Subscription error:', err);
      setError(err.message || 'Failed to enable notifications');
    } finally {
      setSaving(false);
    }
  }, [vapidKey, isPushSupported]);

  // Unsubscribe from push notifications
  const unsubscribe = async () => {
    try {
      setSaving(true);

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        
        await fetch(`${API_URL}/api/push/unsubscribe`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAuthToken()}`
          },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
      }

      setIsSubscribed(false);
      setSuccess('Push notifications disabled');
    } catch (err) {
      console.error('Unsubscribe error:', err);
      setError('Failed to disable notifications');
    } finally {
      setSaving(false);
    }
  };

  // Save preferences
  const savePreferences = async () => {
    try {
      setSaving(true);

      const res = await fetch(`${API_URL}/api/push/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify(preferences)
      });

      if (!res.ok) throw new Error('Failed to save preferences');

      setSuccess('Preferences saved!');
    } catch (err) {
      console.error('Save preferences error:', err);
      setError('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  // Send test notification
  const sendTest = async () => {
    try {
      setTesting(true);

      const res = await fetch(`${API_URL}/api/push/test`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getAuthToken()}` }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(data.message);
    } catch (err) {
      console.error('Test notification error:', err);
      setError(err.message || 'Failed to send test notification');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          {isSubscribed ? (
            <NotificationsActiveIcon color="primary" sx={{ mr: 1 }} />
          ) : (
            <NotificationsIcon sx={{ mr: 1 }} />
          )}
          <Typography variant="h6">Push Notifications</Typography>
        </Box>

        {/* iOS PWA instructions */}
        {isIOS && !isStandalone && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>To enable notifications on iOS:</strong>
            <ol style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              <li>Tap the Share button in Safari</li>
              <li>Select "Add to Home Screen"</li>
              <li>Open the app from your home screen</li>
              <li>Come back here to enable notifications</li>
            </ol>
          </Alert>
        )}

        {/* Not supported message */}
        {!isPushSupported && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Push notifications are not supported on this browser/device.
          </Alert>
        )}

        {/* Permission denied */}
        {permissionState === 'denied' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Notifications are blocked. Please enable them in your browser/device settings.
          </Alert>
        )}

        {/* Enable/Disable toggle */}
        {isPushSupported && permissionState !== 'denied' && (
          <Box mb={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={isSubscribed}
                  onChange={isSubscribed ? unsubscribe : subscribe}
                  disabled={saving || (isIOS && !isStandalone)}
                />
              }
              label={isSubscribed ? 'Notifications enabled' : 'Enable notifications'}
            />
            {saving && <CircularProgress size={20} sx={{ ml: 2 }} />}
          </Box>
        )}

        {/* Preferences section - only show if subscribed */}
        {isSubscribed && (
          <>
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle1" gutterBottom>
              Notification Preferences
            </Typography>

            {/* Daily reminder toggle */}
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.dailyReminderEnabled}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    dailyReminderEnabled: e.target.checked
                  })}
                />
              }
              label="Daily check-in reminder"
            />

            {/* Reminder time */}
            {preferences.dailyReminderEnabled && (
              <Box display="flex" gap={2} mt={2} mb={2}>
                <TextField
                  label="Reminder Time"
                  type="time"
                  value={preferences.dailyReminderTime}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    dailyReminderTime: e.target.value
                  })}
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: 150 }}
                />
                
                <FormControl sx={{ minWidth: 180 }}>
                  <InputLabel>Timezone</InputLabel>
                  <Select
                    value={preferences.timezone}
                    label="Timezone"
                    onChange={(e) => setPreferences({
                      ...preferences,
                      timezone: e.target.value
                    })}
                  >
                    {TIMEZONES.map(tz => (
                      <MenuItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            {/* Partner activity alerts */}
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.partnerActivityAlerts}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    partnerActivityAlerts: e.target.checked
                  })}
                />
              }
              label="Partner activity alerts"
            />

            {/* Weekly digest */}
            <FormControlLabel
              control={
                <Switch
                  checked={preferences.weeklyDigest}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    weeklyDigest: e.target.checked
                  })}
                />
              }
              label="Weekly relationship digest"
            />

            {/* Save & Test buttons */}
            <Box display="flex" gap={2} mt={3}>
              <Button
                variant="contained"
                onClick={savePreferences}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </Button>
              
              <Button
                variant="outlined"
                onClick={sendTest}
                disabled={testing}
              >
                {testing ? 'Sending...' : 'Send Test Notification'}
              </Button>
            </Box>
          </>
        )}
      </CardContent>

      {/* Success snackbar */}
      <Snackbar
        open={!!success}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>

      {/* Error snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </Card>
  );
}

export default NotificationSettings;
