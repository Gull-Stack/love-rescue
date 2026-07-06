/**
 * NotificationSettings Component
 * Handles push notification subscription and preferences.
 * Works on both web (VAPID/service worker) and native iOS/Android (APNs/FCM)
 * by delegating platform handling to usePushNotifications.
 */

import React, { useState, useEffect } from 'react';
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
  NotificationsActive as NotificationsActiveIcon
} from '@mui/icons-material';
import { Capacitor } from '@capacitor/core';
import api from '../services/api';
import usePushNotifications from '../hooks/usePushNotifications';

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

  // Platform-aware push state — native uses Capacitor PushNotifications,
  // web registers /push-sw.js and subscribes via VAPID.
  const {
    isSupported,
    isSubscribed,
    isLoading: pushLoading,
    subscribe,
    unsubscribe,
    sendTest,
  } = usePushNotifications();

  // Web-only permission state (Notification API doesn't exist in the native shell)
  const [permissionState, setPermissionState] = useState('default');

  // Preferences
  const [preferences, setPreferences] = useState({
    dailyReminderEnabled: true,
    dailyReminderTime: '09:00',
    timezone: 'America/Denver',
    partnerActivityAlerts: true,
    weeklyDigest: true
  });

  const isNative = Capacitor.isNativePlatform();

  // iOS Safari needs the PWA installed before web push works. Only relevant
  // on the web — inside the native shell push is handled by APNs, so never
  // show web-install instructions there.
  const isIOSWeb = !isNative && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true;

  // Fetch current preferences
  useEffect(() => {
    const init = async () => {
      try {
        const prefsRes = await api.get('/push/preferences');
        setPreferences(prefsRes.data);

        // Check permission state (web only)
        if (!isNative && 'Notification' in window) {
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
  }, [isNative]);

  // Subscribe to push notifications (native permission prompt or web VAPID —
  // usePushNotifications registers /push-sw.js first and guards against hangs)
  const handleSubscribe = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await subscribe();
      if (!isNative && 'Notification' in window) {
        setPermissionState(Notification.permission);
      }
      if (res?.success) {
        setSuccess('Push notifications enabled! 🎉');
      } else {
        setError(res?.error || 'Failed to enable notifications');
      }
    } catch (err) {
      console.error('Subscription error:', err);
      setError(err.message || 'Failed to enable notifications');
    } finally {
      setSaving(false);
    }
  };

  // Unsubscribe from push notifications
  const handleUnsubscribe = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await unsubscribe();
      if (res?.success) {
        setSuccess('Push notifications disabled');
      } else {
        setError(res?.error || 'Failed to disable notifications');
      }
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
      await api.put('/push/preferences', preferences);
      setSuccess('Preferences saved!');
    } catch (err) {
      console.error('Save preferences error:', err);
      setError(err.response?.data?.error || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  // Send test notification
  const handleSendTest = async () => {
    try {
      setTesting(true);
      const data = await sendTest();
      setSuccess(data.message || 'Test notification sent');
    } catch (err) {
      console.error('Test notification error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to send test notification');
    } finally {
      setTesting(false);
    }
  };

  if (loading || pushLoading) {
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

        {/* iOS PWA instructions — web Safari only, never in the native app */}
        {isIOSWeb && !isStandalone && (
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
        {!isSupported && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Push notifications are not supported on this browser/device.
          </Alert>
        )}

        {/* Permission denied (web) */}
        {!isNative && permissionState === 'denied' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Notifications are blocked. Please enable them in your browser/device settings.
          </Alert>
        )}

        {/* Enable/Disable toggle */}
        {isSupported && (isNative || permissionState !== 'denied') && (
          <Box mb={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={isSubscribed}
                  onChange={isSubscribed ? handleUnsubscribe : handleSubscribe}
                  disabled={saving || (isIOSWeb && !isStandalone)}
                />
              }
              label={isSubscribed ? 'Notifications enabled' : 'Enable notifications'}
            />
            {saving && <CircularProgress size={20} sx={{ ml: 2 }} />}
            {isNative && !isSubscribed && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                We'll ask for permission — you can change this anytime in iOS Settings.
              </Typography>
            )}
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
                onClick={handleSendTest}
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
