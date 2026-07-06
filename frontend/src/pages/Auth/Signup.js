import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
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
  Divider,
  Grid,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../contexts/AuthContext';
import { isNative } from '../../utils/platform';

const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const joinCode = searchParams.get('join');
  const redirectTo = joinCode ? `/join/${joinCode}` : '/dashboard';
  const { signup, googleLogin, appleLogin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [quickStart, setQuickStart] = useState(null);

  // Pick up a QuickStart "quick read" so signup continues the momentum
  // instead of feeling like starting over.
  useEffect(() => {
    try {
      const raw = localStorage.getItem('lr_quickstart');
      if (raw) setQuickStart(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signup({
        firstName: formData.firstName,
        lastName: formData.lastName,
        gender: formData.gender || undefined,
        email: formData.email,
        password: formData.password,
      });
      navigate(redirectTo);
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
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
              {quickStart ? 'Pick up where you left off' : 'Start Your Journey'}
            </Typography>
            <Typography color="text.secondary">
              {quickStart
                ? 'Create your free account to go deeper than the quick read.'
                : 'Create an account to begin improving your relationship'}
            </Typography>
          </Box>

          {quickStart && (
            <Alert
              icon={false}
              severity="success"
              sx={{ mb: 3, borderRadius: 2, '& .MuiAlert-message': { width: '100%' } }}
            >
              <Typography variant="body2">
                ✓ Your quick read is saved: <strong>{quickStart.title}</strong>. Your full
                assessment builds on it to map your whole relationship.
              </Typography>
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  autoComplete="given-name"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  autoComplete="family-name"
                />
              </Grid>
            </Grid>

            {/* Gender Selection */}
            <Box sx={{ mt: 2, mb: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textAlign: 'center' }}>
                I am...
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant={formData.gender === 'male' ? 'contained' : 'outlined'}
                  onClick={() => { setFormData({ ...formData, gender: 'male' }); setError(''); }}
                  sx={{
                    flex: 1,
                    py: 1.5,
                    fontSize: '1rem',
                    borderRadius: 2,
                    ...(formData.gender === 'male' ? {} : {
                      borderColor: 'divider',
                      color: 'text.secondary',
                      '&:hover': { borderColor: 'primary.main', color: 'primary.main' }
                    })
                  }}
                >
                  👨 Male
                </Button>
                <Button
                  variant={formData.gender === 'female' ? 'contained' : 'outlined'}
                  onClick={() => { setFormData({ ...formData, gender: 'female' }); setError(''); }}
                  sx={{
                    flex: 1,
                    py: 1.5,
                    fontSize: '1rem',
                    borderRadius: 2,
                    ...(formData.gender === 'female' ? {} : {
                      borderColor: 'divider',
                      color: 'text.secondary',
                      '&:hover': { borderColor: 'primary.main', color: 'primary.main' }
                    })
                  }}
                >
                  👩 Female
                </Button>
              </Box>
              <Box sx={{ textAlign: 'center', mt: 0.5 }}>
                <Button
                  variant="text"
                  disableRipple
                  onClick={() => { setFormData({ ...formData, gender: 'prefer_not_to_say' }); setError(''); }}
                  sx={{
                    minWidth: 0,
                    p: 0,
                    textTransform: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 400,
                    color: 'text.secondary',
                    '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline' }
                  }}
                >
                  {formData.gender === 'prefer_not_to_say' ? '✓ Prefer not to say' : 'Prefer not to say'}
                </Button>
              </Box>
            </Box>

            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="email"
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="new-password"
              helperText="At least 8 characters"
            />
            <TextField
              fullWidth
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              margin="normal"
              required
              autoComplete="new-password"
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Create Account'}
            </Button>
          </form>

          {/* Web Google sign-up (Gmail SSO). Needs REACT_APP_GOOGLE_CLIENT_ID;
              hidden until set so there's no dead button. Native never renders
              this — the tree has no GoogleOAuthProvider there (index.js). */}
          {!isNative() && !!process.env.REACT_APP_GOOGLE_CLIENT_ID && (
          <>
          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">
              or
            </Typography>
          </Divider>

          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <GoogleLogin
              text="signup_with"
              onSuccess={async (credentialResponse) => {
                setLoading(true);
                setError('');
                try {
                  await googleLogin(credentialResponse.credential);
                  navigate(redirectTo);
                } catch (err) {
                  setError(err.response?.data?.error || 'Google sign-up failed');
                } finally {
                  setLoading(false);
                }
              }}
              onError={() => {
                setError('Google sign-up failed');
              }}
            />
          </Box>
          </>
          )}

          {/* Third-party SSO via native Capacitor plugins (iOS app) — mirrors
              Login.js so native signup offers Google + Apple + email. */}
          {isNative() && (
          <>
          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">
              or
            </Typography>
          </Divider>

          <div style={{ marginBottom: '16px' }}>
            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                setError('');
                try {
                  const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
                  const result = await GoogleAuth.signIn();
                  const idToken = result.authentication.idToken;
                  const data = await googleLogin(idToken);
                  if (data.isNewUser) {
                    navigate('/assessments');
                  } else {
                    navigate(redirectTo);
                  }
                } catch (err) {
                  if (err.message !== 'The user canceled the sign-in flow.') {
                    setError(err.response?.data?.error || err.message || 'Google sign-up failed');
                  }
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              style={{
                width: '100%',
                height: '48px',
                backgroundColor: '#ffffff',
                border: '1px solid #dadce0',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                cursor: 'pointer',
                marginBottom: '12px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: '15px',
                fontWeight: 500,
                color: '#3c4043',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#34A853" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#FBBC05" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              Sign up with Google
            </button>

            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                setError('');
                try {
                  const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
                  const result = await SignInWithApple.authorize({
                    clientId: 'com.gullstack.loverescue',
                    redirectURI: 'https://loverescue.app',
                    scopes: 'email name',
                  });
                  const fullName = result.response.givenName
                    ? { firstName: result.response.givenName, lastName: result.response.familyName }
                    : null;
                  const data = await appleLogin(result.response.identityToken, fullName);
                  if (data.isNewUser) {
                    navigate('/assessments');
                  } else {
                    navigate(redirectTo);
                  }
                } catch (err) {
                  if (err.message !== 'The user canceled the sign-in flow.' && err.code !== '1001') {
                    setError(err.response?.data?.error || err.message || 'Apple sign-up failed');
                  }
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              style={{
                width: '100%',
                height: '48px',
                backgroundColor: '#000000',
                border: 'none',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: 'pointer',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: '15px',
                fontWeight: 500,
                color: '#ffffff',
              }}
            >
              <svg width="16" height="20" viewBox="0 0 814 1000">
                <path fill="#ffffff" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57.4-155.5-127.4c-58.8-82-106.6-209.3-106.6-330.8 0-194.3 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8.7 15.6 1.3 18.2 2.6.6 6.4 1.3 10.2 1.3 45.4 0 103.1-30.4 139.5-71.5z"/>
              </svg>
              Sign up with Apple
            </button>
          </div>
          </>
          )}

          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
            Free to start — no credit card required.
          </Typography>

          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link component={RouterLink} to="/login" color="primary">
                Sign in
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Signup;
