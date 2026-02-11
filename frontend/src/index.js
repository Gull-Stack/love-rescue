import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Capacitor } from '@capacitor/core';
import App from './App';
import theme from './theme';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const isNativePlatform = Capacitor.isNativePlatform();

const AppTree = (
  <BrowserRouter>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      {isNativePlatform ? (
        AppTree
      ) : (
        <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || '665328889617-mg6vqui0a5bgkjpj7p85o35lc0f7rnft.apps.googleusercontent.com'}>
          {AppTree}
        </GoogleOAuthProvider>
      )}
    </ErrorBoundary>
  </React.StrictMode>
);

// Temporarily unregister main service worker to fix COOP/Google Sign-In issues
serviceWorkerRegistration.unregister();

// Register push notification service worker ONLY after user is authenticated
// This prevents COOP interference with Google OAuth
// The SW will be registered when user enables notifications in Settings
