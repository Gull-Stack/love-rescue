import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Chip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { adminApi } from '../../services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    document.title = 'Analytics | Cupid Admin Center';
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, usageRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsage(),
      ]);

      setStats(statsRes.data.stats);
      setUsage(usageRes.data.usage);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load analytics');
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

  // Prepare chart data
  const featureUsageData = usage?.featureUsage
    ? [
        { name: 'Assessments', value: usage.featureUsage.assessments, fill: '#0088FE' },
        { name: 'Daily Logs', value: usage.featureUsage.dailyLogs, fill: '#00C49F' },
        { name: 'Gratitude', value: usage.featureUsage.gratitude, fill: '#FFBB28' },
        { name: 'Matchups', value: usage.featureUsage.matchups, fill: '#FF8042' },
      ]
    : [];

  const subscriptionData = usage?.subscriptionDistribution?.map((item, index) => ({
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    value: item.count,
    fill: COLORS[index % COLORS.length],
  })) || [];

  // Calculate growth metrics
  const calculateGrowth = () => {
    if (!usage?.dailyActive || usage.dailyActive.length < 14) return null;
    
    const recentWeek = usage.dailyActive.slice(-7);
    const previousWeek = usage.dailyActive.slice(-14, -7);
    
    const recentAvg = recentWeek.reduce((sum, d) => sum + d.count, 0) / 7;
    const previousAvg = previousWeek.reduce((sum, d) => sum + d.count, 0) / 7;
    
    if (previousAvg === 0) return null;
    
    const growth = ((recentAvg - previousAvg) / previousAvg) * 100;
    return {
      percentage: growth.toFixed(1),
      isPositive: growth >= 0,
    };
  };

  const growth = calculateGrowth();

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Analytics
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Daily Active Users
              </Typography>
              <Box display="flex" alignItems="baseline" gap={1}>
                <Typography variant="h3" fontWeight="bold">
                  {stats?.dailyActiveUsers || 0}
                </Typography>
                {growth && (
                  <Chip
                    icon={growth.isPositive ? <TrendingUpIcon /> : <TrendingDownIcon />}
                    label={`${growth.isPositive ? '+' : ''}${growth.percentage}%`}
                    size="small"
                    color={growth.isPositive ? 'success' : 'error'}
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Weekly Active
              </Typography>
              <Typography variant="h3" fontWeight="bold">
                {stats?.weeklyActiveUsers || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Monthly Active
              </Typography>
              <Typography variant="h3" fontWeight="bold">
                {stats?.monthlyActiveUsers || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: usage?.retention?.retentionRate >= 50 ? 'success.light' : 'warning.light' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                7-Day Retention
              </Typography>
              <Typography variant="h3" fontWeight="bold">
                {usage?.retention?.retentionRate || 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* DAU Over Time - Line Chart */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Daily Active Users (Last 30 Days)
              </Typography>
              <Box height={350}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={usage?.dailyActive || []}>
                    <defs>
                      <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1976d2" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#1976d2" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(val) => val.slice(5)}
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip
                      labelFormatter={(label) => `Date: ${label}`}
                      formatter={(value) => [`${value} users`, 'Active Users']}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#1976d2"
                      fillOpacity={1}
                      fill="url(#colorUv)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Feature Usage - Bar Chart */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Feature Usage (Last 30 Days)
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={featureUsageData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {featureUsageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Subscription Distribution - Pie Chart */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Subscription Distribution
              </Typography>
              <Box height={300}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={subscriptionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {subscriptionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Retention Breakdown */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Retention Metrics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Box textAlign="center" p={2} bgcolor="grey.100" borderRadius={2}>
                    <Typography variant="h4" color="primary">
                      {usage?.retention?.cohortSize || 0}
                    </Typography>
                    <Typography variant="body2">Cohort Size</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Users 7-14 days old
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box textAlign="center" p={2} bgcolor="grey.100" borderRadius={2}>
                    <Typography variant="h4" color="success.main">
                      {usage?.retention?.retainedUsers || 0}
                    </Typography>
                    <Typography variant="body2">Retained</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Active in last 7 days
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box textAlign="center" p={2} bgcolor="primary.light" borderRadius={2}>
                    <Typography variant="h4" color="primary.main">
                      {usage?.retention?.retentionRate || 0}%
                    </Typography>
                    <Typography variant="body2">Retention Rate</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Goal: 40%+
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Growth Summary */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Growth Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box p={2} bgcolor="info.light" borderRadius={2}>
                    <Typography variant="overline" color="text.secondary">
                      New Users (7d)
                    </Typography>
                    <Typography variant="h4" color="info.main">
                      +{stats?.newUsers7d || 0}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box p={2} bgcolor="info.light" borderRadius={2}>
                    <Typography variant="overline" color="text.secondary">
                      New Users (30d)
                    </Typography>
                    <Typography variant="h4" color="info.main">
                      +{stats?.newUsers30d || 0}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box p={2} bgcolor="success.light" borderRadius={2}>
                    <Typography variant="overline" color="text.secondary">
                      Total Assessments
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {stats?.totalAssessments || 0}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box p={2} bgcolor="error.light" borderRadius={2}>
                    <Typography variant="overline" color="text.secondary">
                      Couples Matched
                    </Typography>
                    <Typography variant="h4" color="error.main">
                      {stats?.totalCouplesMatched || 0}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Analytics;
