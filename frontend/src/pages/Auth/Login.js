import React, { useState, useEffect, useCallback } from 'react';
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
  Divider,
  CircularProgress,
  Snackbar,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import GoogleIcon from '@mui/icons-material/Google';
import AppleIcon from '@mui/icons-material/Apple';
// GoogleLogin web component removed — using capacitor-google-auth for both platforms
import { useAuth } from '../../contexts/AuthContext';
import { isNative } from '../../utils/platform';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const joinCode = searchParams.get('join');
  const redirectTo = joinCode ? `/join/${joinCode}` : '/dashboard';
  const { login, googleLogin, appleLogin, biometricLogin, checkBiometricAvailability, error } = useAuth();
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [rememberMe, setRememberMe] = useState(true);
  const [formError, setFormError] = useState('');
  const [biometricSnack, setBiometricSnack] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [savedEmail, setSavedEmail] = useState('');

  // Check for saved biometric email and availability
  useEffect(() => {
    const checkBiometric = async () => {
      const available = await checkBiometricAvailability();
      setBiometricAvailable(available);
      
      const email = localStorage.getItem('biometricEmail');
      if (email) {
        setSavedEmail(email);
      }
    };
    checkBiometric();
  }, [checkBiometricAvailability]);

  // Auto-prompt biometric login on page load if available
  const autoPromptBiometric = useCallback(async () => {
    const email = localStorage.getItem('biometricEmail');
    if (!email || !biometricAvailable) return;
    
    // Small delay to let the page render first
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Only auto-prompt if user has biometric credentials saved
    try {
      setBiometricLoading(true);
      setFormError('');
      await biometricLogin(email);
      navigate(redirectTo);
    } catch (err) {
      // Silent fail on auto-prompt - user can manually try
      console.log('Auto biometric prompt failed:', err.message);
    } finally {
      setBiometricLoading(false);
    }
  }, [biometricAvailable, biometricLogin, navigate]);

  useEffect(() => {
    // Auto-prompt on PWA/standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone 
      || document.referrer.includes('android-app://');
    
    if (isStandalone && localStorage.getItem('biometricEmail')) {
      autoPromptBiometric();
    }
  }, [autoPromptBiometric]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFormError('');

    try {
      await login(formData.email, formData.password, rememberMe);
      navigate(redirectTo);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    const email = savedEmail || formData.email;
    
    if (!email) {
      setSnackMessage('Please enter your email first, or we\'ll use your saved email.');
      setBiometricSnack(true);
      return;
    }

    setBiometricLoading(true);
    setFormError('');

    try {
      await biometricLogin(email);
      navigate(redirectTo);
    } catch (err) {
      if (err.message.includes('not set up')) {
        setSnackMessage('Biometric login not set up for this account. Sign in with password first, then set up biometrics in Settings.');
      } else if (err.message.includes('cancelled')) {
        setSnackMessage('Biometric authentication was cancelled.');
      } else {
        setFormError(err.message || 'Biometric login failed');
      }
      setBiometricSnack(true);
    } finally {
      setBiometricLoading(false);
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
              Welcome Back
            </Typography>
            <Typography color="text.secondary">
              Sign in to continue your journey
            </Typography>
          </Box>

          {(formError || error) && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {formError || error}
            </Alert>
          )}

          {/* Biometric Login - Show prominently if available and email saved */}
          {biometricAvailable && savedEmail && (
            <Box sx={{ mb: 3 }}>
              <Button
                fullWidth
                variant="contained"
                color="secondary"
                size="large"
                startIcon={biometricLoading ? <CircularProgress size={20} color="inherit" /> : <FingerprintIcon />}
                onClick={handleBiometricLogin}
                disabled={biometricLoading || loading}
                sx={{ py: 1.5 }}
              >
                {biometricLoading ? 'Authenticating...' : `Sign in as ${savedEmail.split('@')[0]}`}
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                Use Face ID or Touch ID
              </Typography>
              <Divider sx={{ my: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  or sign in with password
                </Typography>
              </Divider>
            </Box>
          )}

          <form onSubmit={handleSubmit}>
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
              autoComplete="current-password"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  color="primary"
                />
              }
              label="Remember me"
              sx={{ mt: 1 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 2, mb: 2 }}
              disabled={loading || biometricLoading}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>

            <Box textAlign="center" mb={2}>
              <Link component={RouterLink} to="/forgot-password" color="text.secondary" variant="body2">
                Forgot password?
              </Link>
            </Box>
          </form>

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
                setFormError('');
                try {
                  const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
                  if (!isNative()) {
                    await GoogleAuth.initialize({
                      clientId: '665328889617-mg6vqui0a5bgkjpj7p85o35lc0f7rnft.apps.googleusercontent.com',
                      scopes: ['profile', 'email'],
                      grantOfflineAccess: true,
                    });
                  }
                  const result = await GoogleAuth.signIn();
                  const idToken = result.authentication.idToken;
                  const data = await googleLogin(idToken, rememberMe);
                  if (data.isNewUser) {
                    navigate('/assessments');
                  } else {
                    navigate(redirectTo);
                  }
                } catch (err) {
                  if (err.message !== 'The user canceled the sign-in flow.') {
                    setFormError(err.response?.data?.error || err.message || 'Google sign-in failed');
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
              Sign in with Google
            </button>

            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                setFormError('');
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
                  const data = await appleLogin(result.response.identityToken, fullName, rememberMe);
                  if (data.isNewUser) {
                    navigate('/assessments');
                  } else {
                    navigate(redirectTo);
                  }
                } catch (err) {
                  if (err.message !== 'The user canceled the sign-in flow.' && err.code !== '1001') {
                    setFormError(err.response?.data?.error || err.message || 'Apple sign-in failed');
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
              Sign in with Apple
            </button>
          </div>

          {/* Show biometric button if available but no saved email */}
          {biometricAvailable && !savedEmail && (
            <Button
              fullWidth
              variant="outlined"
              startIcon={biometricLoading ? <CircularProgress size={20} /> : <FingerprintIcon />}
              sx={{ mb: 3 }}
              onClick={handleBiometricLogin}
              disabled={biometricLoading || loading || !formData.email}
            >
              Sign in with Biometrics
            </Button>
          )}

          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{' '}
              <Link component={RouterLink} to="/signup" color="primary">
                Sign up
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>

      <Snackbar
        open={biometricSnack}
        autoHideDuration={5000}
        onClose={() => setBiometricSnack(false)}
        message={snackMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Container>
  );
};

export default Login;
