import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { useAuth } from '../../contexts/AuthContext';

const JoinRelationship = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user, joinRelationship, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user && code && !success) {
      handleJoin();
    }
  }, [user, code]);

  const handleJoin = async () => {
    setLoading(true);
    setError('');

    try {
      await joinRelationship(code);
      setSuccess(true);
      setTimeout(() => navigate('/assessments'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join relationship');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

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
              Join Your Partner
            </Typography>
            <Typography color="text.secondary">
              You've been invited to join a relationship on Marriage Rescue
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Successfully joined! Redirecting to assessments...
            </Alert>
          )}

          {!user ? (
            <>
              <Typography textAlign="center" sx={{ mb: 3 }}>
                Please sign in or create an account to join
              </Typography>
              <Button
                component={RouterLink}
                to="/signup"
                fullWidth
                variant="contained"
                size="large"
                sx={{ mb: 2 }}
              >
                Create Account
              </Button>
              <Button
                component={RouterLink}
                to="/login"
                fullWidth
                variant="outlined"
                size="large"
              >
                Sign In
              </Button>
            </>
          ) : loading ? (
            <Box textAlign="center">
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>Joining relationship...</Typography>
            </Box>
          ) : success ? (
            <Typography textAlign="center" color="success.main">
              You're all set! Taking you to the assessments...
            </Typography>
          ) : (
            <Button
              onClick={handleJoin}
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
            >
              Join Relationship
            </Button>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default JoinRelationship;
