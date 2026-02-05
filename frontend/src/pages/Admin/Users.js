import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Avatar,
  IconButton,
  CircularProgress,
  Alert,
  Button,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonIcon from '@mui/icons-material/Person';
import FavoriteIcon from '@mui/icons-material/Favorite';
import StarIcon from '@mui/icons-material/Star';
import BlockIcon from '@mui/icons-material/Block';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { adminApi } from '../../services/api';

const Users = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 0,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [search, setSearch] = useState('');
  const [subscription, setSubscription] = useState('');
  const [hasPartner, setHasPartner] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);

  const fetchUsers = useCallback(async (newPage = pagination.page) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: newPage + 1, // API uses 1-indexed pages
        limit: pagination.limit,
        ...(search && { search }),
        ...(subscription && { subscription }),
        ...(hasPartner && { hasPartner }),
      };

      const response = await adminApi.getUsers(params);
      setUsers(response.data.users);
      setPagination({
        ...pagination,
        page: newPage,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, subscription, hasPartner]);

  useEffect(() => {
    document.title = 'Users | Cupid Admin Center';
    fetchUsers(0);
  }, [subscription, hasPartner]); // Fetch on filter change

  // Debounced search
  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      fetchUsers(0);
    }, 500);
    setSearchTimeout(timeout);
    return () => clearTimeout(timeout);
  }, [search]);

  const handlePageChange = (event, newPage) => {
    fetchUsers(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setPagination({ ...pagination, limit: parseInt(event.target.value, 10), page: 0 });
    fetchUsers(0);
  };

  const getSubscriptionColor = (status) => {
    switch (status) {
      case 'premium': return 'warning';
      case 'paid': return 'success';
      case 'trial': return 'info';
      case 'expired': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Users
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => fetchUsers(pagination.page)}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
            <TextField
              placeholder="Search by email or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ minWidth: 300 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Subscription</InputLabel>
              <Select
                value={subscription}
                label="Subscription"
                onChange={(e) => setSubscription(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="trial">Trial</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
                <MenuItem value="premium">Premium</MenuItem>
                <MenuItem value="expired">Expired</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Partner Status</InputLabel>
              <Select
                value={hasPartner}
                label="Partner Status"
                onChange={(e) => setHasPartner(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="true">Has Partner</MenuItem>
                <MenuItem value="false">Solo</MenuItem>
              </Select>
            </FormControl>

            {(search || subscription || hasPartner) && (
              <Button
                variant="text"
                onClick={() => {
                  setSearch('');
                  setSubscription('');
                  setHasPartner('');
                }}
              >
                Clear Filters
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Users Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Email</TableCell>
                <TableCell align="center">Subscription</TableCell>
                <TableCell align="center">Partner</TableCell>
                <TableCell align="center">Assessments</TableCell>
                <TableCell align="center">Logs</TableCell>
                <TableCell>Last Active</TableCell>
                <TableCell>Joined</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No users found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow
                    key={user.id}
                    hover
                    onClick={() => navigate(`/admin/users/${user.id}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                          {user.firstName?.[0] || user.email[0].toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {user.name || '-'}
                          </Typography>
                          <Box display="flex" gap={0.5}>
                            {user.isPlatformAdmin && (
                              <Tooltip title="Platform Admin">
                                <AdminPanelSettingsIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                              </Tooltip>
                            )}
                            {user.isDisabled && (
                              <Tooltip title="Account Disabled">
                                <BlockIcon sx={{ fontSize: 14, color: 'error.main' }} />
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.email}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={user.subscriptionStatus}
                        size="small"
                        color={getSubscriptionColor(user.subscriptionStatus)}
                        icon={user.subscriptionStatus === 'premium' ? <StarIcon /> : null}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {user.hasPartner ? (
                        <FavoriteIcon sx={{ color: 'error.main' }} />
                      ) : (
                        <PersonIcon sx={{ color: 'text.disabled' }} />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {user.assessmentsCompleted}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {user.dailyLogsCount}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {user.lastActiveAt
                          ? new Date(user.lastActiveAt).toLocaleDateString()
                          : 'Never'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={pagination.total}
          page={pagination.page}
          onPageChange={handlePageChange}
          rowsPerPage={pagination.limit}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[10, 20, 50, 100]}
        />
      </Card>
    </Box>
  );
};

export default Users;
