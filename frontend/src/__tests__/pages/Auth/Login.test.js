import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import theme from '../../../theme';
import Login from '../../../pages/Auth/Login';
import { useAuth } from '../../../contexts/AuthContext';

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock GoogleLogin component from @react-oauth/google
let mockGoogleOnSuccess;
jest.mock('@react-oauth/google', () => ({
  GoogleLogin: (props) => {
    mockGoogleOnSuccess = props.onSuccess;
    return <button data-testid="google-signin-btn" onClick={() => props.onSuccess({ credential: 'mock-credential' })}>Sign in with Google</button>;
  },
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderWithProviders = (ui, { route = '/' } = {}) => {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[route]}>
        {ui}
      </MemoryRouter>
    </ThemeProvider>
  );
};

describe('Login', () => {
  const mockLogin = jest.fn();
  const mockGoogleLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      login: mockLogin,
      googleLogin: mockGoogleLogin,
      error: null,
    });
  });

  test('renders login form with email and password fields', () => {
    renderWithProviders(<Login />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  test('renders Sign In button', () => {
    renderWithProviders(<Login />);

    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
  });

  test('shows link to signup page', () => {
    renderWithProviders(<Login />);

    const signupLink = screen.getByRole('link', { name: /sign up/i });
    expect(signupLink).toBeInTheDocument();
    expect(signupLink).toHaveAttribute('href', '/signup');
  });

  test('calls login on form submit', async () => {
    mockLogin.mockResolvedValueOnce({ user: {}, token: 'test-token' });

    renderWithProviders(<Login />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'password123');

    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  test('shows error message on failed login', async () => {
    mockLogin.mockRejectedValueOnce({
      response: { data: { error: 'Invalid credentials' } },
    });

    renderWithProviders(<Login />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await userEvent.type(emailInput, 'wrong@example.com');
    await userEvent.type(passwordInput, 'wrongpassword');

    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  test('navigates to dashboard on successful login', async () => {
    mockLogin.mockResolvedValueOnce({ user: {}, token: 'test-token' });

    renderWithProviders(<Login />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'password123');

    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('disables button while loading', async () => {
    mockLogin.mockImplementation(() => new Promise(() => {})); // never resolves

    renderWithProviders(<Login />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'password123');

    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '' })).toBeDisabled();
    });
  });

  test('shows biometric snackbar when biometric button clicked', async () => {
    renderWithProviders(<Login />);

    const biometricButton = screen.getByRole('button', { name: /sign in with biometrics/i });
    fireEvent.click(biometricButton);

    await waitFor(() => {
      expect(
        screen.getByText(/biometric login can be set up after signing in via settings/i)
      ).toBeInTheDocument();
    });
  });

  test('renders Google Sign-In button', () => {
    renderWithProviders(<Login />);

    expect(screen.getByTestId('google-signin-btn')).toBeInTheDocument();
  });

  test('navigates to /dashboard on Google sign-in for existing user', async () => {
    mockGoogleLogin.mockResolvedValueOnce({
      user: { id: 'user-1' },
      token: 'google-token',
      isNewUser: false,
    });

    renderWithProviders(<Login />);

    fireEvent.click(screen.getByTestId('google-signin-btn'));

    await waitFor(() => {
      expect(mockGoogleLogin).toHaveBeenCalledWith('mock-credential');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  test('navigates to /assessments on Google sign-in for new user', async () => {
    mockGoogleLogin.mockResolvedValueOnce({
      user: { id: 'user-1' },
      token: 'google-token',
      isNewUser: true,
    });

    renderWithProviders(<Login />);

    fireEvent.click(screen.getByTestId('google-signin-btn'));

    await waitFor(() => {
      expect(mockGoogleLogin).toHaveBeenCalledWith('mock-credential');
      expect(mockNavigate).toHaveBeenCalledWith('/assessments');
    });
  });

  test('shows error on Google sign-in failure', async () => {
    mockGoogleLogin.mockRejectedValueOnce({
      response: { data: { error: 'Invalid Google token' } },
    });

    renderWithProviders(<Login />);

    fireEvent.click(screen.getByTestId('google-signin-btn'));

    await waitFor(() => {
      expect(screen.getByText('Invalid Google token')).toBeInTheDocument();
    });
  });
});
