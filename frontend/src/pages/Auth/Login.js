import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
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
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login, googleLogin, biometricLogin, checkBiometricAvailability, error } = useAuth();
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
      navigate('/dashboard');
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
      navigate('/dashboard');
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
      navigate('/dashboard');
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

          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <GoogleLogin
              text="signin_with"
              onSuccess={async (credentialResponse) => {
                setLoading(true);
                setFormError('');
                try {
                  const data = await googleLogin(credentialResponse.credential, rememberMe);
                  if (data.isNewUser) {
                    navigate('/assessments');
                  } else {
                    navigate('/dashboard');
                  }
                } catch (err) {
                  setFormError(err.response?.data?.error || 'Google sign-in failed');
                } finally {
                  setLoading(false);
                }
              }}
              onError={() => {
                setFormError('Google sign-in failed');
              }}
            />
          </Box>

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
