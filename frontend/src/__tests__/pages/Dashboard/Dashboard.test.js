import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import theme from '../../../theme';
import Dashboard from '../../../pages/Dashboard/Dashboard';
import { useAuth } from '../../../contexts/AuthContext';
import api, {
  logsApi,
  matchupApi,
  strategiesApi,
  assessmentsApi,
  meetingsApi,
  paymentsApi,
} from '../../../services/api';

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
  logsApi: { getPrompt: jest.fn(), getStats: jest.fn() },
  matchupApi: { getCurrent: jest.fn() },
  strategiesApi: { getCurrent: jest.fn() },
  assessmentsApi: { getResults: jest.fn() },
  meetingsApi: { getUpcoming: jest.fn() },
  paymentsApi: { getSubscription: jest.fn() },
}));

jest.mock('../../../components/common/DailyInsight', () => () => (
  <div data-testid="daily-insight">DailyInsight</div>
));
jest.mock('../../../components/common/DailyVideo', () => () => (
  <div data-testid="daily-video">DailyVideo</div>
));

const renderWithProviders = (ui, { route = '/' } = {}) => {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[route]}>
        {ui}
      </MemoryRouter>
    </ThemeProvider>
  );
};

// Default mock data
const mockPromptData = {
  data: {
    prompt: { prompt: 'What made you smile about your partner today?' },
    hasLoggedToday: false,
  },
};

const mockStatsData = {
  data: {
    stats: {
      avgRatio: 3.5,
      daysLogged: 5,
      trend: 'improving',
    },
  },
};

const mockAssessmentsData = {
  data: {
    completed: ['attachment', 'communication'],
    pending: ['conflict', 'values'],
    allCompleted: false,
  },
};

const mockMeetingsData = {
  data: {
    meetings: [],
  },
};

const mockSubscriptionData = {
  data: {
    isPremium: false,
    status: 'trial',
  },
};

const mockMatchupData = {
  data: {
    matchup: {
      score: 72,
      alignments: ['communication', 'values'],
      misses: ['conflict'],
    },
  },
};

const mockStrategyData = {
  data: {
    strategy: {
      week: 3,
      progress: 60,
      weeklyGoals: [
        'Practice active listening daily',
        'Schedule one date night',
        'Share one appreciation each day',
      ],
    },
  },
};

const setupDefaultMocks = () => {
  logsApi.getPrompt.mockResolvedValue(mockPromptData);
  logsApi.getStats.mockResolvedValue(mockStatsData);
  assessmentsApi.getResults.mockResolvedValue(mockAssessmentsData);
  meetingsApi.getUpcoming.mockResolvedValue(mockMeetingsData);
  paymentsApi.getSubscription.mockResolvedValue(mockSubscriptionData);
  matchupApi.getCurrent.mockResolvedValue(mockMatchupData);
  strategiesApi.getCurrent.mockResolvedValue(mockStrategyData);
};

describe('Dashboard', () => {
  const mockInvitePartner = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
    useAuth.mockReturnValue({
      user: { id: 'user-1', firstName: 'Test', lastName: 'User', email: 'test@example.com' },
      relationship: { id: 'rel-1', hasPartner: false },
      invitePartner: mockInvitePartner,
    });
  });

  test('shows loading spinner initially', () => {
    // Make API calls hang so loading stays visible
    logsApi.getPrompt.mockImplementation(() => new Promise(() => {}));
    logsApi.getStats.mockImplementation(() => new Promise(() => {}));
    assessmentsApi.getResults.mockImplementation(() => new Promise(() => {}));
    meetingsApi.getUpcoming.mockImplementation(() => new Promise(() => {}));
    paymentsApi.getSubscription.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<Dashboard />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders welcome message with user name', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/welcome, test!/i)).toBeInTheDocument();
    });
  });

  test('shows partner invite alert when no partner', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(
        screen.getByText(/your partner hasn't joined yet/i)
      ).toBeInTheDocument();
    });

    const inviteButtons = screen.getAllByRole('button', { name: /invite partner/i });
    expect(inviteButtons.length).toBeGreaterThanOrEqual(1);
  });

  test('shows daily prompt card', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("Today's Prompt")).toBeInTheDocument();
    });

    expect(
      screen.getByText('What made you smile about your partner today?')
    ).toBeInTheDocument();
  });

  test('shows assessment progress card', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Assessments')).toBeInTheDocument();
    });

    expect(screen.getByText('2/4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue assessments/i })).toBeInTheDocument();
  });

  test('shows matchup score when available', async () => {
    useAuth.mockReturnValue({
      user: { id: 'user-1', firstName: 'Test', lastName: 'User', email: 'test@example.com' },
      relationship: { id: 'rel-1', hasPartner: true },
      invitePartner: mockInvitePartner,
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('72%')).toBeInTheDocument();
    });

    expect(screen.getByText(/2 alignments/i)).toBeInTheDocument();
    expect(screen.getByText(/1 areas to work on/i)).toBeInTheDocument();
  });

  test('shows strategy card when active', async () => {
    useAuth.mockReturnValue({
      user: { id: 'user-1', firstName: 'Test', lastName: 'User', email: 'test@example.com' },
      relationship: { id: 'rel-1', hasPartner: true },
      invitePartner: mockInvitePartner,
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/current strategy - week 3/i)).toBeInTheDocument();
    });

    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('Practice active listening daily')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view full strategy/i })).toBeInTheDocument();
  });

  test('shows stats card with ratio and days logged', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('This Week')).toBeInTheDocument();
    });

    expect(screen.getByText('3.5:1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Avg Ratio')).toBeInTheDocument();
    expect(screen.getByText('Days Logged')).toBeInTheDocument();
  });

  test('invite button creates invite link', async () => {
    mockInvitePartner.mockResolvedValueOnce({
      inviteLink: 'http://localhost:3000/join/ABC123',
      inviteCode: 'ABC123',
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/your partner hasn't joined yet/i)).toBeInTheDocument();
    });

    const inviteButtons = screen.getAllByRole('button', { name: /invite partner/i });
    fireEvent.click(inviteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('http://localhost:3000/join/ABC123')).toBeInTheDocument();
    });

    expect(mockInvitePartner).toHaveBeenCalled();
  });

  test('shows "Completed" chip when logged today', async () => {
    logsApi.getPrompt.mockResolvedValue({
      data: {
        prompt: { prompt: 'What made you smile about your partner today?' },
        hasLoggedToday: true,
      },
    });

    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });

  test('shows meetings card', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Mediated Meetings')).toBeInTheDocument();
    });
  });

  test('navigates to daily log on prompt button click', async () => {
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText("Today's Prompt")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /log now/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/daily');
  });
});
