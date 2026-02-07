# Biometric Authentication & Persistent Sessions

## Overview

This document summarizes the biometric login and persistent session implementation for LoveRescue, enabling users to stay logged in and use Face ID/Touch ID, especially when the app is saved as a PWA.

## Features Implemented

### 1. Extended Session Persistence

**Backend Changes (`/backend/src/routes/auth.js`):**
- Access token expiration extended from 7 days to **30 days**
- Added **refresh token mechanism** with 90-day expiry
- New `/api/auth/refresh` endpoint for token rotation
- New `/api/auth/biometric-status` endpoint to check registration status
- All auth endpoints (login, signup, Google, WebAuthn) now return both `token` and `refreshToken`

### 2. Token Refresh Flow

**Frontend Changes (`/frontend/src/services/api.js`):**
- Added token storage helpers (`getToken`, `setTokens`, `clearTokens`)
- Implemented automatic token refresh on 401 responses
- Request queue mechanism to prevent race conditions during refresh
- Token rotation on each refresh for enhanced security

### 3. "Remember Me" Functionality

**Login Page:**
- Added checkbox to control session persistence
- If checked: tokens stored in `localStorage` (persistent across browser sessions)
- If unchecked: tokens stored in `sessionStorage` (cleared on tab close)

### 4. Biometric Registration (Settings Page)

**Settings Page (`/frontend/src/pages/Settings/Settings.js`):**
- New "Security" section with biometric setup
- Shows device capability (Face ID/Touch ID availability)
- "Set Up Biometrics" button triggers WebAuthn registration
- Shows "Biometrics Enabled ✓" when already registered
- Uses `@simplewebauthn/browser` for WebAuthn flow

### 5. Biometric Login (Login Page)

**Login Page (`/frontend/src/pages/Auth/Login.js`):**
- Auto-detects if biometrics are available on device
- If user has registered biometrics, shows prominent "Sign in as [name]" button
- Auto-prompts biometric on PWA/standalone mode launch
- Falls back to password login if biometric fails
- Stores email in `localStorage` for future biometric logins

### 6. PWA Auto-Login Flow

**AuthContext (`/frontend/src/contexts/AuthContext.js`):**
- Added `biometricLogin`, `registerBiometric` functions
- Added `checkBiometricAvailability`, `checkBiometricStatus` helpers
- Auto-refresh token if expired and biometrics enabled
- Seamless re-authentication on app open

## API Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/auth/refresh` | POST | No | Exchange refresh token for new token pair |
| `/api/auth/biometric-status` | GET | Yes | Check if user has biometrics registered |
| `/api/auth/webauthn/register/options` | POST | Yes | Get WebAuthn registration options |
| `/api/auth/webauthn/register/verify` | POST | Yes | Verify WebAuthn registration |
| `/api/auth/webauthn/login/options` | POST | No | Get WebAuthn authentication options |
| `/api/auth/webauthn/login/verify` | POST | No | Verify WebAuthn authentication |

## User Flow

### First-Time Biometric Setup
1. User logs in with email/password
2. User navigates to Settings → Security
3. User taps "Set Up Biometrics"
4. Device prompts for Face ID/Touch ID
5. Credential is registered and stored on server
6. User sees "Biometrics Enabled ✓"

### Biometric Login
1. User opens app (especially PWA)
2. If biometric email saved, prominent biometric button shown
3. User taps button (or auto-prompted in PWA mode)
4. Device prompts for Face ID/Touch ID
5. Server verifies credential
6. User is logged in with new token pair

### Token Refresh
1. Access token expires (after 30 days)
2. API request returns 401
3. Frontend automatically calls `/api/auth/refresh`
4. New token pair issued
5. Original request retried
6. User experiences no interruption

## Files Modified

### Backend
- `/backend/src/routes/auth.js` - Token generation, refresh endpoint, biometric status

### Frontend
- `/frontend/src/services/api.js` - Token storage, refresh interceptor, biometric API
- `/frontend/src/contexts/AuthContext.js` - Biometric methods, token management
- `/frontend/src/pages/Auth/Login.js` - Biometric login UI, Remember Me checkbox
- `/frontend/src/pages/Settings/Settings.js` - Security section, biometric registration

## Dependencies

- `@simplewebauthn/browser` - Already installed in frontend
- `@simplewebauthn/server` - Already installed in backend

## Testing Checklist

- [ ] Test on iOS Safari (PWA mode)
- [ ] Test on Android Chrome (PWA mode)
- [ ] Test Face ID registration and login
- [ ] Test Touch ID registration and login
- [ ] Test token refresh (wait 30+ days or manually expire token)
- [ ] Test "Remember Me" unchecked - session clears on tab close
- [ ] Test "Remember Me" checked - session persists
- [ ] Test auto-biometric prompt on PWA launch
- [ ] Test fallback to password when biometric fails

## Security Considerations

1. **Token Rotation**: Refresh tokens are single-use; each refresh issues a new pair
2. **Hashed Storage**: Refresh tokens are stored hashed (SHA-256) in database
3. **Platform Authenticator**: WebAuthn uses device-bound credentials (Face ID/Touch ID)
4. **Counter Tracking**: WebAuthn counter prevents credential replay attacks
5. **Challenge Expiry**: WebAuthn challenges expire after 5 minutes
