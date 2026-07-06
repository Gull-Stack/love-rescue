import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

// Full-surface mock of services/api: AuthContext imports the default axios
// instance AND named helpers (token storage + biometricApi).
jest.mock('../../services/api', () => {
  const apiInstance = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };
  return {
    __esModule: true,
    default: apiInstance,
    // Implementations are installed in beforeEach — CRA's jest config runs
    // with resetMocks:true, which strips factory-time implementations.
    getToken: jest.fn(),
    getRefreshToken: jest.fn(),
    setTokens: jest.fn(),
    clearTokens: jest.fn(),
    biometricApi: {
      getStatus: jest.fn(),
      getRegisterOptions: jest.fn(),
      verifyRegistration: jest.fn(),
      getLoginOptions: jest.fn(),
      verifyLogin: jest.fn(),
    },
  };
});

jest.mock('@simplewebauthn/browser', () => ({
  startAuthentication: jest.fn(),
  startRegistration: jest.fn(),
}));

jest.mock('../../utils/capacitor-init', () => ({
  registerNativePushIfGranted: jest.fn().mockResolvedValue(null),
  setupPushListeners: jest.fn(),
}));

// logout() must drop the PremiumGate module cache so user A's entitlement
// never leaks to user B in the same SPA session.
jest.mock('../../components/common/PremiumGate', () => ({
  __esModule: true,
  default: () => null,
  clearSubscriptionCache: jest.fn(),
  primeSubscriptionCache: jest.fn(),
}));

import apiModule from '../../services/api';
import {
  setTokens,
  clearTokens,
  getToken,
  getRefreshToken,
  biometricApi,
} from '../../services/api';
import { clearSubscriptionCache } from '../../components/common/PremiumGate';

const api = apiModule;

// Re-install storage-backed behavior after resetMocks wipes implementations.
const installTokenHelperImpls = () => {
  getToken.mockImplementation(
    () => window.localStorage.getItem('token') || window.sessionStorage.getItem('token')
  );
  getRefreshToken.mockImplementation(
    () =>
      window.localStorage.getItem('refreshToken') ||
      window.sessionStorage.getItem('refreshToken')
  );
  setTokens.mockImplementation((token, refreshToken) => {
    window.localStorage.setItem('token', token);
    if (refreshToken) window.localStorage.setItem('refreshToken', refreshToken);
  });
  clearTokens.mockImplementation(() => {
    window.localStorage.removeItem('token');
    window.localStorage.removeItem('refreshToken');
    window.sessionStorage.removeItem('token');
    window.sessionStorage.removeItem('refreshToken');
  });
  biometricApi.getStatus.mockResolvedValue({ data: { biometricEnabled: false } });
};

// A test component that exposes AuthContext values for assertions
const TestComponent = () => {
  const { user, loading, error, login, signup, googleLogin, logout, invitePartner, changePassword } =
    useAuth();

  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? JSON.stringify(user) : 'null'}</span>
      <span data-testid="error">{error || 'null'}</span>
      <button
        data-testid="login-btn"
        onClick={() => login('test@example.com', 'password123').catch(() => {})}
      >
        Login
      </button>
      <button
        data-testid="signup-btn"
        onClick={() =>
          signup({
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            password: 'password123',
          }).catch(() => {})
        }
      >
        Signup
      </button>
      <button
        data-testid="google-login-btn"
        onClick={() => googleLogin('mock-google-credential').catch(() => {})}
      >
        Google Login
      </button>
      <button data-testid="logout-btn" onClick={() => logout()}>
        Logout
      </button>
      <button data-testid="invite-btn" onClick={() => invitePartner('partner@example.com').catch(() => {})}>
        Invite
      </button>
      <button
        data-testid="change-password-btn"
        onClick={() => changePassword('oldpass123', 'newpass456').catch(() => {})}
      >
        Change Password
      </button>
    </div>
  );
};

const renderWithAuth = () =>
  render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>
  );

const waitForLoaded = async () => {
  await waitFor(() => {
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });
};

describe('AuthContext', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    installTokenHelperImpls();
    // logout() fires a best-effort POST /auth/logout — keep a safe default.
    api.post.mockResolvedValue({ data: {} });
  });

  test('provides null user when no token in storage', async () => {
    renderWithAuth();
    await waitForLoaded();

    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(api.get).not.toHaveBeenCalled();
  });

  test('fetches user from /auth/me on mount when a token exists', async () => {
    window.localStorage.setItem('token', 'existing-token');
    api.get.mockResolvedValueOnce({
      data: {
        user: { id: 'user-1', firstName: 'Test', email: 'test@example.com' },
        relationship: { id: 'rel-1', hasPartner: false },
      },
    });

    renderWithAuth();
    await waitForLoaded();

    expect(api.get).toHaveBeenCalledWith('/auth/me');
    expect(screen.getByTestId('user')).toHaveTextContent('Test');
  });

  test('clears tokens when /auth/me fails on mount', async () => {
    window.localStorage.setItem('token', 'stale-token');
    api.get.mockRejectedValueOnce({ response: { status: 401 } });

    renderWithAuth();
    await waitForLoaded();

    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(clearTokens).toHaveBeenCalled();
  });

  test('login stores tokens, saves biometric email, and sets user', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        token: 'new-token',
        refreshToken: 'new-refresh',
        user: { id: 'user-1', firstName: 'Test', email: 'test@example.com' },
      },
    });
    api.get.mockResolvedValueOnce({
      data: {
        user: { id: 'user-1', firstName: 'Test', email: 'test@example.com' },
        relationship: { id: 'rel-1', hasPartner: false },
      },
    });

    renderWithAuth();
    await waitForLoaded();

    await act(async () => {
      fireEvent.click(screen.getByTestId('login-btn'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Test');
    });

    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      email: 'test@example.com',
      password: 'password123',
    });
    expect(setTokens).toHaveBeenCalledWith('new-token', 'new-refresh', true);
    // Email remembered for later biometric login
    expect(window.localStorage.getItem('biometricEmail')).toBe('test@example.com');
  });

  test('login sets error on failure', async () => {
    renderWithAuth();
    await waitForLoaded();

    api.post.mockRejectedValueOnce({
      response: { data: { error: 'Invalid credentials' } },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('login-btn'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  test('signup stores tokens and sets user', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        token: 'signup-token',
        refreshToken: 'signup-refresh',
        user: { id: 'user-2', firstName: 'Test', email: 'test@example.com' },
      },
    });
    api.get.mockResolvedValueOnce({
      data: {
        user: { id: 'user-2', firstName: 'Test', email: 'test@example.com' },
        relationship: null,
      },
    });

    renderWithAuth();
    await waitForLoaded();

    await act(async () => {
      fireEvent.click(screen.getByTestId('signup-btn'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Test');
    });

    expect(api.post).toHaveBeenCalledWith('/auth/signup', {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'password123',
    });
    expect(setTokens).toHaveBeenCalledWith('signup-token', 'signup-refresh', true);
  });

  test('signup sets error on failure', async () => {
    renderWithAuth();
    await waitForLoaded();

    api.post.mockRejectedValueOnce({
      response: { data: { error: 'Email already exists' } },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('signup-btn'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Email already exists');
    });
  });

  test('googleLogin posts credential and sets user', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        token: 'google-token',
        user: { id: 'user-g1', firstName: 'Google', email: 'google@example.com' },
        isNewUser: true,
      },
    });
    api.get.mockResolvedValueOnce({
      data: {
        user: { id: 'user-g1', firstName: 'Google', email: 'google@example.com' },
        relationship: null,
      },
    });

    renderWithAuth();
    await waitForLoaded();

    await act(async () => {
      fireEvent.click(screen.getByTestId('google-login-btn'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Google');
    });
    expect(api.post).toHaveBeenCalledWith('/auth/google', {
      credential: 'mock-google-credential',
    });
  });

  test('logout clears tokens, clears user, and revokes the session server-side', async () => {
    window.localStorage.setItem('token', 'existing-token');
    window.localStorage.setItem('refreshToken', 'existing-refresh');
    api.get.mockResolvedValueOnce({
      data: {
        user: { id: 'user-1', firstName: 'Test', email: 'test@example.com' },
        relationship: { id: 'rel-1', hasPartner: false },
      },
    });

    renderWithAuth();
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Test');
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('logout-btn'));
    });

    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(clearTokens).toHaveBeenCalled();
    // Subscription entitlement is cached at module scope in PremiumGate —
    // logout must clear it so the next user starts from a clean slate.
    expect(clearSubscriptionCache).toHaveBeenCalled();
    // Best-effort server revoke with the refresh token + pinned auth header.
    expect(api.post).toHaveBeenCalledWith(
      '/auth/logout',
      { refreshToken: 'existing-refresh' },
      { headers: { Authorization: 'Bearer existing-token' } }
    );
  });

  test('invitePartner posts to the invite endpoint', async () => {
    renderWithAuth();
    await waitForLoaded();

    api.post.mockResolvedValueOnce({
      data: { inviteLink: 'http://localhost:3000/join/ABC123', inviteCode: 'ABC123' },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('invite-btn'));
    });

    expect(api.post).toHaveBeenCalledWith('/auth/invite-partner', {
      partnerEmail: 'partner@example.com',
    });
  });

  test('changePassword stores the fresh token pair so THIS device stays signed in', async () => {
    window.localStorage.setItem('rememberMe', 'true');
    renderWithAuth();
    await waitForLoaded();

    api.post.mockResolvedValueOnce({
      data: { token: 'fresh-token', refreshToken: 'fresh-refresh' },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('change-password-btn'));
    });

    expect(api.post).toHaveBeenCalledWith('/auth/change-password', {
      currentPassword: 'oldpass123',
      newPassword: 'newpass456',
    });
    // Without this, the old tokenVersion in storage would 401 (TOKEN_REVOKED)
    // on the next request and kick the user out of the device they just used.
    expect(setTokens).toHaveBeenCalledWith('fresh-token', 'fresh-refresh', true);
  });
});
