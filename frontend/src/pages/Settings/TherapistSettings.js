import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  FormGroup,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Pagination,
  Skeleton,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import HistoryIcon from '@mui/icons-material/History';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PsychologyIcon from '@mui/icons-material/Psychology';
import BadgeIcon from '@mui/icons-material/Badge';
import api from '../../services/api';

const APPROACHES = [
  { id: 'eft', name: 'Emotionally Focused Therapy (EFT)' },
  { id: 'gottman', name: 'Gottman Method' },
  { id: 'cbt', name: 'Cognitive Behavioral Therapy (CBT)' },
  { id: 'psychodynamic', name: 'Psychodynamic' },
  { id: 'integrative', name: 'Integrative' },
];

const TherapistSettings = () => {
  const [profile, setProfile] = useState(null);
  const [notifPrefs, setNotifPrefs] = useState(null);
  const [auditLog, setAuditLog] = useState({ entries: [], total: 0 });
  const [auditPage, setAuditPage] = useState(1);
  const [loading, setLoading] = useState({ profile: true, notif: true, audit: false });
  const [saving, setSaving] = useState({});
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      const response = await api.get('/therapist/profile');
      setProfile(response.data);
    } catch (err) {
      setError('Failed to load therapist profile');
    } finally {
      setLoading((prev) => ({ ...prev, profile: false }));
    }
  }, []);

  const fetchNotifPrefs = useCallback(async () => {
    try {
      const response = await api.get('/therapist/notification-preferences');
      setNotifPrefs(response.data);
    } catch {
      setNotifPrefs({
        crisisAlerts: { push: true, email: true, sms: false },
        sessionPrep: { push: true, email: false, sms: false },
        clientActivity: { push: false, email: false, sms: false },
        weeklyDigest: { push: false, email: true, sms: false },
      });
    } finally {
      setLoading((prev) => ({ ...prev, notif: false }));
    }
  }, []);

  const fetchAuditLog = useCallback(async (page = 1) => {
    setLoading((prev) => ({ ...prev, audit: true }));
    try {
      const response = await api.get('/therapist/audit-log', { params: { page, limit: 10 } });
      setAuditLog(response.data);
    } catch {
      setError('Failed to load audit log');
    } finally {
      setLoading((prev) => ({ ...prev, audit: false }));
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchNotifPrefs();
  }, [fetchProfile, fetchNotifPrefs]);

  const handleProfileChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async () => {
    setSaving((prev) => ({ ...prev, profile: true }));
    setError('');
    try {
      await api.patch('/therapist/profile', {
        licenseType: profile.licenseType,
        licenseState: profile.licenseState,
        licenseNumber: profile.licenseNumber,
        practiceName: profile.practiceName,
        approach: profile.approach,
      });
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving((prev) => ({ ...prev, profile: false }));
    }
  };

  const handleNotifChange = (category, channel) => {
    setNotifPrefs((prev) => ({
      ...prev,
      [category]: { ...prev[category], [channel]: !prev[category][channel] },
    }));
  };

  const handleSaveNotifs = async () => {
    setSaving((prev) => ({ ...prev, notif: true }));
    try {
      await api.patch('/therapist/notification-preferences', notifPrefs);
      setSuccess('Notification preferences saved');
    } catch {
      setError('Failed to save notification preferences');
    } finally {
      setSaving((prev) => ({ ...prev, notif: false }));
    }
  };

  const handleExport = async (format) => {
    setSaving((prev) => ({ ...prev, export: true }));
    try {
      const response = await api.get('/therapist/export', {
        params: { format },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `therapist-data-${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(`Data exported as ${format.toUpperCase()}`);
    } catch {
      setError('Failed to export data');
    } finally {
      setSaving((prev) => ({ ...prev, export: false }));
    }
  };

  const handleAuditPageChange = (_, page) => {
    setAuditPage(page);
    fetchAuditLog(page);
  };

  const renderSkeleton = () => (
    <Box>
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} variant="rectangular" height={56} sx={{ mb: 2, borderRadius: 1 }} />
      ))}
    </Box>
  );

  return (
    <Box maxWidth="md" mx="auto">
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Therapist Settings
      </Typography>

      {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {/* License & Profile */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <BadgeIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            License & Practice
          </Typography>

          {loading.profile ? renderSkeleton() : profile && (
            <Box>
              <TextField
                select
                fullWidth
                label="License Type"
                name="licenseType"
                value={profile.licenseType || ''}
                onChange={handleProfileChange}
                margin="normal"
              >
                {[
                  'LMFT (Licensed Marriage & Family Therapist)',
                  'LPC (Licensed Professional Counselor)',
                  'LCSW (Licensed Clinical Social Worker)',
                  'PsyD (Doctor of Psychology)',
                  'PhD (Clinical Psychology)',
                  'LPCC (Licensed Professional Clinical Counselor)',
                  'Other',
                ].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>

              <TextField
                fullWidth
                label="License Number"
                name="licenseNumber"
                value={profile.licenseNumber || ''}
                onChange={handleProfileChange}
                margin="normal"
              />

              <TextField
                fullWidth
                label="Practice Name"
                name="practiceName"
                value={profile.practiceName || ''}
                onChange={handleProfileChange}
                margin="normal"
              />

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                <PsychologyIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Therapeutic Approach
              </Typography>

              <TextField
                select
                fullWidth
                label="Primary Approach"
                name="approach"
                value={profile.approach || ''}
                onChange={handleProfileChange}
                margin="normal"
              >
                {APPROACHES.map((a) => (
                  <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
                ))}
              </TextField>

              <Button
                variant="contained"
                onClick={handleSaveProfile}
                disabled={saving.profile}
                sx={{ mt: 2 }}
              >
                {saving.profile ? <CircularProgress size={20} /> : 'Save Changes'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <NotificationsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Notification Preferences
          </Typography>
          <Typography color="text.secondary" variant="body2" paragraph>
            Choose how you want to be notified about client activity.
          </Typography>

          {loading.notif ? renderSkeleton() : notifPrefs && (
            <Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Alert Type</TableCell>
                      <TableCell align="center">Push</TableCell>
                      <TableCell align="center">Email</TableCell>
                      <TableCell align="center">SMS</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[
                      { key: 'crisisAlerts', label: 'Crisis Alerts' },
                      { key: 'sessionPrep', label: 'Session Prep Ready' },
                      { key: 'clientActivity', label: 'Client Activity' },
                      { key: 'weeklyDigest', label: 'Weekly Digest' },
                    ].map(({ key, label }) => (
                      <TableRow key={key}>
                        <TableCell>{label}</TableCell>
                        {['push', 'email', 'sms'].map((ch) => (
                          <TableCell key={ch} align="center">
                            <Switch
                              checked={notifPrefs[key]?.[ch] || false}
                              onChange={() => handleNotifChange(key, ch)}
                              size="small"
                              inputProps={{ 'aria-label': `${label} ${ch}` }}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Button
                variant="contained"
                onClick={handleSaveNotifs}
                disabled={saving.notif}
                sx={{ mt: 2 }}
              >
                {saving.notif ? <CircularProgress size={20} /> : 'Save Preferences'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              <HistoryIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Data Access Audit Log
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => fetchAuditLog(1)}
              disabled={loading.audit}
            >
              {loading.audit ? <CircularProgress size={16} /> : 'Load Log'}
            </Button>
          </Box>

          <Typography color="text.secondary" variant="body2" paragraph>
            HIPAA-compliant record of all client data you've accessed.
          </Typography>

          {auditLog.entries.length > 0 ? (
            <Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Client</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Data Type</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {auditLog.entries.map((entry, idx) => (
                      <TableRow key={entry.id || idx}>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {new Date(entry.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>{entry.clientName || 'Unknown'}</TableCell>
                        <TableCell>
                          <Chip label={entry.action} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>{entry.dataType}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {auditLog.total > 10 && (
                <Box display="flex" justifyContent="center" mt={2}>
                  <Pagination
                    count={Math.ceil(auditLog.total / 10)}
                    page={auditPage}
                    onChange={handleAuditPageChange}
                    color="primary"
                  />
                </Box>
              )}
            </Box>
          ) : !loading.audit ? (
            <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No audit entries yet. Access log will appear here as you view client data.
            </Typography>
          ) : null}
        </CardContent>
      </Card>

      {/* Export Data */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <DownloadIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Export Data
          </Typography>
          <Typography color="text.secondary" variant="body2" paragraph>
            Export client data for supervision or insurance documentation.
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={saving.export ? <CircularProgress size={16} /> : <DownloadIcon />}
              onClick={() => handleExport('pdf')}
              disabled={saving.export}
            >
              Export PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={saving.export ? <CircularProgress size={16} /> : <DownloadIcon />}
              onClick={() => handleExport('csv')}
              disabled={saving.export}
            >
              Export CSV
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default TherapistSettings;
