import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import StarIcon from '@mui/icons-material/Star';
import { adminApi } from '../../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const StatCard = ({ icon, title, value, subtitle, color = 'primary' }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" gap={2}>
        <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.main` }}>
          {icon}
        </Avatar>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
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
    document.title = 'Cupid Admin Center | Love Rescue';
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [statsRes, usageRes, signupsRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsage(),
        adminApi.getRecentSignups(10),
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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  const subscriptionData = stats?.subscriptions ? [
    { name: 'Trial', value: stats.subscriptions.trial },
    { name: 'Paid', value: stats.subscriptions.paid },
    { name: 'Premium', value: stats.subscriptions.premium },
    { name: 'Expired', value: stats.subscriptions.expired },
  ].filter(d => d.value > 0) : [];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          💘 Cupid Admin Center
        </Typography>
        <Button variant="outlined" onClick={() => navigate('/admin/users')}>
          View All Users
        </Button>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<PeopleIcon />}
            title="Total Users"
            value={stats?.totalUsers?.toLocaleString() || 0}
            subtitle={`+${stats?.newUsers7d || 0} this week`}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<TrendingUpIcon />}
            title="Daily Active"
            value={stats?.dailyActiveUsers?.toLocaleString() || 0}
            subtitle={`${stats?.weeklyActiveUsers || 0} weekly`}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<AssessmentIcon />}
            title="Assessments"
            value={stats?.totalAssessments?.toLocaleString() || 0}
            subtitle="completed"
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<FavoriteIcon />}
            title="Couples"
            value={stats?.totalCouplesMatched?.toLocaleString() || 0}
            subtitle="matched"
            color="error"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* DAU Chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Daily Active Users (Last 30 Days)
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={usage?.dailyActive || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => val.slice(5)} 
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#1976d2" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Subscription Breakdown */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Subscription Breakdown
              </Typography>
              {subscriptionData.length > 0 ? (
                <Box height={250}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={subscriptionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {subscriptionData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Typography color="text.secondary">No subscription data</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Feature Usage */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Feature Usage (Last 30 Days)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box textAlign="center" p={2} bgcolor="primary.light" borderRadius={2}>
                    <Typography variant="h4" color="primary.main">
                      {usage?.featureUsage?.assessments || 0}
                    </Typography>
                    <Typography variant="body2">Assessments</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center" p={2} bgcolor="success.light" borderRadius={2}>
                    <Typography variant="h4" color="success.main">
                      {usage?.featureUsage?.dailyLogs || 0}
                    </Typography>
                    <Typography variant="body2">Daily Logs</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center" p={2} bgcolor="warning.light" borderRadius={2}>
                    <Typography variant="h4" color="warning.main">
                      {usage?.featureUsage?.gratitude || 0}
                    </Typography>
                    <Typography variant="body2">Gratitude</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center" p={2} bgcolor="error.light" borderRadius={2}>
                    <Typography variant="h4" color="error.main">
                      {usage?.featureUsage?.matchups || 0}
                    </Typography>
                    <Typography variant="body2">Matchups</Typography>
                  </Box>
                </Grid>
              </Grid>
              
              {usage?.retention && (
                <Box mt={3} p={2} bgcolor="grey.100" borderRadius={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    7-Day Retention Rate
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {usage.retention.retentionRate}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {usage.retention.retainedUsers} of {usage.retention.cohortSize} users returned
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Signups */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Recent Signups
                </Typography>
                <Chip 
                  icon={<PersonAddIcon />} 
                  label={`+${stats?.newUsers7d || 0} this week`}
                  color="primary"
                  size="small"
                />
              </Box>
              <List dense>
                {recentSignups.map((user) => (
                  <ListItem
                    key={user.id}
                    button
                    onClick={() => navigate(`/admin/users/${user.id}`)}
                    sx={{ borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                        {user.firstName?.[0] || user.email[0].toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          {user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.email}
                          {user.subscriptionStatus === 'premium' && (
                            <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                          )}
                        </Box>
                      }
                      secondary={new Date(user.createdAt).toLocaleDateString()}
                    />
                    <Chip
                      label={user.authProvider}
                      size="small"
                      variant="outlined"
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
