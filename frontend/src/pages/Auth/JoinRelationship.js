import React, { useState, useEffect, useRef } from 'react';
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
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth } from '../../contexts/AuthContext';
import { trackEvent } from '../../utils/analytics';
import api from '../../services/api';

// Friendlier messages than the raw backend errors — each one says what to do
// next, not just what went wrong.
const JOIN_ERRORS = {
  'Invalid invite code': "This invite link isn't valid. Ask your partner to send you a fresh one from their Settings.",
  'Invite already used': 'This invite was already used. If that was you on another device, just sign in — you two are already connected.',
  'Cannot join your own relationship': "That's your own invite link — it's the one you share with your partner, not one you accept.",
  'Relationship not found': "This invite link isn't valid anymore. Ask your partner to send you a fresh one.",
};

const JoinRelationship = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user, joinRelationship, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [preview, setPreview] = useState(null); // { valid, inviterFirstName } | { valid: false }
  const redirectTimer = useRef(null);

  // Who is asking? The invited partner is agreeing to link accounts — they
  // deserve a name, not "a relationship".
  useEffect(() => {
    let cancelled = false;
    api
      .get(`/auth/join/${code}/preview`)
      .then((res) => { if (!cancelled) setPreview(res.data); })
      .catch((err) => {
        if (!cancelled) setPreview(err.response?.data || { valid: false });
      });
    return () => { cancelled = true; };
  }, [code]);

  useEffect(() => () => clearTimeout(redirectTimer.current), []);

  const inviterName = preview?.inviterFirstName || null;
  const inviteDead = preview && preview.valid === false;

  // No auto-join on link open: joining a relationship links accounts and
  // shares data, so it always requires the explicit tap below — a
  // forwarded/mis-tapped link must never join silently.
  const handleJoin = async () => {
    setLoading(true);
    setError('');

    try {
      await joinRelationship(code);
      trackEvent('invite_joined');
      setSuccess(true);
      redirectTimer.current = setTimeout(() => navigate('/assessments'), 2000);
    } catch (err) {
      const raw = err.response?.data?.error;
      setError(JOIN_ERRORS[raw] || raw || "We couldn't connect you right now — try again in a moment.");
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
        <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
          <Box textAlign="center" mb={3}>
            <FavoriteIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              {inviterName ? `${inviterName} invited you` : 'Join Your Partner'}
            </Typography>
            <Typography color="text.secondary">
              {inviterName
                ? `${inviterName} wants to work on your relationship together on Love Rescue.`
                : "You've been invited to work on your relationship together on Love Rescue."}
            </Typography>
          </Box>

          {inviteDead && !success && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              {preview.reason === 'ALREADY_USED'
                ? 'This invite was already used. If that was you on another device, just sign in — you two are already connected.'
                : "This invite link isn't valid anymore. Ask your partner to send you a fresh one from their Settings."}
            </Alert>
          )}

          {/* What joining actually does — consent before connection. */}
          {!inviteDead && !success && (
            <Alert
              icon={<LockOutlinedIcon fontSize="inherit" />}
              severity="info"
              sx={{ mb: 3 }}
            >
              Joining links your two accounts. You&apos;ll each see shared things like
              assessment comparisons, shared gratitudes, and couple reports. Your
              private journal entries stay private, and you can disconnect anytime
              from Settings.
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              You&apos;re connected{inviterName ? ` with ${inviterName}` : ''}! Taking you to your first step...
            </Alert>
          )}

          {!user ? (
            <>
              <Typography textAlign="center" sx={{ mb: 3 }}>
                Sign in or create a free account to accept
              </Typography>
              <Button
                component={RouterLink}
                to={`/signup?join=${code}`}
                fullWidth
                variant="contained"
                size="large"
                disabled={inviteDead}
                sx={{ mb: 2, minHeight: 48 }}
              >
                Create Account
              </Button>
              <Button
                component={RouterLink}
                to={`/login?join=${code}`}
                fullWidth
                variant="outlined"
                size="large"
                sx={{ minHeight: 48 }}
              >
                Sign In
              </Button>
            </>
          ) : loading ? (
            <Box textAlign="center">
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>Connecting you two...</Typography>
            </Box>
          ) : success ? null : (
            <>
              <Button
                onClick={handleJoin}
                fullWidth
                variant="contained"
                size="large"
                disabled={loading || inviteDead}
                sx={{ minHeight: 48 }}
              >
                {inviterName ? `Join ${inviterName}` : 'Accept Invite'}
              </Button>
              <Button
                onClick={() => navigate(user ? '/dashboard' : '/welcome')}
                fullWidth
                color="inherit"
                sx={{ mt: 1.5, minHeight: 44, color: 'text.secondary' }}
              >
                Not now
              </Button>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default JoinRelationship;
