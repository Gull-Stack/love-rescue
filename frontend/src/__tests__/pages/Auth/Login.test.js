import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../../../pages/Auth/Login';
import { useAuth } from '../../../contexts/AuthContext';
import { renderWithProviders } from '../../../testHelpers/renderWithProviders';
import { createAuthValue } from '../../../testHelpers/mockAuthContext';

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Web build (not the iOS shell) — shows email/password + web Google button.
jest.mock('../../../utils/platform', () => ({
  isNative: () => false,
  isIOS: () => false,
  isAndroid: () => false,
  isWeb: () => true,
  getPlatform: () => 'web',
  useAppleIAP: () => false,
  useStripeCheckout: () => true,
}));

// Mock the web GoogleLogin button from @react-oauth/google
jest.mock('@react-oauth/google', () => ({
  GoogleLogin: (props) => (
    <button
      data-testid="google-signin-btn"
      onClick={() => props.onSuccess({ credential: 'mock-credential' })}
    >
      Sign in with Google
    </button>
  ),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Login', () => {
  let auth;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    // Google button only renders when a client id is configured at build time.
    process.env.REACT_APP_GOOGLE_CLIENT_ID = 'test-google-client-id';
    auth = createAuthValue({ user: null, relationship: null });
    useAuth.mockImplementation(() => auth);
  });

  afterAll(() => {
    delete process.env.REACT_APP_GOOGLE_CLIENT_ID;
  });

  test('renders login form with email, password, and remember-me', () => {
    renderWithProviders(<Login />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /remember me/i })).toBeChecked();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
  });

  test('shows links to signup, forgot password, and therapist onboarding', () => {
    renderWithProviders(<Login />);

    expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute('href', '/signup');
    expect(screen.getByRole('link', { name: /forgot password/i })).toHaveAttribute(
      'href',
      '/forgot-password'
    );
    expect(screen.getByRole('link', { name: /set up your practice/i })).toHaveAttribute(
      'href',
      '/signup?intent=therapist'
    );
  });

  test('submits credentials with rememberMe and navigates to /dashboard', async () => {
    auth.login.mockResolvedValueOnce({ user: { id: 'u1' }, token: 't' });
    renderWithProviders(<Login />);

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'password123');
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(auth.login).toHaveBeenCalledWith('test@example.com', 'password123', true);
    });
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  test('unchecking Remember me passes rememberMe=false to login', async () => {
    auth.login.mockResolvedValueOnce({ user: { id: 'u1' }, token: 't' });
    renderWithProviders(<Login />);

    await userEvent.click(screen.getByRole('checkbox', { name: /remember me/i }));
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'password123');
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(auth.login).toHaveBeenCalledWith('test@example.com', 'password123', false);
    });
  });

  test('therapist login routes to /therapist', async () => {
    auth.login.mockResolvedValueOnce({ user: { id: 'u1', role: 'therapist' }, token: 't' });
    renderWithProviders(<Login />);

    await userEvent.type(screen.getByLabelText(/email/i), 'doc@example.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'password123');
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/therapist');
    });
  });

  test('login with ?join= code routes to the join page', async () => {
    auth.login.mockResolvedValueOnce({ user: { id: 'u1' }, token: 't' });
    renderWithProviders(<Login />, { initialEntries: ['/login?join=ABC123'] });

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'password123');
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/join/ABC123');
    });
  });

  test('shows server error message on failed login', async () => {
    auth.login.mockRejectedValueOnce({
      response: { data: { error: 'Invalid credentials' } },
    });
    renderWithProviders(<Login />);

    await userEvent.type(screen.getByLabelText(/email/i), 'wrong@example.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'wrongpassword');
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('disables submit button while login is in flight', async () => {
    auth.login.mockImplementation(() => new Promise(() => {})); // never resolves
    renderWithProviders(<Login />);

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'password123');
    const submit = screen.getByRole('button', { name: /^sign in$/i });
    fireEvent.click(submit);

    await waitFor(() => {
      expect(submit).toBeDisabled();
    });
  });

  test('renders web Google sign-in and navigates to /dashboard on success', async () => {
    auth.googleLogin.mockResolvedValueOnce({ user: { id: 'u1' }, token: 'g' });
    renderWithProviders(<Login />);

    fireEvent.click(screen.getByTestId('google-signin-btn'));

    await waitFor(() => {
      expect(auth.googleLogin).toHaveBeenCalledWith('mock-credential', true);
    });
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  test('shows error on Google sign-in failure', async () => {
    auth.googleLogin.mockRejectedValueOnce({
      response: { data: { error: 'Invalid Google token' } },
    });
    renderWithProviders(<Login />);

    fireEvent.click(screen.getByTestId('google-signin-btn'));

    await waitFor(() => {
      expect(screen.getByText('Invalid Google token')).toBeInTheDocument();
    });
  });

  describe('biometric branch', () => {
    beforeEach(() => {
      auth.checkBiometricAvailability.mockResolvedValue(true);
    });

    test('with a saved email, shows the "Sign in as" biometric button and logs in', async () => {
      localStorage.setItem('biometricEmail', 'saved@example.com');
      renderWithProviders(<Login />);

      const bioButton = await screen.findByRole('button', { name: /sign in as saved/i });
      expect(screen.getByText(/use face id or touch id/i)).toBeInTheDocument();

      fireEvent.click(bioButton);

      await waitFor(() => {
        expect(auth.biometricLogin).toHaveBeenCalledWith('saved@example.com');
      });
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    test('without a saved email, biometric button is disabled until email entered', async () => {
      renderWithProviders(<Login />);

      const bioButton = await screen.findByRole('button', { name: /sign in with biometrics/i });
      expect(bioButton).toBeDisabled();

      await userEvent.type(screen.getByLabelText(/email/i), 'typed@example.com');
      expect(bioButton).not.toBeDisabled();

      fireEvent.click(bioButton);
      await waitFor(() => {
        expect(auth.biometricLogin).toHaveBeenCalledWith('typed@example.com');
      });
    });

    test('shows a helpful snackbar when biometrics are not set up for the account', async () => {
      localStorage.setItem('biometricEmail', 'saved@example.com');
      auth.biometricLogin.mockRejectedValueOnce(
        new Error('Biometric login not set up for this account')
      );
      renderWithProviders(<Login />);

      const bioButton = await screen.findByRole('button', { name: /sign in as saved/i });
      fireEvent.click(bioButton);

      await waitFor(() => {
        expect(
          screen.getByText(/sign in with password first, then set up biometrics in settings/i)
        ).toBeInTheDocument();
      });
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
