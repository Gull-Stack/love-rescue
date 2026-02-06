import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import StarIcon from '@mui/icons-material/Star';
import NotificationsIcon from '@mui/icons-material/Notifications';
import PaymentIcon from '@mui/icons-material/Payment';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RefreshIcon from '@mui/icons-material/Refresh';
import Diversity1Icon from '@mui/icons-material/Diversity1';
import { adminApi } from '../../services/api';
import { XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

// 💕 Cupid Command Center Theme Colors
const CUPID_THEME = {
  roseGold: '#B76E79',
  burgundy: '#722F37',
  cream: '#FFF8F0',
  blush: '#F8E8E8',
  gold: '#D4AF37',
  deepRose: '#9E4A5A',
  lightRose: '#E8B4BC',
};

const PIE_COLORS = [CUPID_THEME.roseGold, CUPID_THEME.burgundy, CUPID_THEME.gold, '#94A3B8'];

// Compact Stat Card with Cupid theme
const StatCard = ({ icon, title, value, subtitle, trend, color = CUPID_THEME.roseGold, onClick }) => (
  <Card 
    sx={{ 
      height: '100%', 
      background: `linear-gradient(135deg, ${CUPID_THEME.cream} 0%, ${CUPID_THEME.blush} 100%)`,
      border: `1px solid ${CUPID_THEME.lightRose}`,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s ease',
      '&:hover': onClick ? { 
        transform: 'translateY(-2px)', 
        boxShadow: `0 4px 20px ${CUPID_THEME.roseGold}40` 
      } : {}
    }}
    onClick={onClick}
  >
    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
      <Box display="flex" alignItems="flex-start" justifyContent="space-between">
        <Box>
          <Typography variant="caption" sx={{ color: CUPID_THEME.burgundy, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {title}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: CUPID_THEME.burgundy, my: 0.5 }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ color: CUPID_THEME.deepRose }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Avatar sx={{ bgcolor: color, width: 40, height: 40 }}>
          {icon}
        </Avatar>
      </Box>
      {trend !== undefined && (
        <Box display="flex" alignItems="center" mt={1}>
          <TrendingUpIcon sx={{ fontSize: 14, color: trend >= 0 ? '#10B981' : '#EF4444', mr: 0.5 }} />
          <Typography variant="caption" sx={{ color: trend >= 0 ? '#10B981' : '#EF4444', fontWeight: 600 }}>
            {trend >= 0 ? '+' : ''}{trend}% this week
          </Typography>
        </Box>
      )}
    </CardContent>
  </Card>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [usage, setUsage] = useState(null);
  const [recentSignups, setRecentSignups] = useState([]);

  useEffect(() => {
    document.title = '💘 Cupid Command Center | Love Rescue';
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [statsRes, usageRes, signupsRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsage(),
        adminApi.getRecentSignups(8),
      ]);

      setStats(statsRes.data.stats);
      setUsage(usageRes.data.usage);
      setRecentSignups(signupsRes.data.users);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="50vh">
        <FavoriteIcon sx={{ fontSize: 48, color: CUPID_THEME.roseGold, animation: 'pulse 1s infinite' }} />
        <Typography sx={{ mt: 2, color: CUPID_THEME.burgundy }}>Loading Command Center...</Typography>
        <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2, bgcolor: CUPID_THEME.blush, color: CUPID_THEME.burgundy }}>
        {error}
      </Alert>
    );
  }

  const subscriptionData = stats?.subscriptions ? [
    { name: 'Trial', value: stats.subscriptions.trial, color: CUPID_THEME.roseGold },
    { name: 'Paid', value: stats.subscriptions.paid, color: CUPID_THEME.burgundy },
    { name: 'Premium', value: stats.subscriptions.premium, color: CUPID_THEME.gold },
    { name: 'Expired', value: stats.subscriptions.expired, color: '#94A3B8' },
  ].filter(d => d.value > 0) : [];

  return (
    <Box sx={{ bgcolor: CUPID_THEME.cream, minHeight: '100vh', p: 2 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <FavoriteIcon sx={{ fontSize: 32, color: CUPID_THEME.roseGold }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: CUPID_THEME.burgundy }}>
            Cupid Command Center
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchData} size="small" sx={{ color: CUPID_THEME.burgundy }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button 
            variant="contained" 
            size="small"
            startIcon={<PeopleIcon />}
            onClick={() => navigate('/admin/users')}
            sx={{ 
              bgcolor: CUPID_THEME.roseGold, 
              '&:hover': { bgcolor: CUPID_THEME.burgundy },
              textTransform: 'none',
              borderRadius: 2
            }}
          >
            Users
          </Button>
          <Button 
            variant="contained" 
            size="small"
            startIcon={<NotificationsIcon />}
            onClick={() => navigate('/admin/push')}
            sx={{ 
              bgcolor: CUPID_THEME.burgundy, 
              '&:hover': { bgcolor: CUPID_THEME.deepRose },
              textTransform: 'none',
              borderRadius: 2
            }}
          >
            Push
          </Button>
        </Box>
      </Box>

      {/* Quick Stats Row - Compact 6 cards */}
      <Grid container spacing={2} mb={2}>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard
            icon={<PeopleIcon sx={{ color: 'white' }} />}
            title="Users"
            value={stats?.totalUsers?.toLocaleString() || 0}
            subtitle={`+${stats?.newUsers7d || 0} this week`}
            color={CUPID_THEME.roseGold}
            onClick={() => navigate('/admin/users')}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard
            icon={<TrendingUpIcon sx={{ color: 'white' }} />}
            title="DAU"
            value={stats?.dailyActiveUsers?.toLocaleString() || 0}
            subtitle={`WAU: ${stats?.weeklyActiveUsers || 0}`}
            color={CUPID_THEME.burgundy}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard
            icon={<Diversity1Icon sx={{ color: 'white' }} />}
            title="Couples"
            value={stats?.totalCouplesMatched?.toLocaleString() || 0}
            subtitle="matched"
            color={CUPID_THEME.deepRose}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard
            icon={<AssessmentIcon sx={{ color: 'white' }} />}
            title="Assessments"
            value={stats?.totalAssessments?.toLocaleString() || 0}
            subtitle="completed"
            color={CUPID_THEME.gold}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard
            icon={<StarIcon sx={{ color: 'white' }} />}
            title="Premium"
            value={stats?.premiumUsers?.toLocaleString() || 0}
            subtitle="subscribers"
            color="#10B981"
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard
            icon={<FavoriteIcon sx={{ color: 'white' }} />}
            title="Retention"
            value={`${usage?.retention?.retentionRate || 0}%`}
            subtitle="7-day"
            color={CUPID_THEME.roseGold}
          />
        </Grid>
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={2}>
        {/* DAU Chart - Larger */}
        <Grid item xs={12} md={8}>
          <Card sx={{ 
            background: `linear-gradient(135deg, ${CUPID_THEME.cream} 0%, white 100%)`,
            border: `1px solid ${CUPID_THEME.lightRose}`,
            height: '100%'
          }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ color: CUPID_THEME.burgundy, fontWeight: 600, mb: 1 }}>
                💕 Daily Active Users (30 Days)
              </Typography>
              <Box height={200}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={usage?.dailyActive || []}>
                    <defs>
                      <linearGradient id="dauGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CUPID_THEME.roseGold} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={CUPID_THEME.roseGold} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={CUPID_THEME.lightRose} />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => val.slice(8)} 
                      fontSize={10}
                      stroke={CUPID_THEME.burgundy}
                    />
                    <YAxis fontSize={10} stroke={CUPID_THEME.burgundy} />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: CUPID_THEME.cream, 
                        border: `1px solid ${CUPID_THEME.roseGold}`,
                        borderRadius: 8
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke={CUPID_THEME.roseGold}
                      fill="url(#dauGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Subscription Pie Chart */}
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            background: `linear-gradient(135deg, ${CUPID_THEME.cream} 0%, white 100%)`,
            border: `1px solid ${CUPID_THEME.lightRose}`,
            height: '100%'
          }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ color: CUPID_THEME.burgundy, fontWeight: 600, mb: 1 }}>
                💎 Subscription Mix
              </Typography>
              {subscriptionData.length > 0 ? (
                <Box height={200} display="flex" alignItems="center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={subscriptionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {subscriptionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: CUPID_THEME.cream,
                          border: `1px solid ${CUPID_THEME.roseGold}`,
                          borderRadius: 8
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Typography color="text.secondary" textAlign="center" py={4}>No data</Typography>
              )}
              <Box display="flex" flexWrap="wrap" gap={1} justifyContent="center">
                {subscriptionData.map((item, i) => (
                  <Chip 
                    key={item.name}
                    label={`${item.name}: ${item.value}`}
                    size="small"
                    sx={{ 
                      bgcolor: item.color || PIE_COLORS[i],
                      color: 'white',
                      fontSize: 11
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Feature Usage Cards - Compact Row */}
        <Grid item xs={12}>
          <Card sx={{ 
            background: `linear-gradient(135deg, ${CUPID_THEME.cream} 0%, white 100%)`,
            border: `1px solid ${CUPID_THEME.lightRose}`
          }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ color: CUPID_THEME.burgundy, fontWeight: 600, mb: 2 }}>
                📊 Feature Usage (30 Days)
              </Typography>
              <Grid container spacing={2}>
                {[
                  { label: 'Assessments', value: usage?.featureUsage?.assessments || 0, icon: '📝', color: CUPID_THEME.roseGold },
                  { label: 'Daily Logs', value: usage?.featureUsage?.dailyLogs || 0, icon: '📖', color: CUPID_THEME.burgundy },
                  { label: 'Gratitude', value: usage?.featureUsage?.gratitude || 0, icon: '🙏', color: CUPID_THEME.gold },
                  { label: 'Matchups', value: usage?.featureUsage?.matchups || 0, icon: '💕', color: CUPID_THEME.deepRose },
                ].map((item) => (
                  <Grid item xs={6} sm={3} key={item.label}>
                    <Box 
                      sx={{ 
                        textAlign: 'center', 
                        p: 2, 
                        bgcolor: `${item.color}15`,
                        borderRadius: 2,
                        border: `1px solid ${item.color}30`
                      }}
                    >
                      <Typography variant="h3" sx={{ fontSize: 28 }}>{item.icon}</Typography>
                      <Typography variant="h5" sx={{ color: item.color, fontWeight: 700 }}>
                        {item.value.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" sx={{ color: CUPID_THEME.burgundy }}>
                        {item.label}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Signups */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            background: `linear-gradient(135deg, ${CUPID_THEME.cream} 0%, white 100%)`,
            border: `1px solid ${CUPID_THEME.lightRose}`
          }}>
            <CardContent sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2" sx={{ color: CUPID_THEME.burgundy, fontWeight: 600 }}>
                  ✨ Recent Signups
                </Typography>
                <Chip 
                  icon={<PersonAddIcon sx={{ fontSize: 14 }} />} 
                  label={`+${stats?.newUsers7d || 0} this week`}
                  size="small"
                  sx={{ bgcolor: CUPID_THEME.roseGold, color: 'white', fontSize: 11 }}
                />
              </Box>
              <List dense sx={{ py: 0 }}>
                {recentSignups.slice(0, 6).map((user) => (
                  <ListItem
                    key={user.id}
                    button
                    onClick={() => navigate(`/admin/users/${user.id}`)}
                    sx={{ 
                      borderRadius: 1, 
                      py: 0.5,
                      '&:hover': { bgcolor: `${CUPID_THEME.roseGold}10` } 
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: CUPID_THEME.roseGold, width: 28, height: 28, fontSize: 12 }}>
                        {user.firstName?.[0] || user.email[0].toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 500, color: CUPID_THEME.burgundy }}>
                          {user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.email.split('@')[0]}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" sx={{ color: CUPID_THEME.deepRose }}>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </Typography>
                      }
                    />
                    {user.subscriptionStatus === 'premium' && (
                      <StarIcon sx={{ fontSize: 16, color: CUPID_THEME.gold }} />
                    )}
                  </ListItem>
                ))}
              </List>
              <Button 
                fullWidth 
                size="small" 
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/admin/users')}
                sx={{ 
                  mt: 1, 
                  color: CUPID_THEME.burgundy,
                  textTransform: 'none'
                }}
              >
                View All Users
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            background: `linear-gradient(135deg, ${CUPID_THEME.burgundy} 0%, ${CUPID_THEME.deepRose} 100%)`,
            border: 'none',
            color: 'white'
          }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                🎯 Quick Actions
              </Typography>
              <Grid container spacing={1}>
                {[
                  { label: 'User Management', icon: <PeopleIcon />, path: '/admin/users' },
                  { label: 'Push Notifications', icon: <NotificationsIcon />, path: '/admin/push' },
                  { label: 'Subscriptions', icon: <PaymentIcon />, path: '/admin/subscriptions' },
                  { label: 'Analytics', icon: <AnalyticsIcon />, path: '/admin/analytics' },
                ].map((action) => (
                  <Grid item xs={6} key={action.label}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={action.icon}
                      onClick={() => navigate(action.path)}
                      sx={{ 
                        color: 'white',
                        borderColor: 'rgba(255,255,255,0.3)',
                        textTransform: 'none',
                        justifyContent: 'flex-start',
                        py: 1.5,
                        '&:hover': { 
                          borderColor: 'white',
                          bgcolor: 'rgba(255,255,255,0.1)'
                        }
                      }}
                    >
                      {action.label}
                    </Button>
                  </Grid>
                ))}
              </Grid>
              
              {/* Retention Metric */}
              <Box mt={2} p={2} sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>7-Day Retention</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {usage?.retention?.retentionRate || 0}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={usage?.retention?.retentionRate || 0}
                  sx={{ 
                    height: 8, 
                    borderRadius: 4,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    '& .MuiLinearProgress-bar': { 
                      bgcolor: CUPID_THEME.gold,
                      borderRadius: 4
                    }
                  }}
                />
                <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
                  {usage?.retention?.retainedUsers || 0} of {usage?.retention?.cohortSize || 0} returned
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
