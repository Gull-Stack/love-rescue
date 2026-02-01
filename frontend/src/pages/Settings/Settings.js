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
  Alert,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PaymentIcon from '@mui/icons-material/Payment';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useAuth } from '../../contexts/AuthContext';
import api, { calendarApi, paymentsApi, therapistApi } from '../../services/api';

const Settings = () => {
  const [searchParams] = useSearchParams();
  const { user, relationship, invitePartner, refreshUser } = useAuth();
  const [loading, setLoading] = useState({});
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [therapistConsent, setTherapistConsent] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [legalDialog, setLegalDialog] = useState(null); // 'privacy' or 'terms'
  const [gender, setGender] = useState(user?.gender || '');

  useEffect(() => {
    fetchSettings();
    handleUrlParams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    if (user?.gender) setGender(user.gender);
  }, [user?.gender]);

  const handleGenderUpdate = async (newGender) => {
    setLoading({ ...loading, gender: true });
    setError('');
    try {
      await api.patch('/auth/update-profile', { gender: newGender });
      setGender(newGender);
      refreshUser();
      setSuccess('Gender updated successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update gender');
    } finally {
      setLoading({ ...loading, gender: false });
    }
  };

  const handleInvite = async () => {
    setLoading({ ...loading, invite: true });
    setError('');
    try {
      const response = await invitePartner(partnerEmail || undefined);
      setInviteLink(response.inviteLink);
      setSuccess('Invite link generated! Share it with your partner.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate invite link');
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
      const code = err.response?.data?.code;
      if (code === 'CALENDAR_NOT_CONFIGURED') {
        setError('Google Calendar integration is not yet configured. Please set up Google Cloud OAuth credentials.');
      } else {
        setError('Failed to connect calendar');
      }
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

  const handleSubscribe = async (tier = 'standard') => {
    setLoading({ ...loading, payment: true });
    try {
      const response = await paymentsApi.createCheckout(tier);
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
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Gender
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {[
                { value: 'male', label: '👨 Male' },
                { value: 'female', label: '👩 Female' },
                { value: 'prefer_not_to_say', label: 'Prefer not to say' },
              ].map((option) => (
                <Button
                  key={option.value}
                  size="small"
                  variant={gender === option.value ? 'contained' : 'outlined'}
                  onClick={() => handleGenderUpdate(option.value)}
                  disabled={loading.gender}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    ...(gender !== option.value ? {
                      borderColor: 'divider',
                      color: 'text.secondary',
                    } : {})
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Used to personalize your hormonal wellness assessment
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
                <Box>
                  <Typography variant="body2" sx={{ mb: 1 }} fontWeight="bold">
                    Share this link with your partner:
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
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
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => setInviteLink('')}
                  >
                    Generate New Link
                  </Button>
                </Box>
              ) : (
                <Box>
                  <TextField
                    label="Partner's Email (optional)"
                    type="email"
                    size="small"
                    fullWidth
                    value={partnerEmail}
                    onChange={(e) => setPartnerEmail(e.target.value)}
                    sx={{ mb: 2 }}
                    placeholder="partner@email.com"
                    helperText="We'll include their email on the invite, or leave blank to just generate a link"
                  />
                  <Button
                    variant="contained"
                    startIcon={<PersonAddIcon />}
                    onClick={handleInvite}
                    disabled={loading.invite}
                  >
                    {loading.invite ? <CircularProgress size={20} /> : 'Generate Invite Link'}
                  </Button>
                </Box>
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
                user?.subscriptionStatus === 'premium'
                  ? 'secondary'
                  : user?.subscriptionStatus === 'paid'
                  ? 'success'
                  : user?.subscriptionStatus === 'trial'
                  ? 'primary'
                  : 'error'
              }
            />
            {subscription?.trialDaysRemaining !== null && subscription?.trialDaysRemaining !== undefined && (
              <Typography variant="body2" color="text.secondary">
                {subscription.trialDaysRemaining} days remaining in trial
              </Typography>
            )}
          </Box>

          {user?.subscriptionStatus === 'paid' || user?.subscriptionStatus === 'premium' ? (
            <Box>
              {user?.subscriptionStatus === 'paid' && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Upgrade to Premium</strong> for mediated video meetings with neutral
                    facilitators, included at no extra per-session cost.
                  </Typography>
                  <Button
                    variant="contained"
                    color="secondary"
                    size="small"
                    sx={{ mt: 1 }}
                    onClick={() => handleSubscribe('premium')}
                    disabled={loading.payment}
                  >
                    {loading.payment ? <CircularProgress size={20} /> : 'Upgrade to Premium - $19.99/month'}
                  </Button>
                </Alert>
              )}
              <Box display="flex" gap={2}>
                <Button variant="outlined" onClick={handleManageSubscription}>
                  Manage Subscription
                </Button>
                <Button color="error" onClick={() => setCancelDialog(true)}>
                  Cancel
                </Button>
              </Box>
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Choose a plan to continue using Marriage Rescue:
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Standard</Typography>
                      <Typography variant="h4" color="primary" gutterBottom>
                        $29.99<Typography component="span" variant="body2" color="text.secondary">/mo</Typography>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        Assessments, daily logs, insights, videos, strategies, and reports.
                      </Typography>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<PaymentIcon />}
                        onClick={() => handleSubscribe('standard')}
                        disabled={loading.payment}
                      >
                        {loading.payment ? <CircularProgress size={20} /> : 'Subscribe'}
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined" sx={{ borderColor: 'secondary.main', borderWidth: 2 }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography variant="h6">Premium</Typography>
                      </Box>
                      <Typography variant="h4" color="secondary" gutterBottom>
                        $249<Typography component="span" variant="body2" color="text.secondary">/mo</Typography>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        Everything in Standard, plus mediated video meetings with professional facilitators.
                      </Typography>
                      <Button
                        variant="contained"
                        color="secondary"
                        fullWidth
                        startIcon={<PaymentIcon />}
                        onClick={() => handleSubscribe('premium')}
                        disabled={loading.payment}
                      >
                        {loading.payment ? <CircularProgress size={20} /> : 'Subscribe'}
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined" sx={{ borderColor: 'success.main', borderWidth: 2 }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography variant="h6">Annual Unlimited</Typography>
                        <Chip label="Best Value" size="small" color="success" />
                      </Box>
                      <Typography variant="h4" color="success.main" gutterBottom>
                        $200<Typography component="span" variant="body2" color="text.secondary">/mo</Typography>
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        Unlimited access including all mediated sessions. $2,400/year billed monthly. 12-month commitment.
                      </Typography>
                      <Button
                        variant="contained"
                        color="success"
                        fullWidth
                        startIcon={<PaymentIcon />}
                        onClick={() => handleSubscribe('annual')}
                        disabled={loading.payment}
                      >
                        {loading.payment ? <CircularProgress size={20} /> : 'Subscribe'}
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
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
          ) : calendarStatus?.calendarAvailable === false ? (
            <Tooltip title="Google Calendar integration is not yet configured by the administrator.">
              <span>
                <Button
                  variant="outlined"
                  startIcon={<CalendarTodayIcon />}
                  disabled
                >
                  Connect Calendar
                </Button>
              </span>
            </Tooltip>
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
            <Button variant="text" onClick={() => setLegalDialog('privacy')}>
              Privacy Policy
            </Button>
            <Button variant="text" onClick={() => setLegalDialog('terms')}>
              Terms of Service
            </Button>
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

      {/* Privacy Policy Dialog */}
      <Dialog
        open={legalDialog === 'privacy'}
        onClose={() => setLegalDialog(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Privacy Policy</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom sx={{ mt: 1 }}>
            Marriage Rescue App - Privacy Policy
          </Typography>
          <Typography paragraph variant="body2">
            <strong>Last Updated:</strong> January 2026
          </Typography>
          <Typography paragraph variant="body2">
            <strong>1. Information We Collect</strong><br />
            We collect information you provide directly, including your name, email address,
            assessment responses, daily log entries, and journal entries. We also collect
            usage data such as login times and feature interaction patterns.
          </Typography>
          <Typography paragraph variant="body2">
            <strong>2. How We Use Your Information</strong><br />
            Your data is used to provide personalized relationship assessments, generate
            matchup scores, create tailored strategy plans, and produce progress reports.
            We do not sell your personal information to third parties.
          </Typography>
          <Typography paragraph variant="body2">
            <strong>3. Data Security</strong><br />
            We implement industry-standard security measures including encryption at rest
            and in transit, secure authentication via JWT and optional biometrics (WebAuthn),
            and HIPAA-compliant audit logging for all data access.
          </Typography>
          <Typography paragraph variant="body2">
            <strong>4. Shared Data Within Relationships</strong><br />
            Matchup scores and strategy plans are shared between both partners in a
            relationship unit. Individual assessment responses and journal entries remain
            private unless you explicitly choose to share them.
          </Typography>
          <Typography paragraph variant="body2">
            <strong>5. Third-Party Integrations</strong><br />
            If you connect Google Calendar, we access only calendar event creation
            permissions. If you enable therapist integration, your therapist can view
            shared relationship data and assign tasks with your explicit consent.
          </Typography>
          <Typography paragraph variant="body2">
            <strong>6. Data Retention and Deletion</strong><br />
            Your data is retained as long as your account is active. You may request
            complete deletion of your data by contacting support. Upon account deletion,
            all personal data is permanently removed within 30 days.
          </Typography>
          <Typography paragraph variant="body2">
            <strong>7. Contact</strong><br />
            For privacy inquiries, contact us at privacy@marriagerescue.app.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLegalDialog(null)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Terms of Service Dialog */}
      <Dialog
        open={legalDialog === 'terms'}
        onClose={() => setLegalDialog(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Terms of Service</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom sx={{ mt: 1 }}>
            Marriage Rescue App - Terms of Service
          </Typography>
          <Typography paragraph variant="body2">
            <strong>Last Updated:</strong> January 2026
          </Typography>
          <Typography paragraph variant="body2">
            <strong>1. Acceptance of Terms</strong><br />
            By creating an account and using Marriage Rescue App, you agree to these
            Terms of Service. If you do not agree, do not use the application.
          </Typography>
          <Typography paragraph variant="body2">
            <strong>2. Service Description</strong><br />
            Marriage Rescue App provides relationship assessment tools, daily interaction
            tracking, personalized strategy plans, and progress reports. The app is
            designed for educational and informational purposes only.
          </Typography>
          <Typography paragraph variant="body2">
            <strong>3. Not Professional Therapy</strong><br />
            This app is NOT a substitute for professional therapy, counseling, or medical
            advice. The assessments, strategies, and recommendations are based on general
            relationship science principles. If you are experiencing serious relationship
            difficulties, domestic issues, or mental health concerns, please consult a
            licensed professional.
          </Typography>
          <Typography paragraph variant="body2">
            <strong>4. Subscription and Payments</strong><br />
            After a 14-day free trial, a subscription of $9.99/month per couple is
            required to continue using the app. Payments are processed securely via
            Stripe. You may cancel at any time; access continues until the end of the
            current billing period.
          </Typography>
          <Typography paragraph variant="body2">
            <strong>5. User Responsibilities</strong><br />
            You are responsible for maintaining the confidentiality of your account
            credentials. You agree to provide accurate information and to use the app
            in good faith for its intended purpose.
          </Typography>
          <Typography paragraph variant="body2">
            <strong>6. Limitation of Liability</strong><br />
            Marriage Rescue App and its creators are not liable for any relationship
            outcomes, emotional distress, or decisions made based on app recommendations.
            Use of the app is at your own risk.
          </Typography>
          <Typography paragraph variant="body2">
            <strong>7. Modifications</strong><br />
            We reserve the right to modify these terms at any time. Continued use of
            the app after changes constitutes acceptance of the updated terms.
          </Typography>
          <Typography paragraph variant="body2">
            <strong>8. Contact</strong><br />
            For questions about these terms, contact us at legal@marriagerescue.app.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLegalDialog(null)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;
