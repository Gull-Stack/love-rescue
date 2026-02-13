import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Chip,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  Collapse,
} from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import PersonIcon from '@mui/icons-material/Person';
import HistoryIcon from '@mui/icons-material/History';
import WarningIcon from '@mui/icons-material/Warning';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import api from '../../services/api';

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

const MyTherapistSection = () => {
  const [therapists, setTherapists] = useState([]);
  const [sharingHistory, setSharingHistory] = useState({ entries: [], total: 0 });
  const [historyPage, setHistoryPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [revokeDialog, setRevokeDialog] = useState(null);
  const [permissionDialog, setPermissionDialog] = useState(null);
  const [newPermission, setNewPermission] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTherapists = useCallback(async () => {
    try {
      const response = await api.get('/client/therapists');
      setTherapists(response.data.therapists || []);
    } catch {
      // No therapists linked — that's fine
      setTherapists([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSharingHistory = useCallback(async (page = 1) => {
    setHistoryLoading(true);
    try {
      const response = await api.get('/client/therapist-sharing-history', {
        params: { page, limit: 10 },
      });
      setSharingHistory(response.data);
    } catch {
      setError('Failed to load sharing history');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTherapists();
  }, [fetchTherapists]);

  const handleChangePermission = async () => {
    if (!permissionDialog || !newPermission) return;
    setActionLoading(true);
    setError('');
    try {
      await api.patch(`/client/therapists/${permissionDialog.id}/permission`, {
        permissionLevel: newPermission,
      });
      setSuccess('Permission level updated');
      setPermissionDialog(null);
      fetchTherapists();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update permission');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeDialog) return;
    setActionLoading(true);
    setError('');
    try {
      await api.delete(`/client/therapists/${revokeDialog.id}`);
      setSuccess('Therapist access revoked');
      setRevokeDialog(null);
      fetchTherapists();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to revoke access');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleHistory = () => {
    if (!showHistory && sharingHistory.entries.length === 0) {
      fetchSharingHistory(1);
    }
    setShowHistory(!showHistory);
  };

  if (loading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Skeleton variant="text" width={200} height={32} />
          <Skeleton variant="rectangular" height={80} sx={{ mt: 2, borderRadius: 1 }} />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <PersonIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            My Therapist
          </Typography>

          {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

          <Alert severity="info" icon={<ShieldIcon />} sx={{ mb: 2 }}>
            <Typography variant="body2">
              Your privacy matters. You control exactly what your therapist sees.
            </Typography>
          </Alert>

          {therapists.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No therapists linked. If your therapist uses Love Rescue, they can send you an invite link.
            </Typography>
          ) : (
            therapists.map((t) => {
              const level = PERMISSION_LEVELS.find((p) => p.value === t.permissionLevel) || PERMISSION_LEVELS[0];
              return (
                <Card key={t.id} variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                      <Box>
                        <Typography fontWeight={600}>
                          {t.therapistName}
                        </Typography>
                        {t.practiceName && (
                          <Typography variant="body2" color="text.secondary">
                            {t.practiceName}
                          </Typography>
                        )}
                        <Typography variant="body2" color="text.secondary">
                          Connected {new Date(t.connectedAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${level.label} Access`}
                        color={level.color}
                        size="small"
                        variant="outlined"
                      />
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {level.description}
                    </Typography>

                    <Box display="flex" gap={1} mt={2} flexWrap="wrap">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setPermissionDialog(t);
                          setNewPermission(t.permissionLevel);
                        }}
                      >
                        Change Permissions
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => setRevokeDialog(t)}
                      >
                        Revoke Access
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              );
            })
          )}

          {/* Sharing History Toggle */}
          <Divider sx={{ my: 2 }} />
          <Button
            onClick={toggleHistory}
            startIcon={<HistoryIcon />}
            endIcon={showHistory ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            size="small"
            sx={{ textTransform: 'none' }}
          >
            Data Sharing History
          </Button>

          <Collapse in={showHistory}>
            <Box mt={2}>
              {historyLoading ? (
                <Box display="flex" justifyContent="center" py={2}>
                  <CircularProgress size={24} />
                </Box>
              ) : sharingHistory.entries.length === 0 ? (
                <Typography color="text.secondary" variant="body2" sx={{ py: 1 }}>
                  No data has been shared yet.
                </Typography>
              ) : (
                <>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Therapist</TableCell>
                          <TableCell>Data Accessed</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sharingHistory.entries.map((entry, idx) => (
                          <TableRow key={entry.id || idx}>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              {new Date(entry.timestamp).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{entry.therapistName}</TableCell>
                            <TableCell>{entry.dataType}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {sharingHistory.total > 10 && (
                    <Box display="flex" justifyContent="center" mt={1}>
                      <Pagination
                        count={Math.ceil(sharingHistory.total / 10)}
                        page={historyPage}
                        onChange={(_, p) => { setHistoryPage(p); fetchSharingHistory(p); }}
                        size="small"
                        color="primary"
                      />
                    </Box>
                  )}
                </>
              )}
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      {/* Change Permission Dialog */}
      <Dialog
        open={!!permissionDialog}
        onClose={() => setPermissionDialog(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Change Sharing Permissions</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" paragraph sx={{ mt: 1 }}>
            Choose what <strong>{permissionDialog?.therapistName}</strong> can see:
          </Typography>
          <FormControl component="fieldset" fullWidth>
            <RadioGroup
              value={newPermission}
              onChange={(e) => setNewPermission(e.target.value)}
            >
              {PERMISSION_LEVELS.map((level) => (
                <FormControlLabel
                  key={level.value}
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
                  sx={{ mb: 1 }}
                />
              ))}
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermissionDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleChangePermission}
            disabled={actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <Dialog
        open={!!revokeDialog}
        onClose={() => setRevokeDialog(null)}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="error" />
            Revoke Therapist Access?
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography paragraph>
            <strong>{revokeDialog?.therapistName}</strong> will immediately lose access to all your shared data.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You can reconnect later if you change your mind by accepting a new invite.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeDialog(null)}>Keep Access</Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleRevoke}
            disabled={actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} /> : 'Revoke Access'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default MyTherapistSection;
