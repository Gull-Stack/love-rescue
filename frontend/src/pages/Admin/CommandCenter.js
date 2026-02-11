import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Alert,
  Chip,
  LinearProgress,
  Avatar,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import StarIcon from '@mui/icons-material/Star';
import DiamondIcon from '@mui/icons-material/Diamond';
import { adminApi } from '../../services/api';

// Stage config
const STAGES = [
  { key: 'assess', label: 'Assess', icon: '🔍', color: '#f093fb', desc: '0-2 assessments' },
  { key: 'learn', label: 'Learn', icon: '📚', color: '#a18cd1', desc: '3+ assessments, week 1-2' },
  { key: 'practice', label: 'Practice', icon: '💪', color: '#f5576c', desc: 'Week 3+, 7+ streak' },
  { key: 'transform', label: 'Transform', icon: '✨', color: '#ff6b6b', desc: 'Week 5+, 14+ streak' },
];

const STAGE_COLOR_MAP = {
  assess: '#f093fb',
  learn: '#a18cd1',
  practice: '#f5576c',
  transform: '#ff6b6b',
};

const formatDate = (d) => {
  if (!d) return 'Never';
  const date = new Date(d);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const CommandCenter = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeStage, setActiveStage] = useState(null); // null = all
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminApi.getCommandCenter();
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load command center');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    let users = data.users;
    if (activeStage) users = users.filter(u => u.stage === activeStage);
    if (search) {
      const q = search.toLowerCase();
      users = users.filter(u =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        u.email.toLowerCase().includes(q)
      );
    }
    // Sort: most recently active first
    return users.sort((a, b) => new Date(b.lastActiveAt || 0) - new Date(a.lastActiveAt || 0));
  }, [data, activeStage, search]);

  const summaryStats = useMemo(() => {
    if (!data || !data.users.length) return null;
    const users = data.users;
    const avgAssessments = (users.reduce((s, u) => s + u.assessmentsCompleted, 0) / users.length).toFixed(1);
    const avgStreak = (users.reduce((s, u) => s + u.dailyLogStreak, 0) / users.length).toFixed(1);
    const premiumPct = ((users.filter(u => u.isPremium).length / users.length) * 100).toFixed(0);
    return { avgAssessments, avgStreak, premiumPct };
  }, [data]);

  if (loading && !data) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress sx={{ color: '#f093fb' }} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} sx={{
            background: 'linear-gradient(135deg, #f093fb, #f5576c)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            🚀 Command Center
          </Typography>
          <Typography variant="body2" color="text.secondary">
            User journey pipeline — {data?.totalUsers || 0} total users
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchData} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Stage Pipeline */}
      <Grid container spacing={2} mb={3}>
        {STAGES.map((stage, i) => {
          const count = data?.stageCounts?.[stage.key] || 0;
          const isActive = activeStage === stage.key;
          const pct = data?.totalUsers ? Math.round((count / data.totalUsers) * 100) : 0;
          return (
            <Grid item xs={6} md={3} key={stage.key}>
              <Card
                onClick={() => setActiveStage(isActive ? null : stage.key)}
                sx={{
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  border: isActive ? `2px solid ${stage.color}` : '2px solid transparent',
                  background: isActive
                    ? `linear-gradient(135deg, ${stage.color}15, ${stage.color}08)`
                    : 'background.paper',
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 4px 20px ${stage.color}30` },
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography fontSize={28}>{stage.icon}</Typography>
                  <Typography variant="h4" fontWeight={800} sx={{ color: stage.color }}>
                    {count}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>{stage.label}</Typography>
                  <Typography variant="caption" color="text.secondary">{pct}%</Typography>
                  {/* Progress bar showing funnel */}
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{
                      mt: 1, height: 4, borderRadius: 2,
                      bgcolor: `${stage.color}20`,
                      '& .MuiLinearProgress-bar': {
                        background: `linear-gradient(90deg, ${stage.color}, ${STAGES[Math.min(i + 1, 3)].color})`,
                        borderRadius: 2,
                      },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                    {stage.desc}
                  </Typography>
                </CardContent>
                {/* Arrow connector (except last) */}
                {i < 3 && (
                  <Box sx={{
                    position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)',
                    display: { xs: 'none', md: 'block' }, zIndex: 1, color: 'text.disabled',
                  }}>
                    <ArrowForwardIcon fontSize="small" />
                  </Box>
                )}
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Summary Stats */}
      {summaryStats && (
        <Grid container spacing={2} mb={3}>
          {[
            { label: 'Total Users', value: data.totalUsers, icon: '👥' },
            { label: 'Avg Assessments', value: summaryStats.avgAssessments, icon: '📊' },
            { label: 'Avg Streak', value: `${summaryStats.avgStreak} days`, icon: '🔥' },
            { label: 'Premium', value: `${summaryStats.premiumPct}%`, icon: '💎' },
          ].map(stat => (
            <Grid item xs={6} md={3} key={stat.label}>
              <Card sx={{ background: 'background.paper' }}>
                <CardContent sx={{ py: 1.5, textAlign: 'center' }}>
                  <Typography fontSize={20}>{stat.icon}</Typography>
                  <Typography variant="h6" fontWeight={700}>{stat.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Search */}
      <TextField
        fullWidth
        size="small"
        placeholder="Search users by name or email..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
        }}
      />

      {/* Filter chip */}
      {activeStage && (
        <Box mb={2}>
          <Chip
            label={`Showing: ${STAGES.find(s => s.key === activeStage)?.label}`}
            onDelete={() => setActiveStage(null)}
            sx={{ bgcolor: `${STAGE_COLOR_MAP[activeStage]}20`, color: STAGE_COLOR_MAP[activeStage], fontWeight: 600 }}
          />
          <Typography variant="caption" color="text.secondary" ml={1}>
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
      )}

      {/* User Cards Grid */}
      <Grid container spacing={2}>
        {filteredUsers.map(user => (
          <Grid item xs={12} sm={6} md={4} key={user.id}>
            <Card sx={{
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 4px 20px ${STAGE_COLOR_MAP[user.stage]}25` },
            }}>
              <CardActionArea onClick={() => navigate(`/admin/users/${user.id}`)}>
                <CardContent sx={{ p: 2 }}>
                  {/* Header row */}
                  <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
                    <Avatar sx={{
                      width: 40, height: 40,
                      background: `linear-gradient(135deg, ${STAGE_COLOR_MAP[user.stage]}, #f5576c)`,
                      fontSize: 16, fontWeight: 700,
                    }}>
                      {(user.name || user.email)[0].toUpperCase()}
                    </Avatar>
                    <Box flex={1} minWidth={0}>
                      <Typography variant="body2" fontWeight={700} noWrap>
                        {user.name || 'No Name'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {user.email}
                      </Typography>
                    </Box>
                    <Chip
                      label={user.stage}
                      size="small"
                      sx={{
                        bgcolor: `${STAGE_COLOR_MAP[user.stage]}20`,
                        color: STAGE_COLOR_MAP[user.stage],
                        fontWeight: 700,
                        fontSize: 11,
                        textTransform: 'capitalize',
                      }}
                    />
                  </Box>

                  {/* Progress bar */}
                  <Box mb={1.5}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="text.secondary">Stage Progress</Typography>
                      <Typography variant="caption" fontWeight={600}>{user.stageProgress}%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={user.stageProgress}
                      sx={{
                        height: 5, borderRadius: 3,
                        bgcolor: `${STAGE_COLOR_MAP[user.stage]}15`,
                        '& .MuiLinearProgress-bar': {
                          background: `linear-gradient(90deg, ${STAGE_COLOR_MAP[user.stage]}, #f5576c)`,
                          borderRadius: 3,
                        },
                      }}
                    />
                  </Box>

                  {/* Stats row */}
                  <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={0.5}>
                    <Tooltip title={`${user.assessmentsCompleted}/12 assessments`}>
                      <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                        📊 {user.assessmentsCompleted}/12
                      </Typography>
                    </Tooltip>
                    <Tooltip title={`${user.dailyLogStreak} day streak`}>
                      <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                        <LocalFireDepartmentIcon sx={{ fontSize: 14, color: user.dailyLogStreak >= 7 ? '#ff6b6b' : 'text.disabled' }} />
                        {user.dailyLogStreak}
                      </Typography>
                    </Tooltip>
                    <Tooltip title={`Strategy week ${user.strategyWeek}`}>
                      <Typography variant="caption">📅 W{user.strategyWeek}</Typography>
                    </Tooltip>
                    <Tooltip title={`Level ${user.xpLevel} (${user.xpTotal} XP)`}>
                      <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                        <StarIcon sx={{ fontSize: 14, color: '#D4AF37' }} />
                        {user.xpLevel}
                      </Typography>
                    </Tooltip>
                    {user.isPremium && (
                      <DiamondIcon sx={{ fontSize: 14, color: '#a18cd1' }} />
                    )}
                  </Box>

                  {/* Footer */}
                  <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                    Active {formatDate(user.lastActiveAt)}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredUsers.length === 0 && !loading && (
        <Box textAlign="center" py={6}>
          <Typography variant="h6" color="text.secondary">No users found</Typography>
        </Box>
      )}
    </Box>
  );
};

export default CommandCenter;
