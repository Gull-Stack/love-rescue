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

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      signup: mockSignup,
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
});
