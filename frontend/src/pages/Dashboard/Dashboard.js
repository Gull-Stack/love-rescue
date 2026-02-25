import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  Snackbar,
  Collapse,
  LinearProgress,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
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
  progressRingsApi,
  realTalkApi,
} from '../../services/api';
import DailyInsight from '../../components/common/DailyInsight';
import {
  StreakHero,
  QuickLogFAB,
  PartnerPulse,
  TodayCard,
  ProgressRings,
} from '../../components/dashboard';
import ActionCard from '../../components/dashboard/ActionCard';
import IdentityHint from '../../components/gamification/IdentityHint';
import ExpertInsight from '../../components/gamification/ExpertInsight';

// User progress states
const STATE = {
  BLANK: 'BLANK',
  DISCOVERING: 'DISCOVERING',
  BUILDING: 'BUILDING',
  PRACTICING: 'PRACTICING',
  TRANSFORMED: 'TRANSFORMED',
};

function getUserState({ assessmentsDone, daysActive, streak, strategyCycle }) {
  if (assessmentsDone === 0) return STATE.BLANK;
  if (assessmentsDone < 3 && daysActive < 7) return STATE.DISCOVERING;
  if (daysActive >= 42 || strategyCycle > 1) return STATE.TRANSFORMED;
  if (daysActive >= 14 && streak > 0) return STATE.PRACTICING;
  if (assessmentsDone >= 3) return STATE.BUILDING;
  // Fallback for edge cases (e.g. 1-2 assessments, daysActive >= 7)
  return STATE.DISCOVERING;
}

function getDaysActive(createdAt) {
  if (!createdAt) return 0;
  const created = new Date(createdAt);
  const now = new Date();
  return Math.floor((now - created) / (1000 * 60 * 60 * 24));
}

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
    progressRings: null,
    realTalkCount: 0,
  });
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [bonusCelebration, setBonusCelebration] = useState(false);

  const partnerName = relationship?.partner?.firstName || null;

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
        ringsRes,
        realTalkRes,
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
        progressRingsApi.get().catch(() => ({ data: null })),
        realTalkApi.list({ limit: 1, offset: 0 }).catch(() => ({ data: { pagination: { total: 0 } } })),
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
        progressRings: ringsRes.data,
        realTalkCount: realTalkRes.data?.pagination?.total || 0,
      });
    } catch {
      // Errors handled via fallback data in individual .catch() blocks
    } finally {
      setLoading(false);
    }
  }, [relationship?.hasPartner]);

  useEffect(() => {
    document.title = 'Dashboard | Love Rescue';
    fetchDashboardData();
  }, [fetchDashboardData]);

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

  // Calculate derived state
  const totalAssessments = 10;
  const assessmentsDone = data.assessments?.completed?.length || 0;
  const daysActive = getDaysActive(user?.createdAt);
  const strategyCycle = data.strategy?.cycle || 0;

  const userState = getUserState({
    assessmentsDone,
    daysActive,
    streak: data.streak,
    strategyCycle,
  });

  // Persist state for Layout's dynamic nav
  try {
    localStorage.setItem('lr_user_state', userState);
  } catch {
    // Storage not available
  }

  const showHeader = userState === STATE.PRACTICING || userState === STATE.TRANSFORMED;
  const showProgressRings = userState === STATE.BUILDING || userState === STATE.PRACTICING || userState === STATE.TRANSFORMED;
  const showStreakHero = userState === STATE.PRACTICING || userState === STATE.TRANSFORMED;
  const showFeed = userState === STATE.PRACTICING || userState === STATE.TRANSFORMED;
  const showQuickLogFAB = userState === STATE.BUILDING || userState === STATE.PRACTICING || userState === STATE.TRANSFORMED;
  const showTransformationTeaser = userState === STATE.TRANSFORMED;
  const showAssessmentResults = userState === STATE.DISCOVERING || userState === STATE.BUILDING || userState === STATE.PRACTICING || userState === STATE.TRANSFORMED;
  const showStrategyTeaser = userState === STATE.BUILDING;

  return (
    <Box
      sx={{
        pb: 10,
        maxWidth: 600,
        mx: 'auto',
        overflowX: 'hidden',
      }}
    >
      {/* Warm gradient header — PRACTICING+ states only */}
      {showHeader && (
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
          <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
            Hey, {user?.firstName || 'there'} 👋
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {partnerName
              ? `Let's nurture your connection with ${partnerName}`
              : "Let's build something beautiful today"}
          </Typography>

          {/* Streak Hero — PRACTICING+ */}
          {showStreakHero && (
            <StreakHero streak={data.streak} partnerName={partnerName} />
          )}
        </Box>
      )}

      {/* Partner Pulse — only in PRACTICING+ with partner */}
      {showFeed && relationship?.hasPartner && (
        <Box sx={{ mb: 2 }}>
          <PartnerPulse
            hasPartner={relationship?.hasPartner}
            partnerName={partnerName}
            partnerActive={relationship?.partnerLoggedToday}
            partnerLastSeen={relationship?.partnerLastActive}
            onInvite={handleInvite}
          />
        </Box>
      )}

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

      {/* ActionCard — THE hero card. Always present. */}
      <Box sx={{ mb: 2 }}>
        <ActionCard
          user={user}
          assessmentsDone={assessmentsDone}
          totalAssessments={totalAssessments}
          hasLoggedToday={data.hasLoggedToday}
          hasGratitudeToday={!!data.gratitude}
          hasTriedRealTalk={data.realTalkCount > 0}
          strategy={data.strategy}
          loveNote={data.loveNote}
          partnerName={partnerName}
          streak={data.streak}
        />
      </Box>

      {/* Assessment result cards — DISCOVERING+ */}
      {showAssessmentResults && assessmentsDone > 0 && data.assessments?.completed && (
        <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {data.assessments.completed.slice(0, 3).map((result) => (
            <Card
              key={result.type}
              onClick={() => navigate(`/assessments/results/${result.type}`)}
              sx={{
                cursor: 'pointer',
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
              }}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {result.name || result.type}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {result.summary || 'View your results'}
                    </Typography>
                  </Box>
                  <Chip
                    label={(() => {
                      if (result.primaryStyle) return result.primaryStyle;
                      const s = result.score;
                      if (!s || typeof s !== 'object') return s || 'Done';
                      if (s.style) return s.style.replace(/_/g, ' ');
                      if (s.type) return s.type;
                      if (s.primary) return String(s.primary).replace(/_/g, ' ');
                      if (s.topTwoLabels?.[0]) return String(s.topTwoLabels[0]);
                      if (s.profile) return String(s.profile);
                      if (s.overallHealth != null) return `${s.overallHealth}/100`;
                      if (s.healthLevel) return s.healthLevel.replace(/[-_]/g, ' ');
                      if (s.score != null) return `${s.score}/100`;
                      if (s.overall != null) return `${s.overall}/100`;
                      return 'Complete';
                    })()}
                    size="small"
                    sx={{ bgcolor: '#667eea15', color: '#667eea', fontWeight: 600 }}
                  />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Progress Rings — BUILDING+ */}
      {showProgressRings && (
        <Box sx={{ mb: 2 }}>
          <ProgressRings data={data.progressRings} />
        </Box>
      )}

      {/* System Health — BUILDING+ */}
      {showProgressRings && data.progressRings && (
        <Card sx={{ mb: 2, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography
              variant="caption"
              sx={{ fontFamily: 'monospace', letterSpacing: 1, color: 'text.secondary', display: 'block', mb: 1.5 }}
            >
              SYSTEM HEALTH
            </Typography>
            {[
              { label: 'Connection Processing', key: 'connection' },
              { label: 'Communication Buffer', key: 'communication' },
              { label: 'Conflict Resolution', key: 'conflict_skill' },
            ].map(({ label, key }) => {
              const pct = data.progressRings[key]?.percent ?? 0;
              const barColor = pct > 80 ? '#22c55e' : pct >= 60 ? '#eab308' : '#ef4444';
              return (
                <Box key={key} sx={{ mb: key !== 'conflict_skill' ? 1.5 : 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}>
                      {label}
                    </Typography>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}>
                      {pct}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: 'rgba(0,0,0,0.06)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 3,
                        bgcolor: barColor,
                      },
                    }}
                  />
                </Box>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Strategy teaser — BUILDING state only */}
      {showStrategyTeaser && (
        <Card
          onClick={() => navigate('/strategies')}
          sx={{
            mb: 2,
            cursor: 'pointer',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
          }}
        >
          <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
            <EmojiObjectsIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              {data.strategy
                ? `Strategy: Week ${data.strategy.week}/6`
                : 'Get Your Strategy Plan'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {data.strategy
                ? `${data.strategy.progress || 0}% complete — ${data.strategy.weeklyGoals?.length || 0} goals this week`
                : 'Personalized 6-week roadmap for your relationship'}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Feed section — PRACTICING+ */}
      {showFeed && (
        <>
          {/* Identity Hint */}
          <IdentityHint />

          {/* Expert Insight */}
          <ExpertInsight />

          {/* Love Note highlight */}
          {data.loveNote && (
            <Card
              onClick={() => navigate('/gratitude')}
              sx={{
                mb: 2,
                background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fbcfe8 100%)',
                border: '2px solid #f9a8d4',
                cursor: 'pointer',
                borderRadius: 3,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(244, 114, 182, 0.25)',
                },
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#9d174d', mb: 0.5 }}>
                  💌 Love Note from {data.loveNote.fromName}
                </Typography>
                {data.loveNote.entries?.[0] && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#831843',
                      fontStyle: 'italic',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    &ldquo;{data.loveNote.entries[0].text}&rdquo;
                  </Typography>
                )}
              </CardContent>
            </Card>
          )}

          {/* Daily Insight */}
          <Box sx={{ mb: 2 }}>
            <DailyInsight />
          </Box>
        </>
      )}

      {/* Transformation Mirror teaser — TRANSFORMED only */}
      {showTransformationTeaser && (
        <Card
          onClick={() => navigate('/transformation')}
          sx={{
            mb: 2,
            cursor: 'pointer',
            borderRadius: 3,
            background: 'linear-gradient(135deg, #fdf2f8, #ede9fe)',
            border: '1px solid #e9d5ff',
            '&:hover': { boxShadow: '0 4px 20px rgba(139,92,246,0.15)' },
          }}
        >
          <CardContent sx={{ p: 2.5 }}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <CompareArrowsIcon sx={{ color: '#7c3aed' }} />
              <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#5b21b6' }}>
                Transformation Mirror
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#6b21a8' }}>
              See your THEN vs NOW growth side by side
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Quick Log FAB — BUILDING+ */}
      {showQuickLogFAB && (
        <QuickLogFAB
          onLogComplete={handleQuickLogComplete}
          partnerName={partnerName}
        />
      )}

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
