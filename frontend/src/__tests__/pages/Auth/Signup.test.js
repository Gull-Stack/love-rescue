import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import theme from '../../../theme';
import Signup from '../../../pages/Auth/Signup';
import { useAuth } from '../../../contexts/AuthContext';

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock GoogleLogin component from @react-oauth/google
jest.mock('@react-oauth/google', () => ({
  GoogleLogin: (props) => {
    return <button data-testid="google-signup-btn" onClick={() => props.onSuccess({ credential: 'mock-credential' })}>Sign up with Google</button>;
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

describe('Signup', () => {
  const mockSignup = jest.fn();
  const mockGoogleLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      signup: mockSignup,
      googleLogin: mockGoogleLogin,
    });
  });

  test('renders signup form with all fields', () => {
    renderWithProviders(<Signup />);

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    // Password field - MUI renders required asterisk as part of label, use the input name
    const passwordInputs = screen.getAllByLabelText(/password/i);
    expect(passwordInputs.length).toBeGreaterThanOrEqual(2);
  });

  test('renders Create Account button', () => {
    renderWithProviders(<Signup />);

    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  test('shows link to login page', () => {
    renderWithProviders(<Signup />);

    const loginLink = screen.getByRole('link', { name: /sign in/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  test('shows error when passwords do not match', async () => {
    renderWithProviders(<Signup />);

    await userEvent.type(screen.getByLabelText(/first name/i), 'Test');
    await userEvent.type(screen.getByLabelText(/last name/i), 'User');
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    const passwordFields = screen.getAllByLabelText(/password/i);
    const passwordInput = passwordFields.find(el => el.getAttribute('name') === 'password');
    const confirmInput = passwordFields.find(el => el.getAttribute('name') === 'confirmPassword');
    await userEvent.type(passwordInput, 'password123');
    await userEvent.type(confirmInput, 'different456');

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });

    expect(mockSignup).not.toHaveBeenCalled();
  });

  test('shows error for short password (< 8 chars)', async () => {
    renderWithProviders(<Signup />);

    await userEvent.type(screen.getByLabelText(/first name/i), 'Test');
    await userEvent.type(screen.getByLabelText(/last name/i), 'User');
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    const passwordFields = screen.getAllByLabelText(/password/i);
    const passwordInput = passwordFields.find(el => el.getAttribute('name') === 'password');
    const confirmInput = passwordFields.find(el => el.getAttribute('name') === 'confirmPassword');
    await userEvent.type(passwordInput, 'short');
    await userEvent.type(confirmInput, 'short');

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });

    expect(mockSignup).not.toHaveBeenCalled();
  });

  test('calls signup on valid form submit', async () => {
    mockSignup.mockResolvedValueOnce({ user: {}, token: 'test-token' });

    renderWithProviders(<Signup />);

    await userEvent.type(screen.getByLabelText(/first name/i), 'Test');
    await userEvent.type(screen.getByLabelText(/last name/i), 'User');
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    const passwordFields = screen.getAllByLabelText(/password/i);
    const passwordInput = passwordFields.find(el => el.getAttribute('name') === 'password');
    const confirmInput = passwordFields.find(el => el.getAttribute('name') === 'confirmPassword');
    await userEvent.type(passwordInput, 'password123');
    await userEvent.type(confirmInput, 'password123');

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockSignup).toHaveBeenCalledWith({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  test('shows error on signup failure', async () => {
    mockSignup.mockRejectedValueOnce({
      response: { data: { error: 'Email already in use' } },
    });

    renderWithProviders(<Signup />);

    await userEvent.type(screen.getByLabelText(/first name/i), 'Test');
    await userEvent.type(screen.getByLabelText(/last name/i), 'User');
    await userEvent.type(screen.getByLabelText(/email/i), 'taken@example.com');
    const passwordFields = screen.getAllByLabelText(/password/i);
    const passwordInput = passwordFields.find(el => el.getAttribute('name') === 'password');
    const confirmInput = passwordFields.find(el => el.getAttribute('name') === 'confirmPassword');
    await userEvent.type(passwordInput, 'password123');
    await userEvent.type(confirmInput, 'password123');

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Email already in use')).toBeInTheDocument();
    });
  });

  test('navigates to /assessments on success', async () => {
    mockSignup.mockResolvedValueOnce({ user: {}, token: 'test-token' });

    renderWithProviders(<Signup />);

    await userEvent.type(screen.getByLabelText(/first name/i), 'Test');
    await userEvent.type(screen.getByLabelText(/last name/i), 'User');
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    const passwordFields = screen.getAllByLabelText(/password/i);
    const passwordInput = passwordFields.find(el => el.getAttribute('name') === 'password');
    const confirmInput = passwordFields.find(el => el.getAttribute('name') === 'confirmPassword');
    await userEvent.type(passwordInput, 'password123');
    await userEvent.type(confirmInput, 'password123');

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/assessments');
    });
  });

  test('renders Google Sign-Up button', () => {
    renderWithProviders(<Signup />);

    expect(screen.getByTestId('google-signup-btn')).toBeInTheDocument();
  });

  test('navigates to /assessments on Google sign-up success', async () => {
    mockGoogleLogin.mockResolvedValueOnce({
      user: { id: 'user-g1' },
      token: 'google-token',
      isNewUser: true,
    });

    renderWithProviders(<Signup />);

    fireEvent.click(screen.getByTestId('google-signup-btn'));

    await waitFor(() => {
      expect(mockGoogleLogin).toHaveBeenCalledWith('mock-credential');
      expect(mockNavigate).toHaveBeenCalledWith('/assessments');
    });
  });

  test('shows error on Google sign-up failure', async () => {
    mockGoogleLogin.mockRejectedValueOnce({
      response: { data: { error: 'Google sign-up failed' } },
    });

    renderWithProviders(<Signup />);

    fireEvent.click(screen.getByTestId('google-signup-btn'));

    await waitFor(() => {
      expect(screen.getByText('Google sign-up failed')).toBeInTheDocument();
    });
  });
});
