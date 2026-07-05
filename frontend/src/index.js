import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Capacitor } from '@capacitor/core';
import App from './App';
import theme from './theme';
import './index.css';
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
        <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || ''}>
          {AppTree}
        </GoogleOAuthProvider>
      )}
    </ErrorBoundary>
  </React.StrictMode>
);

// Unregister ONLY the legacy CRA app-shell service worker (service-worker.js)
// to fix COOP/Google Sign-In issues. This deliberately leaves /push-sw.js
// alone — the old blanket unregister() killed the push registration on every
// startup, silently breaking web push notifications.
serviceWorkerRegistration.unregisterLegacy();

// Register push notification service worker ONLY after user is authenticated
// This prevents COOP interference with Google OAuth
// The SW will be registered when user enables notifications in Settings
