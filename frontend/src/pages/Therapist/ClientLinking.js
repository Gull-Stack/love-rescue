import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Divider,
  Skeleton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EmailIcon from '@mui/icons-material/Email';
import LinkIcon from '@mui/icons-material/Link';
import ShieldIcon from '@mui/icons-material/Shield';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import BlockIcon from '@mui/icons-material/Block';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const PERMISSION_LEVELS = [
  {
    value: 'basic',
    label: 'Basic',
    description: 'Your therapist sees your assessment scores and activity completion',
    color: 'info',
  },
  {
    value: 'standard',
    label: 'Standard',
    description: '+ mood trends, crisis alerts, and session prep summaries',
    color: 'primary',
  },
  {
    value: 'full',
    label: 'Full Access',
    description: '+ individual responses, journal entries, and messaging',
    color: 'secondary',
  },
];

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'warning', icon: <HourglassEmptyIcon fontSize="small" /> },
  accepted: { label: 'Connected', color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
  declined: { label: 'Declined', color: 'error', icon: <BlockIcon fontSize="small" /> },
  revoked: { label: 'Revoked', color: 'default', icon: <BlockIcon fontSize="small" /> },
};

// ── Therapist View ──────────────────────────────────────────────────────────

const TherapistClientLinking = () => {
  const [inviteLink, setInviteLink] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchInvites = useCallback(async () => {
    try {
      const response = await api.get('/therapist/clients/invites');
      setInvites(response.data.invites || []);
    } catch (err) {
      setError('Failed to load invites');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const handleGenerateInvite = async () => {
    setActionLoading(true);
    setError('');
    try {
      const response = await api.post('/therapist/clients/invite', {
        email: clientEmail || undefined,
      });
      setInviteLink(response.data.inviteLink);
      setSuccess('Invite link generated!');
      setClientEmail('');
      fetchInvites();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate invite');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEmailInvite = () => {
    const subject = encodeURIComponent('Connect with me on Love Rescue');
    const body = encodeURIComponent(
      `I'd like to support your relationship growth through Love Rescue. Use this link to connect with me as your therapist:\n\n${inviteLink}\n\nYou'll have full control over what information you share.`
    );
    window.open(`mailto:${clientEmail}?subject=${subject}&body=${body}`);
  };

  return (
    <Box maxWidth="md" mx="auto">
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Client Connections
      </Typography>
      <Typography color="text.secondary" paragraph>
        Invite clients to connect with you on Love Rescue. They'll control exactly what data they share.
      </Typography>

      {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Generate Invite */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <PersonAddIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Invite a Client
          </Typography>

          {inviteLink ? (
            <Box>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Share this link with your client:
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <TextField
                  value={inviteLink}
                  size="small"
                  fullWidth
                  InputProps={{ readOnly: true }}
                  aria-label="Invite link"
                />
                <Tooltip title={copied ? 'Copied!' : 'Copy link'}>
                  <IconButton onClick={handleCopy} aria-label="Copy invite link">
                    <ContentCopyIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box display="flex" gap={2}>
                <Button
                  variant="outlined"
                  startIcon={<EmailIcon />}
                  onClick={handleEmailInvite}
                  size="small"
                >
                  Send via Email
                </Button>
                <Button variant="text" size="small" onClick={() => setInviteLink('')}>
                  Generate New Link
                </Button>
              </Box>
            </Box>
          ) : (
            <Box>
              <TextField
                label="Client's Email (optional)"
                type="email"
                size="small"
                fullWidth
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@email.com"
                helperText="Pre-fill the invite email, or leave blank to generate a link"
                sx={{ mb: 2 }}
              />
              <Button
                variant="contained"
                startIcon={<LinkIcon />}
                onClick={handleGenerateInvite}
                disabled={actionLoading}
              >
                {actionLoading ? <CircularProgress size={20} /> : 'Generate Invite Link'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Pending / Active Invites */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Invites & Connections
          </Typography>

          {loading ? (
            <Box>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rectangular" height={48} sx={{ mb: 1, borderRadius: 1 }} />
              ))}
            </Box>
          ) : invites.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              No invites yet. Generate an invite link above to get started.
            </Typography>
          ) : (
            <List disablePadding>
              {invites.map((invite, idx) => {
                const status = STATUS_CONFIG[invite.status] || STATUS_CONFIG.pending;
                return (
                  <React.Fragment key={invite.id || idx}>
                    {idx > 0 && <Divider />}
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary={invite.clientName || invite.clientEmail || 'Unnamed Client'}
                        secondary={`Sent ${new Date(invite.createdAt).toLocaleDateString()}`}
                      />
                      <ListItemSecondaryAction>
                        <Chip
                          icon={status.icon}
                          label={status.label}
                          color={status.color}
                          size="small"
                          variant="outlined"
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  </React.Fragment>
                );
              })}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

// ── Client View ─────────────────────────────────────────────────────────────

const ClientLinkingAccept = () => {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const { user } = useAuth();
  const [invite, setInvite] = useState(null);
  const [permissionLevel, setPermissionLevel] = useState('standard');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchInvite = useCallback(async () => {
    try {
      const response = await api.get(`/therapist/clients/invite/${code}`);
      setInvite(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired invite');
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    if (code) {
      fetchInvite();
    } else {
      setError('Invalid invite link');
      setLoading(false);
    }
  }, [code, fetchInvite]);

  const handleAccept = async () => {
    setActionLoading(true);
    setError('');
    try {
      await api.post(`/therapist/clients/invite/${code}/accept`, { permissionLevel });
      setSuccess('Connected! Your therapist can now support your relationship journey.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept invite');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    setActionLoading(true);
    try {
      await api.post(`/therapist/clients/invite/${code}/decline`);
      setSuccess('Invite declined.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to decline invite');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (success) {
    return (
      <Box maxWidth="sm" mx="auto" textAlign="center" py={8}>
        <CheckCircleIcon color="success" sx={{ fontSize: 56, mb: 2 }} />
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          {success}
        </Typography>
        <Typography color="text.secondary" paragraph>
          You can change your sharing preferences anytime from Settings.
        </Typography>
      </Box>
    );
  }

  return (
    <Box maxWidth="sm" mx="auto" py={4}>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {invite && (
        <Card>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Box textAlign="center" mb={3}>
              <ShieldIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                Therapist Connection Request
              </Typography>
              <Typography color="text.secondary">
                <strong>{invite.therapistName}</strong>
                {invite.practiceName && ` from ${invite.practiceName}`}
                {' '}wants to connect with you on Love Rescue.
              </Typography>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }} icon={<ShieldIcon />}>
              <Typography variant="body2" fontWeight="bold">
                Your privacy matters.
              </Typography>
              <Typography variant="body2">
                You control exactly what your therapist sees. You can change or revoke access anytime.
              </Typography>
            </Alert>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Choose what to share
            </Typography>

            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={permissionLevel}
                onChange={(e) => setPermissionLevel(e.target.value)}
              >
                {PERMISSION_LEVELS.map((level) => (
                  <Card
                    key={level.value}
                    variant="outlined"
                    sx={{
                      mb: 1.5,
                      borderColor: permissionLevel === level.value ? `${level.color}.main` : 'divider',
                      borderWidth: permissionLevel === level.value ? 2 : 1,
                      transition: 'all 0.2s',
                    }}
                  >
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <FormControlLabel
                        value={level.value}
                        control={<Radio color={level.color} />}
                        label={
                          <Box>
                            <Typography fontWeight={600}>{level.label}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {level.description}
                            </Typography>
                          </Box>
                        }
                        sx={{ m: 0, width: '100%' }}
                      />
                    </CardContent>
                  </Card>
                ))}
              </RadioGroup>
            </FormControl>

            <Box display="flex" gap={2} mt={3}>
              <Button
                variant="contained"
                fullWidth
                onClick={handleAccept}
                disabled={actionLoading}
              >
                {actionLoading ? <CircularProgress size={24} /> : 'Accept & Connect'}
              </Button>
              <Button
                variant="outlined"
                onClick={handleDecline}
                disabled={actionLoading}
              >
                Decline
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

// ── Exports ─────────────────────────────────────────────────────────────────

export { TherapistClientLinking, ClientLinkingAccept };
export default TherapistClientLinking;
