import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import FavoriteIcon from '@mui/icons-material/Favorite';
import StarIcon from '@mui/icons-material/Star';
import BlockIcon from '@mui/icons-material/Block';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { adminApi } from '../../services/api';

const UserDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    subscriptionStatus: '',
    isPlatformAdmin: false,
    isDisabled: false,
  });

  useEffect(() => {
    document.title = 'User Detail | Cupid Admin Center';
    fetchUser();
  }, [id]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getUser(id);
      setUser(response.data.user);
      setEditForm({
        subscriptionStatus: response.data.user.subscriptionStatus,
        isPlatformAdmin: response.data.user.isPlatformAdmin,
        isDisabled: response.data.user.isDisabled,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      await adminApi.updateUser(id, editForm);
      await fetchUser();
      setEditDialogOpen(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const getSubscriptionColor = (status) => {
    switch (status) {
      case 'premium': return 'warning';
      case 'paid': return 'success';
      case 'trial': return 'info';
      case 'expired': return 'error';
      default: return 'default';
    }
  };

  const formatAssessmentType = (type) => {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/admin/users')} sx={{ mb: 2 }}>
          Back to Users
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!user) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/admin/users')} sx={{ mb: 2 }}>
          Back to Users
        </Button>
        <Alert severity="warning">User not found</Alert>
      </Box>
    );
  }

  const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate('/admin/users')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" fontWeight="bold">
            User Details
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={() => setEditDialogOpen(true)}
        >
          Edit User
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Profile Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
                <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: 32, mb: 2 }}>
                  {user.firstName?.[0] || user.email[0].toUpperCase()}
                </Avatar>
                <Typography variant="h5" fontWeight="bold" textAlign="center">
                  {userName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user.email}
                </Typography>
                
                <Box display="flex" gap={1} mt={2} flexWrap="wrap" justifyContent="center">
                  <Chip
                    label={user.subscriptionStatus}
                    color={getSubscriptionColor(user.subscriptionStatus)}
                    icon={user.subscriptionStatus === 'premium' ? <StarIcon /> : undefined}
                  />
                  {user.isPlatformAdmin && (
                    <Chip
                      label="Admin"
                      color="primary"
                      icon={<AdminPanelSettingsIcon />}
                    />
                  )}
                  {user.isDisabled && (
                    <Chip
                      label="Disabled"
                      color="error"
                      icon={<BlockIcon />}
                    />
                  )}
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Auth Provider"
                    secondary={user.authProvider}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Gender"
                    secondary={user.gender || 'Not set'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Joined"
                    secondary={new Date(user.createdAt).toLocaleString()}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Last Active"
                    secondary={user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString() : 'Never'}
                  />
                </ListItem>
                {user.trialEndsAt && (
                  <ListItem>
                    <ListItemText
                      primary="Trial Ends"
                      secondary={new Date(user.trialEndsAt).toLocaleString()}
                    />
                  </ListItem>
                )}
                {user.stripeCustomerId && (
                  <ListItem>
                    <ListItemText
                      primary="Stripe Customer"
                      secondary={user.stripeCustomerId}
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Activity & Relationship */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={3}>
            {/* Activity Stats */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Activity Summary
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Box textAlign="center" p={2} bgcolor="primary.light" borderRadius={2}>
                        <Typography variant="h4" color="primary.main">
                          {user.activityCounts?.dailyLogs || 0}
                        </Typography>
                        <Typography variant="body2">Daily Logs</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box textAlign="center" p={2} bgcolor="warning.light" borderRadius={2}>
                        <Typography variant="h4" color="warning.main">
                          {user.activityCounts?.gratitudeEntries || 0}
                        </Typography>
                        <Typography variant="body2">Gratitude</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box textAlign="center" p={2} bgcolor="info.light" borderRadius={2}>
                        <Typography variant="h4" color="info.main">
                          {user.activityCounts?.videoCompletions || 0}
                        </Typography>
                        <Typography variant="body2">Videos</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Relationship */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                    <FavoriteIcon color="error" />
                    Relationship
                  </Typography>
                  {user.relationship ? (
                    <Box>
                      <Box display="flex" alignItems="center" gap={2} mb={2}>
                        <Chip label={user.relationship.status} color="success" />
                        {user.relationship.sharedConsent && (
                          <Chip label="Shared Consent" variant="outlined" />
                        )}
                      </Box>
                      {user.relationship.partner ? (
                        <Box
                          display="flex"
                          alignItems="center"
                          gap={2}
                          p={2}
                          bgcolor="grey.100"
                          borderRadius={2}
                          sx={{ cursor: 'pointer' }}
                          onClick={() => navigate(`/admin/users/${user.relationship.partner.id}`)}
                        >
                          <Avatar sx={{ bgcolor: 'secondary.main' }}>
                            {user.relationship.partner.name?.[0] || '?'}
                          </Avatar>
                          <Box>
                            <Typography fontWeight="medium">
                              {user.relationship.partner.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {user.relationship.partner.email}
                            </Typography>
                          </Box>
                          <Chip
                            label={`${user.relationship.matchupsCount} matchups`}
                            size="small"
                            sx={{ ml: 'auto' }}
                          />
                        </Box>
                      ) : (
                        <Typography color="text.secondary">
                          No partner linked yet
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Typography color="text.secondary">
                      No relationship record
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Assessments */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                    <AssessmentIcon color="info" />
                    Assessments ({user.assessments?.length || 0})
                  </Typography>
                  {user.assessments?.length > 0 ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Assessment</TableCell>
                            <TableCell>Score Summary</TableCell>
                            <TableCell>Completed</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {user.assessments.map((assessment) => (
                            <TableRow key={assessment.id}>
                              <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                  {formatAssessmentType(assessment.type)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {typeof assessment.score === 'object'
                                    ? JSON.stringify(assessment.score).substring(0, 50) + '...'
                                    : assessment.score}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {new Date(assessment.completedAt).toLocaleDateString()}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography color="text.secondary">
                      No assessments completed
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Recent Daily Logs */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent Daily Logs
                  </Typography>
                  {user.recentLogs?.length > 0 ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell align="center">Positive</TableCell>
                            <TableCell align="center">Negative</TableCell>
                            <TableCell align="center">Ratio</TableCell>
                            <TableCell align="center">Mood</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {user.recentLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell>
                                {new Date(log.date).toLocaleDateString()}
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={log.positiveCount}
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={log.negativeCount}
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                />
                              </TableCell>
                              <TableCell align="center">
                                {log.ratio ? `${log.ratio.toFixed(1)}:1` : '-'}
                              </TableCell>
                              <TableCell align="center">
                                {log.mood || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography color="text.secondary">
                      No daily logs recorded
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Update user settings and permissions for {userName}.
          </DialogContentText>

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Subscription Status</InputLabel>
            <Select
              value={editForm.subscriptionStatus}
              label="Subscription Status"
              onChange={(e) => setEditForm({ ...editForm, subscriptionStatus: e.target.value })}
            >
              <MenuItem value="trial">Trial</MenuItem>
              <MenuItem value="paid">Paid</MenuItem>
              <MenuItem value="premium">Premium</MenuItem>
              <MenuItem value="expired">Expired</MenuItem>
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={editForm.isPlatformAdmin}
                onChange={(e) => setEditForm({ ...editForm, isPlatformAdmin: e.target.checked })}
              />
            }
            label="Platform Admin"
            sx={{ display: 'block', mb: 2 }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={editForm.isDisabled}
                onChange={(e) => setEditForm({ ...editForm, isDisabled: e.target.checked })}
                color="error"
              />
            }
            label="Disable Account"
            sx={{ display: 'block' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveChanges} variant="contained" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserDetail;
