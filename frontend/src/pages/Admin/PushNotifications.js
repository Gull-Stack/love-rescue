import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PeopleIcon from '@mui/icons-material/People';
import StarIcon from '@mui/icons-material/Star';
import TimerIcon from '@mui/icons-material/Timer';
import HeartBrokenIcon from '@mui/icons-material/HeartBroken';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import Diversity1Icon from '@mui/icons-material/Diversity1';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { adminApi } from '../../services/api';

// Cupid Theme Colors
const CUPID = {
  roseGold: '#B76E79',
  burgundy: '#722F37',
  cream: '#FFF8F0',
  blush: '#F8E8E8',
  gold: '#D4AF37',
  deepRose: '#9E4A5A',
  lightRose: '#E8B4BC',
};

// Segment options with icons
const SEGMENTS = [
  { value: 'all', label: 'All Users', icon: <PeopleIcon />, color: CUPID.roseGold },
  { value: 'trial', label: 'Trial Users', icon: <TimerIcon />, color: CUPID.gold },
  { value: 'paid', label: 'Paid Users', icon: <StarIcon />, color: '#10B981' },
  { value: 'expired', label: 'Expired Trials', icon: <HeartBrokenIcon />, color: '#EF4444' },
  { value: 'couples', label: 'Matched Couples', icon: <Diversity1Icon />, color: CUPID.deepRose },
  { value: 'singles', label: 'Without Partner', icon: <PersonOffIcon />, color: '#94A3B8' },
  { value: 'inactive', label: 'Inactive (7+ days)', icon: <PersonOffIcon />, color: '#F59E0B' },
];

// Message templates
const TEMPLATES = [
  { title: '💕 Daily Reminder', body: "Time to check in with your partner! A few minutes of reflection can strengthen your bond." },
  { title: '✨ New Feature', body: "We've added something special! Check out the new [feature] in your dashboard." },
  { title: '💪 Encouragement', body: "You're doing great! Keep up the daily logs and watch your relationship grow stronger." },
  { title: '🎯 Weekly Goal', body: "Start your week strong! Set a relationship goal and track your progress together." },
  { title: '💎 Premium Offer', body: "Unlock advanced insights and therapist features. Upgrade to Premium today!" },
];

const PushNotifications = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState({ title: '', body: '', segment: 'all' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = '📣 Push Notifications | Cupid Command Center';
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getPushStats();
      setStats(res.data.stats);
    } catch (err) {
      setError('Failed to load push stats');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!form.title || !form.body) {
      setError('Title and body are required');
      return;
    }

    try {
      setSending(true);
      setError(null);
      setResult(null);
      
      const res = await adminApi.sendPush({
        title: form.title,
        body: form.body,
        segment: form.segment,
      });

      setResult(res.data);
      // Clear form on success
      if (res.data.sent > 0) {
        setForm({ title: '', body: '', segment: 'all' });
      }
      // Refresh stats
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send notifications');
    } finally {
      setSending(false);
    }
  };

  const applyTemplate = (template) => {
    setForm({ ...form, title: template.title, body: template.body });
  };

  const selectedSegment = SEGMENTS.find(s => s.value === form.segment);

  return (
    <Box sx={{ bgcolor: CUPID.cream, minHeight: '100vh', p: 2 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <IconButton onClick={() => navigate('/admin')} sx={{ color: CUPID.burgundy }}>
          <ArrowBackIcon />
        </IconButton>
        <NotificationsActiveIcon sx={{ fontSize: 28, color: CUPID.roseGold }} />
        <Typography variant="h5" sx={{ fontWeight: 700, color: CUPID.burgundy }}>
          Push Notifications
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {/* Compose Card */}
        <Grid item xs={12} md={7}>
          <Card sx={{ 
            background: `linear-gradient(135deg, white 0%, ${CUPID.blush} 100%)`,
            border: `1px solid ${CUPID.lightRose}`
          }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ color: CUPID.burgundy, fontWeight: 600, mb: 2 }}>
                📝 Compose Message
              </Typography>

              <TextField
                fullWidth
                label="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="💕 Your notification title..."
                sx={{ mb: 2 }}
                InputProps={{
                  sx: { bgcolor: 'white' }
                }}
              />

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Body"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Write your message here..."
                sx={{ mb: 2 }}
                InputProps={{
                  sx: { bgcolor: 'white' }
                }}
              />

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Target Segment</InputLabel>
                <Select
                  value={form.segment}
                  label="Target Segment"
                  onChange={(e) => setForm({ ...form, segment: e.target.value })}
                  sx={{ bgcolor: 'white' }}
                >
                  {SEGMENTS.map((seg) => (
                    <MenuItem key={seg.value} value={seg.value}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {seg.icon}
                        <span>{seg.label}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Selected Segment Preview */}
              {selectedSegment && (
                <Box 
                  sx={{ 
                    p: 2, 
                    bgcolor: `${selectedSegment.color}15`,
                    borderRadius: 2,
                    border: `1px solid ${selectedSegment.color}30`,
                    mb: 2
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    {React.cloneElement(selectedSegment.icon, { sx: { color: selectedSegment.color } })}
                    <Typography sx={{ color: selectedSegment.color, fontWeight: 600 }}>
                      {selectedSegment.label}
                    </Typography>
                  </Box>
                  {stats?.segments && (
                    <Typography variant="caption" sx={{ color: CUPID.deepRose }}>
                      ~{stats.segments[form.segment] || stats.enabledSubscriptions || '?'} subscribers
                    </Typography>
                  )}
                </Box>
              )}

              {/* Results */}
              {result && (
                <Alert 
                  severity={result.sent > 0 ? 'success' : 'info'}
                  icon={result.sent > 0 ? <CheckCircleIcon /> : null}
                  sx={{ mb: 2, bgcolor: result.sent > 0 ? `${CUPID.roseGold}15` : undefined }}
                >
                  {result.message} — Sent: {result.sent}, Failed: {result.failed}
                </Alert>
              )}

              {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={sending ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                onClick={handleSend}
                disabled={sending || !form.title || !form.body}
                sx={{ 
                  bgcolor: CUPID.burgundy,
                  '&:hover': { bgcolor: CUPID.deepRose },
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600
                }}
              >
                {sending ? 'Sending...' : 'Send Notification'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Stats & Templates */}
        <Grid item xs={12} md={5}>
          {/* Stats Card */}
          <Card sx={{ 
            background: `linear-gradient(135deg, ${CUPID.burgundy} 0%, ${CUPID.deepRose} 100%)`,
            color: 'white',
            mb: 2
          }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                📊 Push Stats
              </Typography>
              {loading ? (
                <CircularProgress size={24} sx={{ color: 'white' }} />
              ) : (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {stats?.enabledSubscriptions || 0}
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        Active Subscribers
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h4" sx={{ fontWeight: 700 }}>
                        {stats?.totalSubscriptions || 0}
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        Total Devices
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>

          {/* Templates Card */}
          <Card sx={{ 
            background: `linear-gradient(135deg, white 0%, ${CUPID.blush} 100%)`,
            border: `1px solid ${CUPID.lightRose}`
          }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ color: CUPID.burgundy, fontWeight: 600, mb: 1 }}>
                ⚡ Quick Templates
              </Typography>
              <List dense sx={{ py: 0 }}>
                {TEMPLATES.map((tpl, i) => (
                  <ListItem
                    key={i}
                    button
                    onClick={() => applyTemplate(tpl)}
                    sx={{ 
                      borderRadius: 1, 
                      mb: 0.5,
                      '&:hover': { bgcolor: `${CUPID.roseGold}15` }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 500, color: CUPID.burgundy }}>
                          {tpl.title}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" sx={{ color: CUPID.deepRose }} noWrap>
                          {tpl.body}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>

          {/* Recent Broadcasts */}
          {stats?.recentBroadcasts?.length > 0 && (
            <Card sx={{ 
              mt: 2,
              background: `linear-gradient(135deg, white 0%, ${CUPID.blush} 100%)`,
              border: `1px solid ${CUPID.lightRose}`
            }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ color: CUPID.burgundy, fontWeight: 600, mb: 1 }}>
                  📜 Recent Broadcasts
                </Typography>
                <List dense sx={{ py: 0 }}>
                  {stats.recentBroadcasts.slice(0, 5).map((broadcast) => (
                    <ListItem key={broadcast.id} sx={{ py: 0.5 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {broadcast.sent > 0 ? (
                          <CheckCircleIcon sx={{ color: '#10B981', fontSize: 18 }} />
                        ) : (
                          <ErrorIcon sx={{ color: '#F59E0B', fontSize: 18 }} />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ color: CUPID.burgundy }}>
                            {broadcast.title || 'Untitled'}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" sx={{ color: CUPID.deepRose }}>
                            {broadcast.sent} sent • {new Date(broadcast.timestamp).toLocaleDateString()}
                          </Typography>
                        }
                      />
                      <Chip 
                        label={broadcast.segment || 'all'}
                        size="small"
                        sx={{ fontSize: 10, height: 20 }}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default PushNotifications;
