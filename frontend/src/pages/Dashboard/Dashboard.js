import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  LinearProgress,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VideocamIcon from '@mui/icons-material/Videocam';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import { useAuth } from '../../contexts/AuthContext';
import { logsApi, matchupApi, strategiesApi, assessmentsApi, meetingsApi, paymentsApi, gratitudeApi } from '../../services/api';
import DailyInsight from '../../components/common/DailyInsight';
import DailyVideo from '../../components/common/DailyVideo';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, relationship, invitePartner } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    prompt: null,
    stats: null,
    matchup: null,
    strategy: null,
    assessments: null,
    meetings: [],
    subscription: null,
    gratitude: null,
    gratitudeStreak: null,
    loveNote: null,
  });
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [promptRes, statsRes, assessRes, meetingsRes, subRes, gratTodayRes, gratStreakRes, loveNoteRes] = await Promise.all([
        logsApi.getPrompt().catch(() => ({ data: { prompt: null } })),
        logsApi.getStats('7d').catch(() => ({ data: { stats: null } })),
        assessmentsApi.getResults().catch(() => ({ data: { completed: [], pending: [] } })),
        meetingsApi.getUpcoming().catch(() => ({ data: { meetings: [] } })),
        paymentsApi.getSubscription().catch(() => ({ data: null })),
        gratitudeApi.getToday().catch(() => ({ data: { entry: null } })),
        gratitudeApi.getStreak().catch(() => ({ data: { currentStreak: 0, longestStreak: 0, totalEntries: 0 } })),
        gratitudeApi.getLoveNote().catch(() => ({ data: { loveNote: null } })),
      ]);

      let matchupData = null;
      let strategyData = null;

      const strategyPromise = strategiesApi.getCurrent().catch(() => ({ data: { strategy: null } }));

      if (relationship?.hasPartner) {
        [matchupData, strategyData] = await Promise.all([
          matchupApi.getCurrent().catch(() => ({ data: { matchup: null } })),
          strategyPromise,
        ]);
      } else {
        strategyData = await strategyPromise;
      }

      setData({
        prompt: promptRes.data.prompt,
        hasLoggedToday: promptRes.data.hasLoggedToday,
        stats: statsRes.data.stats,
        matchup: matchupData?.data?.matchup,
        strategy: strategyData?.data?.strategy,
        assessments: assessRes.data,
        meetings: meetingsRes.data.meetings || [],
        subscription: subRes.data,
        gratitude: gratTodayRes.data.entry,
        gratitudeStreak: gratStreakRes.data,
        loveNote: loveNoteRes.data.loveNote,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    try {
      const response = await invitePartner();
      setInviteLink(response.inviteLink);
    } catch (error) {
      console.error('Failed to create invite:', error);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  const totalAssessments = 8;
  const assessmentProgress = data.assessments
    ? (data.assessments.completed.length / totalAssessments) * 100
    : 0;

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Welcome, {user?.firstName || 'there'}!
      </Typography>

      {/* Partner Status */}
      {!relationship?.hasPartner && (
        <Alert
          severity="info"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={handleInvite}>
              Invite Partner
            </Button>
          }
        >
          Your partner hasn't joined yet. Invite them to unlock full features!
        </Alert>
      )}

      {inviteLink && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
              {inviteLink}
            </Typography>
            <Tooltip title={copied ? 'Copied!' : 'Copy link'}>
              <IconButton size="small" onClick={handleCopyLink}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Alert>
      )}

      {/* Strategy Hero Section */}
      {data.strategy ? (
        <Card
          sx={{
            mb: 3,
            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
            color: 'white',
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={3}>
              {/* Left side: Week info + progress ring */}
              <Box flex={1}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <EmojiObjectsIcon />
                  <Typography variant="overline" sx={{ opacity: 0.9 }}>
                    Week {data.strategy.week} of 6
                  </Typography>
                </Box>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  Your Strategy Plan
                </Typography>
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Box position="relative" display="inline-flex">
                    <CircularProgress
                      variant="determinate"
                      value={data.strategy.progress || 0}
                      size={64}
                      thickness={5}
                      sx={{ color: 'rgba(255,255,255,0.9)' }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0, left: 0, bottom: 0, right: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="body2" fontWeight="bold">
                        {data.strategy.progress || 0}%
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Weekly Progress
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.7 }}>
                      {data.strategy.weeklyGoals?.length || 0} goals this week
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate('/strategies')}
                  sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
                >
                  View Full Strategy
                </Button>
              </Box>

              {/* Right side: Today's activities checklist */}
              <Box flex={1}>
                <Typography variant="subtitle2" sx={{ opacity: 0.9, mb: 1 }}>
                  Today's Activities
                </Typography>
                {(() => {
                  const today = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
                  const activities = data.strategy.dailyActivities?.[today] || [];
                  if (activities.length === 0) {
                    return (
                      <Typography variant="body2" sx={{ opacity: 0.7 }}>
                        No activities scheduled for today
                      </Typography>
                    );
                  }
                  return activities.map((activity, idx) => (
                    <FormControlLabel
                      key={idx}
                      control={<Checkbox size="small" sx={{ color: 'rgba(255,255,255,0.7)', '&.Mui-checked': { color: 'white' } }} />}
                      label={<Typography variant="body2">{activity}</Typography>}
                      sx={{ display: 'flex', mb: 0.5 }}
                    />
                  ));
                })()}
              </Box>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ mb: 3, bgcolor: 'background.paper' }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <EmojiObjectsIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              Generate Your Personalized Strategy
            </Typography>
            <Typography color="text.secondary" paragraph>
              {relationship?.hasPartner
                ? 'Create a 6-week plan based on your matchup results to strengthen your relationship.'
                : 'Create a 6-week plan based on your assessments to build stronger relationship skills.'}
            </Typography>
            <Button variant="contained" onClick={() => navigate('/strategies')}>
              Get Started
            </Button>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        {/* Daily Insight */}
        <Grid item xs={12}>
          <DailyInsight />
        </Grid>

        {/* Daily Video */}
        <Grid item xs={12} md={6}>
          <DailyVideo />
        </Grid>

        {/* Meetings Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <VideocamIcon color="primary" />
                <Typography variant="h6">Mediated Meetings</Typography>
              </Box>
              {data.meetings.length > 0 ? (
                <>
                  {data.meetings.slice(0, 1).map((m) => (
                    <Box key={m.id}>
                      <Typography variant="body1" fontWeight="bold">
                        {m.mediator.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {new Date(m.scheduledAt).toLocaleString()}
                      </Typography>
                      {m.meetLink && (
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<VideocamIcon />}
                          href={m.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ mr: 1 }}
                        >
                          Join
                        </Button>
                      )}
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => navigate('/meetings')}
                      >
                        View All
                      </Button>
                    </Box>
                  ))}
                </>
              ) : data.subscription?.isPremium ? (
                <>
                  <Typography color="text.secondary" gutterBottom>
                    Schedule a guided conversation with a neutral facilitator
                  </Typography>
                  <Button variant="outlined" onClick={() => navigate('/meetings')}>
                    Schedule Meeting
                  </Button>
                </>
              ) : (
                <>
                  <Typography color="text.secondary" gutterBottom>
                    Upgrade to Premium for mediated video meetings
                  </Typography>
                  <Button variant="outlined" onClick={() => navigate('/settings')}>
                    Upgrade
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Daily Gratitude Card */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              background: data.gratitude
                ? 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)'
                : 'background.paper',
              border: data.gratitude ? '1px solid #f59e0b' : undefined,
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <VolunteerActivismIcon sx={{ color: '#f59e0b' }} />
                <Typography variant="h6">Daily Gratitude</Typography>
                {data.gratitude && (
                  <Chip label="Done" size="small" sx={{ bgcolor: '#f59e0b', color: '#fff' }} />
                )}
              </Box>
              {data.gratitude ? (
                <>
                  <Typography variant="body1" sx={{ mb: 1, color: '#78350f', fontStyle: 'italic' }}>
                    "{data.gratitude.text}"
                  </Typography>
                  {data.gratitudeStreak?.currentStreak > 0 && (
                    <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                      <LocalFireDepartmentIcon sx={{ color: '#ef4444', fontSize: 20 }} />
                      <Typography variant="body2" fontWeight="bold" sx={{ color: '#ef4444' }}>
                        {data.gratitudeStreak.currentStreak} day streak
                      </Typography>
                    </Box>
                  )}
                  <Button
                    variant="text"
                    onClick={() => navigate('/gratitude')}
                    sx={{ color: '#92400e' }}
                  >
                    View All
                  </Button>
                </>
              ) : (
                <>
                  <Typography color="text.secondary" gutterBottom>
                    What do you appreciate about your partner today?
                  </Typography>
                  {data.gratitudeStreak?.currentStreak > 0 && (
                    <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                      <LocalFireDepartmentIcon sx={{ color: '#ef4444', fontSize: 20 }} />
                      <Typography variant="body2" sx={{ color: '#ef4444' }}>
                        {data.gratitudeStreak.currentStreak} day streak — don't break it!
                      </Typography>
                    </Box>
                  )}
                  <Button
                    variant="contained"
                    onClick={() => navigate('/gratitude')}
                    sx={{ bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' } }}
                  >
                    Log Gratitude
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Weekly Love Note Card */}
        {data.loveNote && (
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fbcfe8 100%)',
                border: '2px solid #f9a8d4',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(244, 114, 182, 0.25)',
                },
              }}
              onClick={() => navigate('/gratitude')}
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <MailOutlineIcon sx={{ color: '#be185d' }} />
                  <Typography variant="h6" sx={{ color: '#9d174d' }}>
                    💌 You have a Love Note!
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: '#9d174d', mb: 1 }}>
                  From {data.loveNote.fromName} · {data.loveNote.entryCount} appreciation{data.loveNote.entryCount !== 1 ? 's' : ''} this week
                </Typography>
                {data.loveNote.entries.length > 0 && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#831843',
                      fontStyle: 'italic',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      mb: 1,
                    }}
                  >
                    "{data.loveNote.entries[0].text}"
                  </Typography>
                )}
                <Button
                  variant="text"
                  size="small"
                  sx={{ color: '#be185d', p: 0, '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' } }}
                >
                  Read your Love Note →
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Daily Prompt Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <TipsAndUpdatesIcon color="primary" />
                <Typography variant="h6">Today's Prompt</Typography>
                {data.hasLoggedToday && (
                  <Chip label="Completed" color="success" size="small" />
                )}
              </Box>
              {data.prompt ? (
                <>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {data.prompt.prompt}
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/daily')}
                  >
                    {data.hasLoggedToday ? 'Update Log' : 'Log Now'}
                  </Button>
                </>
              ) : (
                <Typography color="text.secondary">
                  Complete your assessments to unlock daily prompts
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Stats Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <TrendingUpIcon color="primary" />
                <Typography variant="h6">This Week</Typography>
              </Box>
              {data.stats && data.stats.daysLogged > 0 ? (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="h4" color="primary">
                      {data.stats.avgRatio === 999 ? '∞' : data.stats.avgRatio}:1
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Ratio
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="h4" color="success.main">
                      {data.stats.daysLogged}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Days Logged
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Chip
                      label={`Trend: ${data.stats.trend}`}
                      color={
                        data.stats.trend === 'improving'
                          ? 'success'
                          : data.stats.trend === 'declining'
                          ? 'warning'
                          : 'default'
                      }
                      size="small"
                    />
                  </Grid>
                </Grid>
              ) : (
                <Typography color="text.secondary">
                  Start logging to see your stats
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Assessments Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <AssignmentIcon color="primary" />
                <Typography variant="h6">Assessments</Typography>
              </Box>
              <Box mb={2}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Progress</Typography>
                  <Typography variant="body2">
                    {data.assessments?.completed.length || 0}/{totalAssessments}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={assessmentProgress}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              {data.assessments?.allCompleted ? (
                <Chip label="All Complete" color="success" />
              ) : (
                <Button variant="outlined" onClick={() => navigate('/assessments')}>
                  Continue Assessments
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Matchup Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <FavoriteIcon color="primary" />
                <Typography variant="h6">Matchup Score</Typography>
              </Box>
              {data.matchup ? (
                <>
                  <Typography variant="h3" color="primary" gutterBottom>
                    {data.matchup.score}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {data.matchup.alignments?.length || 0} alignments,{' '}
                    {data.matchup.misses?.length || 0} areas to work on
                  </Typography>
                  <Button
                    variant="text"
                    onClick={() => navigate('/matchup')}
                    sx={{ mt: 1 }}
                  >
                    View Details
                  </Button>
                </>
              ) : (
                <>
                  <Typography color="text.secondary" gutterBottom>
                    {relationship?.hasPartner
                      ? 'Complete all assessments to see your matchup'
                      : 'Invite your partner to see your matchup'}
                  </Typography>
                  {!relationship?.hasPartner && (
                    <Button
                      variant="outlined"
                      startIcon={<PersonAddIcon />}
                      onClick={handleInvite}
                    >
                      Invite Partner
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

      </Grid>
    </Box>
  );
};

export default Dashboard;
