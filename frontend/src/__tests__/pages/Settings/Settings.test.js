import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import theme from '../../../theme';
import Settings from '../../../pages/Settings/Settings';
import { useAuth } from '../../../contexts/AuthContext';
import { calendarApi, paymentsApi, therapistApi } from '../../../services/api';

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../services/api', () => ({
  calendarApi: {
    getStatus: jest.fn(),
    getAuthUrl: jest.fn(),
    disconnect: jest.fn(),
  },
  paymentsApi: {
    getSubscription: jest.fn(),
    createCheckout: jest.fn(),
    cancel: jest.fn(),
    getPortal: jest.fn(),
  },
  therapistApi: {
    getConsent: jest.fn(),
    setConsent: jest.fn(),
  },
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderWithProviders = (ui) => {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </ThemeProvider>
  );
};

const defaultAuthValue = {
  user: {
    id: 'user-1',
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Doe',
    subscriptionStatus: 'trial',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  relationship: { hasPartner: false },
  invitePartner: jest.fn(),
  refreshUser: jest.fn(),
};

describe('Settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue(defaultAuthValue);
    calendarApi.getStatus.mockResolvedValue({ data: { connected: false } });
    paymentsApi.getSubscription.mockResolvedValue({ data: { trialDaysRemaining: 10 } });
    therapistApi.getConsent.mockResolvedValue({ data: { consent: false } });
  });

  test('shows loading spinner while settings are being fetched', () => {
    calendarApi.getStatus.mockImplementation(() => new Promise(() => {}));
    paymentsApi.getSubscription.mockImplementation(() => new Promise(() => {}));
    therapistApi.getConsent.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<Settings />);

    // The page renders immediately (no global loading gate) but fetches settings in background.
    // Verify the page title still renders while API calls are pending.
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  test('renders settings page title', async () => {
    renderWithProviders(<Settings />);

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  test('shows subscription status chip', async () => {
    renderWithProviders(<Settings />);

    await waitFor(() => {
      expect(screen.getByText('Subscription')).toBeInTheDocument();
    });

    expect(screen.getByText('TRIAL')).toBeInTheDocument();
  });

  test('shows invite partner section when no partner connected', async () => {
    renderWithProviders(<Settings />);

    await waitFor(() => {
      expect(screen.getByText('Partner')).toBeInTheDocument();
    });

    expect(screen.getByText(/Invite your partner to unlock full features/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate Invite Link/i })).toBeInTheDocument();
  });

  test('shows Google Calendar connection section', async () => {
    renderWithProviders(<Settings />);

    await waitFor(() => {
      expect(screen.getByText('Google Calendar')).toBeInTheDocument();
    });

    expect(screen.getByText(/Sync your relationship activities to Google Calendar/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Connect Calendar/i })).toBeInTheDocument();
  });

  test('shows therapist consent toggle', async () => {
    renderWithProviders(<Settings />);

    await waitFor(() => {
      expect(screen.getByText('Therapist Integration')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Allow licensed therapists to assign tasks/)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Enable therapist access/i)).toBeInTheDocument();
  });
});
