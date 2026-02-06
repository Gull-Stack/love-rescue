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
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  LinearProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PaymentIcon from '@mui/icons-material/Payment';
import StarIcon from '@mui/icons-material/Star';
import WarningIcon from '@mui/icons-material/Warning';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PeopleIcon from '@mui/icons-material/People';
import { adminApi } from '../../services/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

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

const STATUS_COLORS = {
  trial: CUPID.gold,
  paid: '#10B981',
  premium: CUPID.burgundy,
  expired: '#94A3B8',
};

const MetricCard = ({ icon, title, value, subtitle, color = CUPID.roseGold }) => (
  <Card sx={{ 
    background: `linear-gradient(135deg, ${CUPID.cream} 0%, ${CUPID.blush} 100%)`,
    border: `1px solid ${CUPID.lightRose}`,
    height: '100%'
  }}>
    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
      <Box display="flex" alignItems="flex-start" justifyContent="space-between">
        <Box>
          <Typography variant="caption" sx={{ color: CUPID.burgundy, fontWeight: 600, textTransform: 'uppercase' }}>
            {title}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: color, my: 0.5 }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ color: CUPID.deepRose }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Avatar sx={{ bgcolor: color, width: 40, height: 40 }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

const Subscriptions = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    document.title = '💎 Subscriptions | Cupid Command Center';
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getSubscriptions();
      setData(res.data.subscriptions);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="50vh" bgcolor={CUPID.cream}>
        <CircularProgress sx={{ color: CUPID.roseGold }} />
        <Typography sx={{ mt: 2, color: CUPID.burgundy }}>Loading subscription data...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2, bgcolor: CUPID.cream, minHeight: '100vh' }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const pieData = [
    { name: 'Trial', value: data?.breakdown?.trial || 0, color: STATUS_COLORS.trial },
    { name: 'Paid', value: data?.breakdown?.paid || 0, color: STATUS_COLORS.paid },
    { name: 'Premium', value: data?.breakdown?.premium || 0, color: STATUS_COLORS.premium },
    { name: 'Expired', value: data?.breakdown?.expired || 0, color: STATUS_COLORS.expired },
  ].filter(d => d.value > 0);

  return (
    <Box sx={{ bgcolor: CUPID.cream, minHeight: '100vh', p: 2 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <IconButton onClick={() => navigate('/admin')} sx={{ color: CUPID.burgundy }}>
          <ArrowBackIcon />
        </IconButton>
        <PaymentIcon sx={{ fontSize: 28, color: CUPID.roseGold }} />
        <Typography variant="h5" sx={{ fontWeight: 700, color: CUPID.burgundy }}>
          Subscriptions
        </Typography>
        <Chip 
          label="Stripe Placeholder" 
          size="small" 
          sx={{ bgcolor: CUPID.gold, color: 'white', ml: 'auto' }}
        />
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={2} mb={2}>
        <Grid item xs={6} sm={3}>
          <MetricCard
            icon={<PeopleIcon sx={{ color: 'white' }} />}
            title="Total Users"
            value={data?.total?.toLocaleString() || 0}
            color={CUPID.roseGold}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard
            icon={<StarIcon sx={{ color: 'white' }} />}
            title="Paid Users"
            value={data?.paidUsers?.toLocaleString() || 0}
            subtitle={`${data?.conversionRate || 0}% conversion`}
            color="#10B981"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard
            icon={<AttachMoneyIcon sx={{ color: 'white' }} />}
            title="Est. MRR"
            value={`$${data?.estimatedMRR?.toLocaleString() || 0}`}
            subtitle="$9.99/user/mo"
            color={CUPID.burgundy}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard
            icon={<WarningIcon sx={{ color: 'white' }} />}
            title="Trials Expiring"
            value={data?.trialsExpiringSoon || 0}
            subtitle="within 7 days"
            color="#F59E0B"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {/* Subscription Breakdown */}
        <Grid item xs={12} md={5}>
          <Card sx={{ 
            background: `linear-gradient(135deg, white 0%, ${CUPID.blush} 100%)`,
            border: `1px solid ${CUPID.lightRose}`,
            height: '100%'
          }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ color: CUPID.burgundy, fontWeight: 600, mb: 2 }}>
                💎 Subscription Distribution
              </Typography>
              
              <Box height={200}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: CUPID.cream,
                        border: `1px solid ${CUPID.roseGold}`,
                        borderRadius: 8
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>

              {/* Legend */}
              <Grid container spacing={1} sx={{ mt: 1 }}>
                {pieData.map((item) => (
                  <Grid item xs={6} key={item.name}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: item.color }} />
                      <Typography variant="body2" sx={{ color: CUPID.burgundy }}>
                        {item.name}: <strong>{item.value}</strong>
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              {/* Conversion Rate Bar */}
              <Box sx={{ mt: 3, p: 2, bgcolor: `${CUPID.roseGold}10`, borderRadius: 2 }}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="caption" sx={{ color: CUPID.burgundy, fontWeight: 600 }}>
                    Trial → Paid Conversion
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 700 }}>
                    {data?.conversionRate || 0}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={data?.conversionRate || 0}
                  sx={{ 
                    height: 10, 
                    borderRadius: 5,
                    bgcolor: `${CUPID.lightRose}`,
                    '& .MuiLinearProgress-bar': { 
                      bgcolor: '#10B981',
                      borderRadius: 5
                    }
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Paid Users */}
        <Grid item xs={12} md={7}>
          <Card sx={{ 
            background: `linear-gradient(135deg, white 0%, ${CUPID.blush} 100%)`,
            border: `1px solid ${CUPID.lightRose}`,
            height: '100%'
          }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ color: CUPID.burgundy, fontWeight: 600, mb: 2 }}>
                ✨ Recent Subscribers
              </Typography>

              {data?.recentPaidUsers?.length > 0 ? (
                <List dense sx={{ py: 0 }}>
                  {data.recentPaidUsers.map((user) => (
                    <ListItem
                      key={user.id}
                      button
                      onClick={() => navigate(`/admin/users/${user.id}`)}
                      sx={{ 
                        borderRadius: 1, 
                        mb: 0.5,
                        '&:hover': { bgcolor: `${CUPID.roseGold}10` }
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ 
                          bgcolor: user.subscriptionStatus === 'premium' ? CUPID.burgundy : '#10B981',
                          width: 36, 
                          height: 36 
                        }}>
                          {user.firstName?.[0] || user.email[0].toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 500, color: CUPID.burgundy }}>
                            {user.firstName ? `${user.firstName} ${user.lastName || ''}` : user.email}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" sx={{ color: CUPID.deepRose }}>
                            {new Date(user.updatedAt).toLocaleDateString()}
                          </Typography>
                        }
                      />
                      <Chip 
                        label={user.subscriptionStatus}
                        size="small"
                        sx={{ 
                          bgcolor: STATUS_COLORS[user.subscriptionStatus],
                          color: 'white',
                          fontSize: 11,
                          textTransform: 'capitalize'
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box textAlign="center" py={4}>
                  <PaymentIcon sx={{ fontSize: 48, color: CUPID.lightRose, mb: 1 }} />
                  <Typography color="text.secondary">
                    No paid users yet
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Stripe Info Banner */}
        <Grid item xs={12}>
          <Card sx={{ 
            background: `linear-gradient(135deg, ${CUPID.burgundy} 0%, ${CUPID.deepRose} 100%)`,
            color: 'white'
          }}>
            <CardContent sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <PaymentIcon sx={{ fontSize: 32 }} />
              <Box flex={1}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  💳 Stripe Integration Coming Soon
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Full revenue tracking, subscription management, and payment analytics will be available once Stripe is integrated.
                  Current data is based on user subscription status in the database.
                </Typography>
              </Box>
              <Chip 
                label="Placeholder Mode" 
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Subscriptions;
