import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Signup from '../../../pages/Auth/Signup';
import { useAuth } from '../../../contexts/AuthContext';
import { renderWithProviders } from '../../../testHelpers/renderWithProviders';
import { createAuthValue } from '../../../testHelpers/mockAuthContext';

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../utils/platform', () => ({
  isNative: () => false,
  isIOS: () => false,
  isAndroid: () => false,
  isWeb: () => true,
  getPlatform: () => 'web',
  useAppleIAP: () => false,
  useStripeCheckout: () => true,
}));

jest.mock('@react-oauth/google', () => ({
  GoogleLogin: (props) => (
    <button
      data-testid="google-signup-btn"
      onClick={() => props.onSuccess({ credential: 'mock-credential' })}
    >
      Sign up with Google
    </button>
  ),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const fillForm = async ({
  firstName = 'Test',
  lastName = 'User',
  email = 'test@example.com',
  password = 'password123',
  confirm = password,
} = {}) => {
  await userEvent.type(screen.getByLabelText(/first name/i), firstName);
  await userEvent.type(screen.getByLabelText(/last name/i), lastName);
  await userEvent.type(screen.getByLabelText(/email/i), email);
  const passwordFields = screen.getAllByLabelText(/password/i);
  const passwordInput = passwordFields.find((el) => el.getAttribute('name') === 'password');
  const confirmInput = passwordFields.find((el) => el.getAttribute('name') === 'confirmPassword');
  await userEvent.type(passwordInput, password);
  await userEvent.type(confirmInput, confirm);
};

describe('Signup', () => {
  let auth;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    process.env.REACT_APP_GOOGLE_CLIENT_ID = 'test-google-client-id';
    auth = createAuthValue({ user: null, relationship: null });
    useAuth.mockImplementation(() => auth);
  });

  afterAll(() => {
    delete process.env.REACT_APP_GOOGLE_CLIENT_ID;
  });

  test('renders signup form with all fields and free-to-start copy', () => {
    renderWithProviders(<Signup />);

    expect(screen.getByText('Start Your Journey')).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/password/i).length).toBeGreaterThanOrEqual(2);
    // Free-era copy — no trial/pricing pitch on signup.
    expect(screen.getByText(/free to start — no credit card required/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  test('shows gender selection buttons', () => {
    renderWithProviders(<Signup />);

    expect(screen.getByRole('button', { name: /^👨 male$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^👩 female$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /prefer not to say/i })).toBeInTheDocument();
  });

  test('shows link to login page', () => {
    renderWithProviders(<Signup />);

    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });

  test('shows error when passwords do not match and does not submit', async () => {
    renderWithProviders(<Signup />);

    await fillForm({ password: 'password123', confirm: 'different456' });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
    expect(auth.signup).not.toHaveBeenCalled();
  });

  test('shows error for short password (< 8 chars)', async () => {
    renderWithProviders(<Signup />);

    await fillForm({ password: 'short', confirm: 'short' });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });
    expect(auth.signup).not.toHaveBeenCalled();
  });

  test('submits the form and navigates to /dashboard', async () => {
    auth.signup.mockResolvedValueOnce({ user: {}, token: 't' });
    renderWithProviders(<Signup />);

    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(auth.signup).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          password: 'password123',
        })
      );
    });
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  test('includes selected gender in the signup payload', async () => {
    auth.signup.mockResolvedValueOnce({ user: {}, token: 't' });
    renderWithProviders(<Signup />);

    fireEvent.click(screen.getByRole('button', { name: /^👨 male$/i }));
    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(auth.signup).toHaveBeenCalledWith(
        expect.objectContaining({ gender: 'male' })
      );
    });
  });

  test('signup with ?join= code routes to the join page', async () => {
    auth.signup.mockResolvedValueOnce({ user: {}, token: 't' });
    renderWithProviders(<Signup />, { initialEntries: ['/signup?join=XYZ789'] });

    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/join/XYZ789');
    });
  });

  test('shows server error on signup failure', async () => {
    auth.signup.mockRejectedValueOnce({
      response: { data: { error: 'Email already in use' } },
    });
    renderWithProviders(<Signup />);

    await fillForm({ email: 'taken@example.com' });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Email already in use')).toBeInTheDocument();
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('Google sign-up navigates to /dashboard on success', async () => {
    auth.googleLogin.mockResolvedValueOnce({ user: { id: 'g1' }, token: 'g' });
    renderWithProviders(<Signup />);

    fireEvent.click(screen.getByTestId('google-signup-btn'));

    await waitFor(() => {
      expect(auth.googleLogin).toHaveBeenCalledWith('mock-credential');
    });
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  test('shows error on Google sign-up failure', async () => {
    auth.googleLogin.mockRejectedValueOnce({
      response: { data: { error: 'Google sign-up failed' } },
    });
    renderWithProviders(<Signup />);

    fireEvent.click(screen.getByTestId('google-signup-btn'));

    await waitFor(() => {
      expect(screen.getByText('Google sign-up failed')).toBeInTheDocument();
    });
  });

  test('resumes a QuickStart read with continuation copy', () => {
    localStorage.setItem(
      'lr_quickstart',
      JSON.stringify({ title: 'Why the little fights keep happening' })
    );
    renderWithProviders(<Signup />);

    expect(screen.getByText('Pick up where you left off')).toBeInTheDocument();
    expect(screen.getByText(/why the little fights keep happening/i)).toBeInTheDocument();
  });
});
