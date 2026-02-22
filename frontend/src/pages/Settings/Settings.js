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
  LinearProgress,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from '../../contexts/AuthContext';
import api, { calendarApi, therapistApi, progressRingsApi } from '../../services/api';
import MyTherapistSection from './MyTherapistSection';

const Settings = () => {
  const [searchParams] = useSearchParams();
  const { user, relationship, invitePartner, refreshUser, biometricEnabled, checkBiometricAvailability, registerBiometric } = useAuth();
  const [loading, setLoading] = useState({});
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState(null);
  const [therapistConsent, setTherapistConsent] = useState(false);
  const [legalDialog, setLegalDialog] = useState(null); // 'privacy' or 'terms'
  const [gender, setGender] = useState(user?.gender || '');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);

  useEffect(() => {
    document.title = 'Settings | Love Rescue';
    fetchSettings();
    handleUrlParams();
    checkBiometricSupport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkBiometricSupport = async () => {
    const available = await checkBiometricAvailability();
    setBiometricAvailable(available);
  };

  const handleSetupBiometric = async () => {
    setLoading({ ...loading, biometric: true });
    setError('');
    try {
      await registerBiometric();
      setSuccess('Biometric authentication enabled! You can now sign in with Face ID or Touch ID.');
    } catch (err) {
      setError(err.message || 'Failed to set up biometric authentication');
    } finally {
      setLoading({ ...loading, biometric: false });
    }
  };

  const handleUrlParams = () => {
    const payment = searchParams.get('payment');
    const calendar = searchParams.get('calendar');

    if (payment === 'success') {
      setSuccess('Payment information received.');
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
      const [calRes, consentRes, ringsRes] = await Promise.all([
        calendarApi.getStatus().catch(() => ({ data: { connected: false } })),
        therapistApi.getConsent().catch(() => ({ data: { consent: false } })),
        progressRingsApi.get().catch(() => ({ data: null })),
      ]);

      setCalendarStatus(calRes.data);
      setTherapistConsent(consentRes.data.consent);
      if (ringsRes.data) {
        const rings = ringsRes.data;
        const connPct = rings.connection?.percent ?? 0;
        const commPct = rings.communication?.percent ?? 0;
        const conflictPct = rings.conflict_skill?.percent ?? 0;
        const avg = Math.round((connPct + commPct + conflictPct) / 3);
        setSystemStatus({ healthScore: avg, connection: connPct, communication: commPct, conflict: conflictPct });
      }
    } catch {
      // Settings fetch failed — individual catches above provide fallback defaults
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

      {/* Relationship OS Header */}
      <Typography
        variant="overline"
        sx={{
          display: 'block',
          mb: 2,
          fontFamily: 'monospace',
          letterSpacing: 2,
          color: 'text.secondary',
          fontSize: '0.75rem',
        }}
      >
        RELATIONSHIP OS v2.0
      </Typography>

      {/* System Status Card */}
      <Card sx={{ mb: 3, border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontFamily: 'monospace' }}>
            System Status
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Last sync</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {user?.lastActiveAt
                  ? (() => {
                      const mins = Math.round((Date.now() - new Date(user.lastActiveAt).getTime()) / 60000);
                      if (mins < 1) return 'just now';
                      if (mins < 60) return `${mins}m ago`;
                      const hrs = Math.round(mins / 60);
                      if (hrs < 24) return `${hrs}h ago`;
                      return `${Math.round(hrs / 24)}d ago`;
                    })()
                  : 'N/A'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Health score</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {systemStatus ? `${systemStatus.healthScore}%` : '—'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Active processes</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>3</Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

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

      {/* Security / Biometric Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Security
          </Typography>
          
          {/* Biometric Authentication */}
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Biometric Authentication
            </Typography>
            {!biometricAvailable ? (
              <Typography variant="body2" color="text.secondary">
                Face ID / Touch ID is not available on this device.
              </Typography>
            ) : biometricEnabled ? (
              <Box display="flex" alignItems="center" gap={1}>
                <CheckCircleIcon color="success" />
                <Typography color="success.main" fontWeight="medium">
                  Biometrics Enabled ✓
                </Typography>
              </Box>
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Enable Face ID or Touch ID for quick and secure sign-in, especially when using the app as a PWA.
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={loading.biometric ? <CircularProgress size={20} /> : <FingerprintIcon />}
                  onClick={handleSetupBiometric}
                  disabled={loading.biometric}
                >
                  {loading.biometric ? 'Setting up...' : 'Set Up Biometrics'}
                </Button>
              </Box>
            )}
          </Box>

          {/* Password Change (for non-Google users) */}
          {user?.authProvider !== 'google' && (
            <Box mt={3}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Password
              </Typography>
              <Button variant="text" color="primary" size="small">
                Change Password
              </Button>
            </Box>
          )}
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
                      <IconButton aria-label="Copy invite link" onClick={handleCopyLink}>
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

      {/* Therapist Access — Full Consent Management */}
      <MyTherapistSection />

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
            Love Rescue App - Privacy Policy
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
            For privacy inquiries, contact us at privacy@loverescue.app.
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
            Love Rescue App - Terms of Service
          </Typography>
          <Typography paragraph variant="body2">
            <strong>Last Updated:</strong> January 2026
          </Typography>
          <Typography paragraph variant="body2">
            <strong>1. Acceptance of Terms</strong><br />
            By creating an account and using Love Rescue App, you agree to these
            Terms of Service. If you do not agree, do not use the application.
          </Typography>
          <Typography paragraph variant="body2">
            <strong>2. Service Description</strong><br />
            Love Rescue App provides relationship assessment tools, daily interaction
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
            <strong>4. Access and Features</strong><br />
            LoveRescue is provided free of charge. All features are available to all users
            at no cost. There are no subscriptions, paywalls, or in-app purchases.
          </Typography>
          <Typography paragraph variant="body2">
            <strong>5. User Responsibilities</strong><br />
            You are responsible for maintaining the confidentiality of your account
            credentials. You agree to provide accurate information and to use the app
            in good faith for its intended purpose.
          </Typography>
          <Typography paragraph variant="body2">
            <strong>6. Limitation of Liability</strong><br />
            Love Rescue App and its creators are not liable for any relationship
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
            For questions about these terms, contact us at legal@loverescue.app.
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
