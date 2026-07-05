import React, { useState } from 'react';
import { Link as RouterLink, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  CircularProgress,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import api from '../../services/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Reset codes are scoped to the email they were issued to, so the API
  // requires both. Prefill from the URL when present, then from the email
  // remembered by the forgot-password step, and let the user edit either.
  const [email, setEmail] = useState(() => {
    const fromUrl = searchParams.get('email');
    if (fromUrl) return fromUrl;
    try {
      return sessionStorage.getItem('lr_reset_email') || '';
    } catch {
      return '';
    }
  });
  const [code, setCode] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        email: email.trim(),
        token: code.trim(),
        newPassword,
      });
      try { sessionStorage.removeItem('lr_reset_email'); } catch { /* ignore */ }
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. The code may be expired or invalid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider' }}>
          <Box textAlign="center" mb={4}>
            <FavoriteIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Reset Password
            </Typography>
            <Typography color="text.secondary">
              Enter the reset code we emailed you and choose a new password
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success ? (
            <Box textAlign="center">
              <Alert severity="success" sx={{ mb: 3 }}>
                Password reset! Redirecting to login...
              </Alert>
            </Box>
          ) : (
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                margin="normal"
                required
                autoComplete="email"
                autoFocus={!email}
              />
              <TextField
                fullWidth
                label="Reset Code"
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(''); }}
                margin="normal"
                required
                autoComplete="one-time-code"
                inputProps={{ inputMode: 'numeric' }}
                helperText="The 6-digit code from your email — it expires in 1 hour"
                autoFocus={!!email}
              />
              <TextField
                fullWidth
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                margin="normal"
                required
                autoComplete="new-password"
              />
              <TextField
                fullWidth
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                margin="normal"
                required
                autoComplete="new-password"
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                sx={{ mt: 2, mb: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Reset Password'}
              </Button>

              <Box textAlign="center">
                <Link component={RouterLink} to="/forgot-password" color="text.secondary" variant="body2" sx={{ mr: 2 }}>
                  Request a new code
                </Link>
                <Link component={RouterLink} to="/login" color="text.secondary" variant="body2">
                  ← Back to Login
                </Link>
              </Box>
            </form>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default ResetPassword;
