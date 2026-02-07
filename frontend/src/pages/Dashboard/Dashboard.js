import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  Snackbar,
  Collapse,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import VideocamIcon from '@mui/icons-material/Videocam';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects';
import { useAuth } from '../../contexts/AuthContext';
import { 
  logsApi, 
  matchupApi, 
  strategiesApi, 
  assessmentsApi, 
  meetingsApi, 
  paymentsApi, 
  gratitudeApi,
  streaksApi,
} from '../../services/api';
import DailyInsight from '../../components/common/DailyInsight';
import DailyVideo from '../../components/common/DailyVideo';
import {
  StreakHero,
  QuickLogFAB,
  PartnerPulse,
  TodayCard,
  ProgressRings,
} from '../../components/dashboard';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, relationship, invitePartner } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    prompt: null,
    hasLoggedToday: false,
    stats: null,
    matchup: null,
    strategy: null,
    assessments: null,
    meetings: [],
    subscription: null,
    gratitude: null,
    gratitudeStreak: null,
    loveNote: null,
    streak: 0,
  });
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [showMoreCards, setShowMoreCards] = useState(false);
  const [bonusCelebration, setBonusCelebration] = useState(false);

  // Get partner name from relationship
  const partnerName = relationship?.partner?.firstName || null;

  useEffect(() => {
    document.title = 'Dashboard | Love Rescue';
    fetchDashboardData();
  }, []); // Intentional: run once on mount

  const fetchDashboardData = useCallback(async () => {
    try {
      const [
        promptRes, 
        statsRes, 
        assessRes, 
        meetingsRes, 
        subRes, 
        gratTodayRes, 
        gratStreakRes, 
        loveNoteRes,
        streakRes,
      ] = await Promise.all([
        logsApi.getPrompt().catch(() => ({ data: { prompt: null, hasLoggedToday: false } })),
        logsApi.getStats('7d').catch(() => ({ data: { stats: null } })),
        assessmentsApi.getResults().catch(() => ({ data: { completed: [], pending: [] } })),
        meetingsApi.getUpcoming().catch(() => ({ data: { meetings: [] } })),
        paymentsApi.getSubscription().catch(() => ({ data: null })),
        gratitudeApi.getToday().catch(() => ({ data: { entry: null } })),
        gratitudeApi.getStreak().catch(() => ({ data: { currentStreak: 0, longestStreak: 0, totalEntries: 0 } })),
        gratitudeApi.getLoveNote().catch(() => ({ data: { loveNote: null } })),
        streaksApi.getStreak().catch(() => ({ data: { currentStreak: 0 } })),
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
        hasLoggedToday: promptRes.data.hasLoggedToday || false,
        stats: statsRes.data.stats,
        matchup: matchupData?.data?.matchup,
        strategy: strategyData?.data?.strategy,
        assessments: assessRes.data,
        meetings: meetingsRes.data.meetings || [],
        subscription: subRes.data,
        gratitude: gratTodayRes.data.entry,
        gratitudeStreak: gratStreakRes.data,
        loveNote: loveNoteRes.data.loveNote,
        streak: streakRes.data.currentStreak || gratStreakRes.data.currentStreak || 0,
      });
    } catch {
      // Errors handled via fallback data in individual .catch() blocks
    } finally {
      setLoading(false);
    }
  }, [relationship?.hasPartner]);

  const handleInvite = async () => {
    try {
      const response = await invitePartner();
      setInviteLink(response.inviteLink);
    } catch {
      // Invite creation failed
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickLogComplete = (isBonus) => {
    // Refresh data after quick log
    fetchDashboardData();
    if (isBonus) {
      setBonusCelebration(true);
    }
  };

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="60vh"
        flexDirection="column"
        gap={2}
      >
        <CircularProgress size={48} />
        <Typography color="text.secondary">Loading your dashboard...</Typography>
      </Box>
    );
  }

  // Calculate stats
  const totalAssessments = 10;
  const assessmentsDone = data.assessments?.completed?.length || 0;
  const logsThisWeek = data.stats?.daysLogged || 0;
  const gratitudeThisWeek = data.gratitudeStreak?.totalEntries 
    ? Math.min(data.gratitudeStreak.totalEntries, 7) 
    : 0;

  return (
    <Box
      sx={{
        pb: 10, // Space for FAB
        maxWidth: 600,
        mx: 'auto',
        overflowX: 'hidden', // Prevent horizontal scroll
      }}
    >
      {/* Warm gradient header area */}
      <Box
        sx={{
          background: 'linear-gradient(180deg, #FFF0EB 0%, #ffffff 100%)',
          mx: -3,
          mt: -3,
          px: 3,
          pt: 3,
          pb: 2,
          mb: 2,
        }}
      >
        {/* Personalized greeting */}
        <Typography 
          variant="h5" 
          fontWeight="bold" 
          sx={{ mb: 0.5 }}
        >
          Hey, {user?.firstName || 'there'} 👋
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ mb: 2 }}
        >
          {partnerName 
            ? `Let's nurture your connection with ${partnerName}` 
            : "Let's build something beautiful today"
          }
        </Typography>

        {/* Streak Hero - TOP priority placement */}
        <StreakHero 
          streak={data.streak} 
          partnerName={partnerName}
        />
      </Box>

      {/* Partner Pulse - Right below streak */}
      <Box sx={{ mb: 2 }}>
        <PartnerPulse
          hasPartner={relationship?.hasPartner}
          partnerName={partnerName}
          partnerActive={relationship?.partnerLoggedToday}
          partnerLastSeen={relationship?.partnerLastActive}
          onInvite={handleInvite}
        />
      </Box>

      {/* Invite link alert */}
      <Collapse in={!!inviteLink}>
        <Alert severity="success" sx={{ mb: 2, borderRadius: 3 }}>
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Typography variant="body2" sx={{ wordBreak: 'break-all', flex: 1 }}>
              {inviteLink}
            </Typography>
            <Tooltip title={copied ? 'Copied!' : 'Copy link'}>
              <IconButton size="small" aria-label="Copy invite link" onClick={handleCopyLink}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Alert>
      </Collapse>

      {/* Today Card - Single focus CTA */}
      <Box sx={{ mb: 2 }}>
        <TodayCard
          hasLoggedToday={data.hasLoggedToday}
          hasGratitudeToday={!!data.gratitude}
          assessmentsDone={assessmentsDone}
          totalAssessments={totalAssessments}
          prompt={data.prompt}
          partnerName={partnerName}
        />
      </Box>

      {/* Progress Rings */}
      <Box sx={{ mb: 2 }}>
        <ProgressRings
          logsThisWeek={logsThisWeek}
          assessmentsDone={assessmentsDone}
          totalAssessments={totalAssessments}
          gratitudeThisWeek={gratitudeThisWeek}
        />
      </Box>

      {/* Love Note - Special highlight if present */}
      {data.loveNote && (
        <Card
          onClick={() => navigate('/gratitude')}
          sx={{
            mb: 2,
            background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fbcfe8 100%)',
            border: '2px solid #f9a8d4',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 25px rgba(244, 114, 182, 0.25)',
            },
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <MailOutlineIcon sx={{ color: '#be185d' }} />
              <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#9d174d' }}>
                💌 You have a Love Note!
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#9d174d' }}>
              From {data.loveNote.fromName} · {data.loveNote.entryCount} appreciation{data.loveNote.entryCount !== 1 ? 's' : ''} this week
            </Typography>
            {data.loveNote.entries?.[0] && (
              <Typography
                variant="body2"
                sx={{
                  color: '#831843',
                  fontStyle: 'italic',
                  mt: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                "{data.loveNote.entries[0].text}"
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Daily Insight - Compact */}
      <Box sx={{ mb: 2 }}>
        <DailyInsight />
      </Box>

      {/* Expandable "More" section */}
      <Box sx={{ mb: 2 }}>
        <Button
          fullWidth
          variant="text"
          onClick={() => setShowMoreCards(!showMoreCards)}
          endIcon={showMoreCards ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{ 
            color: 'text.secondary',
            py: 1,
            borderRadius: 2,
            bgcolor: 'background.paper',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          {showMoreCards ? 'Show less' : 'More features'}
        </Button>

        <Collapse in={showMoreCards}>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Daily Video */}
            <DailyVideo />

            {/* Strategy Card - Simplified */}
            {data.strategy ? (
              <Card 
                onClick={() => navigate('/strategies')}
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.12)' },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <EmojiObjectsIcon sx={{ color: '#1976d2' }} />
                    <Typography variant="subtitle1" fontWeight="bold">
                      Strategy Plan
                    </Typography>
                    <Chip 
                      label={`Week ${data.strategy.week}/6`} 
                      size="small" 
                      sx={{ ml: 'auto' }}
                    />
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                      <CircularProgress
                        variant="determinate"
                        value={data.strategy.progress || 0}
                        size={48}
                        thickness={5}
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
                        <Typography variant="caption" fontWeight="bold">
                          {data.strategy.progress || 0}%
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {data.strategy.weeklyGoals?.length || 0} goals this week
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            ) : (
              <Card 
                onClick={() => navigate('/strategies')}
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.12)' },
                }}
              >
                <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                  <EmojiObjectsIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Get Your Strategy Plan
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Personalized 6-week roadmap for your relationship
                  </Typography>
                </CardContent>
              </Card>
            )}

            {/* Meetings Card - Simplified */}
            <Card 
              onClick={() => navigate('/meetings')}
              sx={{ 
                cursor: 'pointer',
                '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.12)' },
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <VideocamIcon sx={{ color: '#9c27b0' }} />
                  <Typography variant="subtitle1" fontWeight="bold">
                    Mediated Meetings
                  </Typography>
                  {data.meetings.length > 0 && (
                    <Chip 
                      label={`${data.meetings.length} upcoming`} 
                      size="small" 
                      color="secondary"
                      sx={{ ml: 'auto' }}
                    />
                  )}
                </Box>
                {data.meetings.length > 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Next: {new Date(data.meetings[0].scheduledAt).toLocaleDateString()} with {data.meetings[0].mediator?.name}
                  </Typography>
                ) : data.subscription?.isPremium ? (
                  <Typography variant="body2" color="text.secondary">
                    Schedule a guided conversation with a facilitator
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Premium feature — facilitated video sessions
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* Matchup Score - If available */}
            {data.matchup && (
              <Card 
                onClick={() => navigate('/matchup')}
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.12)' },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="overline" color="text.secondary">
                        Matchup Score
                      </Typography>
                      <Typography variant="h4" color="primary" fontWeight="bold">
                        {data.matchup.score}%
                      </Typography>
                    </Box>
                    <Box textAlign="right">
                      <Typography variant="body2" color="success.main">
                        {data.matchup.alignments?.length || 0} alignments
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {data.matchup.misses?.length || 0} growth areas
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        </Collapse>
      </Box>

      {/* Quick Log FAB - Always visible in thumb zone */}
      <QuickLogFAB 
        onLogComplete={handleQuickLogComplete}
        partnerName={partnerName}
      />

      {/* Bonus celebration snackbar */}
      <Snackbar
        open={bonusCelebration}
        autoHideDuration={4000}
        onClose={() => setBonusCelebration(false)}
        message="🎊 BONUS! You're on a roll! Keep it up!"
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />
    </Box>
  );
};

export default Dashboard;
