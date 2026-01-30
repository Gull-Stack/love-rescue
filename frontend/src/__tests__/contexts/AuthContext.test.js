import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));

import api from '../../services/api';

// A test component that exposes AuthContext values for assertions
const TestComponent = () => {
  const { user, loading, error, login, signup, googleLogin, logout, invitePartner } = useAuth();

  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? JSON.stringify(user) : 'null'}</span>
      <span data-testid="error">{error || 'null'}</span>
      <button data-testid="login-btn" onClick={() => login('test@example.com', 'password123').catch(() => {})}>
        Login
      </button>
      <button
        data-testid="signup-btn"
        onClick={() =>
          signup({ firstName: 'Test', lastName: 'User', email: 'test@example.com', password: 'password123' }).catch(() => {})
        }
      >
        Signup
      </button>
      <button data-testid="google-login-btn" onClick={() => googleLogin('mock-google-credential').catch(() => {})}>
        Google Login
      </button>
      <button data-testid="logout-btn" onClick={() => logout()}>
        Logout
      </button>
      <button data-testid="invite-btn" onClick={() => invitePartner('partner@example.com')}>
        Invite
      </button>
    </div>
  );
};

const renderWithAuth = () => {
  return render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>
  );
};

describe('AuthContext', () => {
  let localStorageMock;

  beforeEach(() => {
    jest.clearAllMocks();

    localStorageMock = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key) => localStorageMock[key] || null),
        setItem: jest.fn((key, value) => {
          localStorageMock[key] = value;
        }),
        removeItem: jest.fn((key) => {
          delete localStorageMock[key];
        }),
      },
      writable: true,
    });
  });

  test('provides null user when no token in localStorage', async () => {
    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(api.get).not.toHaveBeenCalled();
  });

  test('fetches user on mount when token exists in localStorage', async () => {
    localStorageMock.token = 'existing-token';

    const mockUser = { id: 'user-1', firstName: 'Test', email: 'test@example.com' };
    const mockRelationship = { id: 'rel-1', hasPartner: false };

    api.get.mockResolvedValueOnce({
      data: { user: mockUser, relationship: mockRelationship },
    });

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(api.get).toHaveBeenCalledWith('/auth/me');
    expect(screen.getByTestId('user')).toHaveTextContent('Test');
  });

  test('login - stores token and sets user', async () => {
    const mockLoginResponse = {
      data: {
        token: 'new-token',
        user: { id: 'user-1', firstName: 'Test', email: 'test@example.com' },
      },
    };

    const mockMeResponse = {
      data: {
        user: { id: 'user-1', firstName: 'Test', email: 'test@example.com' },
        relationship: { id: 'rel-1', hasPartner: false },
      },
    };

    api.post.mockResolvedValueOnce(mockLoginResponse);
    api.get.mockResolvedValueOnce(mockMeResponse);

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

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
    expect(window.localStorage.setItem).toHaveBeenCalledWith('token', 'new-token');
  });

  test('login - sets error on failure', async () => {
    api.post.mockRejectedValueOnce({
      response: { data: { error: 'Invalid credentials' } },
    });

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('login-btn'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials');
    });
  });

  test('signup - stores token and sets user', async () => {
    const mockSignupResponse = {
      data: {
        token: 'signup-token',
        user: { id: 'user-2', firstName: 'Test', email: 'test@example.com' },
      },
    };

    const mockMeResponse = {
      data: {
        user: { id: 'user-2', firstName: 'Test', email: 'test@example.com' },
        relationship: null,
      },
    };

    api.post.mockResolvedValueOnce(mockSignupResponse);
    api.get.mockResolvedValueOnce(mockMeResponse);

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

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
    expect(window.localStorage.setItem).toHaveBeenCalledWith('token', 'signup-token');
  });

  test('signup - sets error on failure', async () => {
    api.post.mockRejectedValueOnce({
      response: { data: { error: 'Email already exists' } },
    });

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('signup-btn'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Email already exists');
    });
  });

  test('logout - removes token and clears user', async () => {
    localStorageMock.token = 'existing-token';

    const mockUser = { id: 'user-1', firstName: 'Test', email: 'test@example.com' };
    api.get.mockResolvedValueOnce({
      data: { user: mockUser, relationship: { id: 'rel-1', hasPartner: false } },
    });

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Test');
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('logout-btn'));
    });

    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('token');
  });

  test('invitePartner - calls API and returns invite data', async () => {
    const mockInviteResponse = {
      data: {
        inviteLink: 'http://localhost:3000/join/ABC123',
        inviteCode: 'ABC123',
      },
    };

    api.post.mockResolvedValueOnce(mockInviteResponse);

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('invite-btn'));
    });

    expect(api.post).toHaveBeenCalledWith('/auth/invite-partner', {
      partnerEmail: 'partner@example.com',
    });
  });

  test('googleLogin - stores token and sets user', async () => {
    const mockGoogleResponse = {
      data: {
        token: 'google-token',
        user: { id: 'user-g1', firstName: 'Google', email: 'google@example.com' },
        isNewUser: true,
      },
    };

    const mockMeResponse = {
      data: {
        user: { id: 'user-g1', firstName: 'Google', email: 'google@example.com' },
        relationship: null,
      },
    };

    api.post.mockResolvedValueOnce(mockGoogleResponse);
    api.get.mockResolvedValueOnce(mockMeResponse);

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('google-login-btn'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Google');
    });

    expect(api.post).toHaveBeenCalledWith('/auth/google', {
      credential: 'mock-google-credential',
    });
    expect(window.localStorage.setItem).toHaveBeenCalledWith('token', 'google-token');
  });

  test('googleLogin - sets error on failure', async () => {
    api.post.mockRejectedValueOnce({
      response: { data: { error: 'Invalid Google token' } },
    });

    renderWithAuth();

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('google-login-btn'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Invalid Google token');
    });
  });
});
