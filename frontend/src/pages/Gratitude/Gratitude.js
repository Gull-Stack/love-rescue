import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import ShareIcon from '@mui/icons-material/Share';
import { gratitudeApi } from '../../services/api';

const CATEGORIES = [
  { label: 'Kindness', value: 'kindness', emoji: '💛' },
  { label: 'Effort', value: 'effort', emoji: '💪' },
  { label: 'Humor', value: 'humor', emoji: '😂' },
  { label: 'Presence', value: 'presence', emoji: '🤗' },
  { label: 'Support', value: 'support', emoji: '🤝' },
  { label: 'Growth', value: 'growth', emoji: '🌱' },
  { label: 'Love', value: 'love', emoji: '❤️' },
];

const Gratitude = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  const [todayEntry, setTodayEntry] = useState(null);
  const [streakData, setStreakData] = useState({ currentStreak: 0, longestStreak: 0, totalEntries: 0 });
  const [history, setHistory] = useState([]);
  const [sharedEntries, setSharedEntries] = useState([]);
  const [hasPartner, setHasPartner] = useState(false);

  const [text, setText] = useState('');
  const [category, setCategory] = useState(null);

  useEffect(() => {
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAllData = async () => {
    try {
      const [todayRes, streakRes, historyRes, sharedRes] = await Promise.all([
        gratitudeApi.getToday().catch(() => ({ data: { entry: null } })),
        gratitudeApi.getStreak().catch(() => ({ data: { currentStreak: 0, longestStreak: 0, totalEntries: 0 } })),
        gratitudeApi.getHistory({ limit: 30 }).catch(() => ({ data: { entries: [] } })),
        gratitudeApi.getShared().catch(() => ({ data: { entries: [], hasPartner: false } })),
      ]);

      const entry = todayRes.data.entry;
      setTodayEntry(entry);
      if (entry) {
        setText(entry.text);
        setCategory(entry.category);
      }
      setStreakData(streakRes.data);
      setHistory(historyRes.data.entries);
      setSharedEntries(sharedRes.data.entries);
      setHasPartner(sharedRes.data.hasPartner);
    } catch (err) {
      setError('Failed to load gratitude data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!text.trim()) {
      setError('Please write something you appreciate about your partner');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await gratitudeApi.submitEntry({ text: text.trim(), category });
      setTodayEntry(res.data.entry);
      setEditing(false);
      setSuccess(todayEntry ? 'Gratitude updated! 💛' : 'Gratitude saved! 💛');

      // Refresh streak and history
      const [streakRes, historyRes] = await Promise.all([
        gratitudeApi.getStreak().catch(() => ({ data: streakData })),
        gratitudeApi.getHistory({ limit: 30 }).catch(() => ({ data: { entries: history } })),
      ]);
      setStreakData(streakRes.data);
      setHistory(historyRes.data.entries);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save gratitude entry');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleShare = async (entryId) => {
    try {
      const res = await gratitudeApi.toggleShare(entryId);
      // Update today entry if it's the one toggled
      if (todayEntry && todayEntry.id === entryId) {
        setTodayEntry(res.data.entry);
      }
      // Update in history
      setHistory(prev => prev.map(e => e.id === entryId ? res.data.entry : e));
    } catch (err) {
      setError('Failed to toggle sharing');
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const showForm = !todayEntry || editing;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: isMobile ? '80px' : 0 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <VolunteerActivismIcon sx={{ fontSize: 32, color: '#f59e0b' }} />
        <Typography variant="h4" fontWeight="bold">
          Daily Gratitude
        </Typography>
      </Box>
      <Typography color="text.secondary" paragraph>
        Strengthen your bond by appreciating the little things.
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

      <Grid container spacing={3}>
        {/* Today's Gratitude Section */}
        <Grid item xs={12}>
          <Card
            sx={{
              background: showForm
                ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%)'
                : 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
              border: '1px solid',
              borderColor: '#f59e0b',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              {showForm ? (
                /* Entry Form */
                <>
                  <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: '#92400e' }}>
                    {todayEntry ? 'Edit Your Gratitude' : "What's one thing you appreciate about your partner today?"}
                  </Typography>

                  <TextField
                    multiline
                    minRows={3}
                    maxRows={6}
                    fullWidth
                    placeholder="Today I'm grateful for..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255,255,255,0.8)',
                      },
                    }}
                  />

                  <Typography variant="subtitle2" sx={{ mb: 1, color: '#92400e' }}>
                    Category (optional)
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                    {CATEGORIES.map((cat) => (
                      <Chip
                        key={cat.value}
                        label={`${cat.emoji} ${cat.label}`}
                        onClick={() => setCategory(category === cat.value ? null : cat.value)}
                        color={category === cat.value ? 'warning' : 'default'}
                        variant={category === cat.value ? 'filled' : 'outlined'}
                        sx={{
                          fontWeight: category === cat.value ? 'bold' : 'normal',
                          '&:hover': { bgcolor: '#fef3c7' },
                        }}
                      />
                    ))}
                  </Box>

                  <Box display="flex" gap={2}>
                    <Button
                      variant="contained"
                      startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                      onClick={handleSubmit}
                      disabled={saving || !text.trim()}
                      sx={{
                        bgcolor: '#f59e0b',
                        color: '#fff',
                        '&:hover': { bgcolor: '#d97706' },
                      }}
                    >
                      {saving ? 'Saving...' : todayEntry ? 'Update' : 'Save Gratitude'}
                    </Button>
                    {todayEntry && (
                      <Button variant="outlined" onClick={() => { setEditing(false); setText(todayEntry.text); setCategory(todayEntry.category); }}>
                        Cancel
                      </Button>
                    )}
                  </Box>
                </>
              ) : (
                /* Today's Entry Display */
                <>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1}>
                      <Typography variant="overline" sx={{ color: '#92400e' }}>
                        Today's Gratitude ✨
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 1, mb: 1, fontSize: '1.1rem', color: '#78350f' }}>
                        "{todayEntry.text}"
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1} mt={1}>
                        {todayEntry.category && (
                          <Chip
                            label={`${CATEGORIES.find(c => c.value === todayEntry.category)?.emoji || '✨'} ${todayEntry.category}`}
                            size="small"
                            sx={{ bgcolor: '#fef3c7', color: '#92400e' }}
                          />
                        )}
                      </Box>
                    </Box>
                    <Box display="flex" gap={0.5}>
                      <Tooltip title={todayEntry.isShared ? 'Shared with partner' : 'Share with partner'}>
                        <IconButton
                          onClick={() => handleToggleShare(todayEntry.id)}
                          sx={{ color: todayEntry.isShared ? '#e11d48' : '#9ca3af' }}
                        >
                          {todayEntry.isShared ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton onClick={() => setEditing(true)} sx={{ color: '#92400e' }}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Streak Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4} sx={{ textAlign: 'center' }}>
                  <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                    <LocalFireDepartmentIcon sx={{ fontSize: 40, color: '#ef4444' }} />
                    <Typography variant="h3" fontWeight="bold" sx={{ color: '#ef4444' }}>
                      {streakData.currentStreak}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Current Streak
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={4} sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight="bold" color="primary">
                    {streakData.longestStreak}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Longest Streak
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={4} sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight="bold" color="primary">
                    {streakData.totalEntries}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Entries
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Partner's Shared Gratitudes */}
        {hasPartner && sharedEntries.length > 0 && (
          <Grid item xs={12}>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FavoriteIcon sx={{ color: '#e11d48' }} />
              From Your Partner
            </Typography>
            <Grid container spacing={2}>
              {sharedEntries.map((entry) => (
                <Grid item xs={12} sm={6} key={entry.id}>
                  <Card
                    sx={{
                      background: 'linear-gradient(135deg, #fce7f3 0%, #fdf2f8 100%)',
                      border: '1px solid #f9a8d4',
                    }}
                  >
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(entry.date)}
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 0.5, color: '#831843' }}>
                        "{entry.text}"
                      </Typography>
                      {entry.category && (
                        <Chip
                          label={entry.category}
                          size="small"
                          sx={{ mt: 1, bgcolor: '#fce7f3', color: '#9d174d' }}
                        />
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>
        )}

        {/* History Section */}
        {history.length > 0 && (
          <Grid item xs={12}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Your Gratitude History
            </Typography>
            <Grid container spacing={2}>
              {history.map((entry) => (
                <Grid item xs={12} sm={6} md={4} key={entry.id}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(entry.date)}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          {entry.isShared && (
                            <Tooltip title="Shared with partner">
                              <ShareIcon sx={{ fontSize: 16, color: '#e11d48' }} />
                            </Tooltip>
                          )}
                          <Tooltip title={entry.isShared ? 'Unshare' : 'Share with partner'}>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleShare(entry.id)}
                              sx={{ color: entry.isShared ? '#e11d48' : '#d1d5db' }}
                            >
                              {entry.isShared ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        {entry.text}
                      </Typography>
                      {entry.category && (
                        <Chip
                          label={`${CATEGORIES.find(c => c.value === entry.category)?.emoji || '✨'} ${entry.category}`}
                          size="small"
                          sx={{ mt: 1 }}
                          variant="outlined"
                        />
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default Gratitude;
