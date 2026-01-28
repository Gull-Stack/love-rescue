import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PaymentIcon from '@mui/icons-material/Payment';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useAuth } from '../../contexts/AuthContext';
import { calendarApi, paymentsApi, therapistApi } from '../../services/api';

const Settings = () => {
  const [searchParams] = useSearchParams();
  const { user, relationship, invitePartner, refreshUser } = useAuth();
  const [loading, setLoading] = useState({});
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [therapistConsent, setTherapistConsent] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);

  useEffect(() => {
    fetchSettings();
    handleUrlParams();
  }, []);

  const handleUrlParams = () => {
    const payment = searchParams.get('payment');
    const calendar = searchParams.get('calendar');

    if (payment === 'success') {
      setSuccess('Payment successful! Your subscription is now active.');
      refreshUser();
    } else if (payment === 'cancelled') {
      setError('Payment was cancelled.');
    }

    if (calendar === 'success') {
      setSuccess('Google Calendar connected successfully!');
    } else if (calendar === 'error') {
      setError('Failed to connect Google Calendar.');
    }
  };

  const fetchSettings = async () => {
    try {
      const [calRes, subRes, consentRes] = await Promise.all([
        calendarApi.getStatus().catch(() => ({ data: { connected: false } })),
        paymentsApi.getSubscription().catch(() => ({ data: null })),
        therapistApi.getConsent().catch(() => ({ data: { consent: false } })),
      ]);

      setCalendarStatus(calRes.data);
      setSubscription(subRes.data);
      setTherapistConsent(consentRes.data.consent);
    } catch (err) {
      console.error('Failed to fetch settings');
    }
  };

  const handleInvite = async () => {
    setLoading({ ...loading, invite: true });
    try {
      const response = await invitePartner();
      setInviteLink(response.inviteLink);
    } catch (err) {
      setError('Failed to generate invite link');
    } finally {
      setLoading({ ...loading, invite: false });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnectCalendar = async () => {
    setLoading({ ...loading, calendar: true });
    try {
      const response = await calendarApi.getAuthUrl();
      window.location.href = response.data.authUrl;
    } catch (err) {
      setError('Failed to connect calendar');
      setLoading({ ...loading, calendar: false });
    }
  };

  const handleDisconnectCalendar = async () => {
    setLoading({ ...loading, calendar: true });
    try {
      await calendarApi.disconnect();
      setCalendarStatus({ connected: false });
      setSuccess('Calendar disconnected');
    } catch (err) {
      setError('Failed to disconnect calendar');
    } finally {
      setLoading({ ...loading, calendar: false });
    }
  };

  const handleSubscribe = async () => {
    setLoading({ ...loading, payment: true });
    try {
      const response = await paymentsApi.createCheckout();
      window.location.href = response.data.url;
    } catch (err) {
      setError('Failed to start checkout');
      setLoading({ ...loading, payment: false });
    }
  };

  const handleManageSubscription = async () => {
    setLoading({ ...loading, payment: true });
    try {
      const response = await paymentsApi.getPortal();
      window.location.href = response.data.url;
    } catch (err) {
      setError('Failed to open billing portal');
      setLoading({ ...loading, payment: false });
    }
  };

  const handleCancelSubscription = async () => {
    setLoading({ ...loading, cancel: true });
    try {
      await paymentsApi.cancel();
      setCancelDialog(false);
      setSuccess('Subscription will be cancelled at the end of the billing period');
      fetchSettings();
    } catch (err) {
      setError('Failed to cancel subscription');
    } finally {
      setLoading({ ...loading, cancel: false });
    }
  };

  const handleTherapistConsent = async (consent) => {
    setLoading({ ...loading, consent: true });
    try {
      await therapistApi.setConsent(consent);
      setTherapistConsent(consent);
      setSuccess(consent ? 'Therapist access enabled' : 'Therapist access disabled');
    } catch (err) {
      setError('Failed to update consent');
    } finally {
      setLoading({ ...loading, consent: false });
    }
  };

  return (
    <Box maxWidth="md" mx="auto">
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Settings
      </Typography>

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

      {/* Account Info */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Account
          </Typography>
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary">
              Email
            </Typography>
            <Typography>{user?.email}</Typography>
          </Box>
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary">
              Name
            </Typography>
            <Typography>
              {user?.firstName} {user?.lastName}
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Member Since
            </Typography>
            <Typography>
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString()
                : 'N/A'}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Partner Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Partner
          </Typography>
          {relationship?.hasPartner ? (
            <Box display="flex" alignItems="center" gap={2}>
              <Chip label="Partner Connected" color="success" />
              <Typography>
                {relationship.partner?.firstName || 'Your partner'} has joined
              </Typography>
            </Box>
          ) : (
            <>
              <Typography color="text.secondary" paragraph>
                Invite your partner to unlock full features
              </Typography>
              {inviteLink ? (
                <Box display="flex" alignItems="center" gap={1}>
                  <TextField
                    value={inviteLink}
                    size="small"
                    fullWidth
                    InputProps={{ readOnly: true }}
                  />
                  <Tooltip title={copied ? 'Copied!' : 'Copy'}>
                    <IconButton onClick={handleCopyLink}>
                      <ContentCopyIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              ) : (
                <Button
                  variant="contained"
                  startIcon={<PersonAddIcon />}
                  onClick={handleInvite}
                  disabled={loading.invite}
                >
                  {loading.invite ? <CircularProgress size={20} /> : 'Generate Invite Link'}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Subscription
          </Typography>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Chip
              label={user?.subscriptionStatus?.toUpperCase() || 'UNKNOWN'}
              color={
                user?.subscriptionStatus === 'paid'
                  ? 'success'
                  : user?.subscriptionStatus === 'trial'
                  ? 'primary'
                  : 'error'
              }
            />
            {subscription?.trialDaysRemaining !== null && (
              <Typography variant="body2" color="text.secondary">
                {subscription.trialDaysRemaining} days remaining in trial
              </Typography>
            )}
          </Box>

          {user?.subscriptionStatus === 'paid' ? (
            <Box display="flex" gap={2}>
              <Button variant="outlined" onClick={handleManageSubscription}>
                Manage Subscription
              </Button>
              <Button color="error" onClick={() => setCancelDialog(true)}>
                Cancel
              </Button>
            </Box>
          ) : (
            <Button
              variant="contained"
              startIcon={<PaymentIcon />}
              onClick={handleSubscribe}
              disabled={loading.payment}
            >
              {loading.payment ? (
                <CircularProgress size={20} />
              ) : (
                'Subscribe - $9.99/month'
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Google Calendar */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Google Calendar
          </Typography>
          <Typography color="text.secondary" paragraph>
            Sync your relationship activities to Google Calendar
          </Typography>
          {calendarStatus?.connected ? (
            <Box display="flex" alignItems="center" gap={2}>
              <Chip label="Connected" color="success" />
              <Button
                variant="outlined"
                color="error"
                onClick={handleDisconnectCalendar}
                disabled={loading.calendar}
              >
                Disconnect
              </Button>
            </Box>
          ) : (
            <Button
              variant="outlined"
              startIcon={<CalendarTodayIcon />}
              onClick={handleConnectCalendar}
              disabled={loading.calendar}
            >
              {loading.calendar ? <CircularProgress size={20} /> : 'Connect Calendar'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Therapist Access */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Therapist Integration
          </Typography>
          <Typography color="text.secondary" paragraph>
            Allow licensed therapists to assign tasks to your relationship
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={therapistConsent}
                onChange={(e) => handleTherapistConsent(e.target.checked)}
                disabled={loading.consent}
              />
            }
            label="Enable therapist access"
          />
        </CardContent>
      </Card>

      {/* Legal */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Legal
          </Typography>
          <Box display="flex" gap={2}>
            <Button variant="text">Privacy Policy</Button>
            <Button variant="text">Terms of Service</Button>
          </Box>
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialog} onClose={() => setCancelDialog(false)}>
        <DialogTitle>Cancel Subscription?</DialogTitle>
        <DialogContent>
          <Typography>
            Your subscription will remain active until the end of the current billing period.
            After that, you'll lose access to premium features.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialog(false)}>Keep Subscription</Button>
          <Button
            color="error"
            onClick={handleCancelSubscription}
            disabled={loading.cancel}
          >
            {loading.cancel ? <CircularProgress size={20} /> : 'Cancel Subscription'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;
