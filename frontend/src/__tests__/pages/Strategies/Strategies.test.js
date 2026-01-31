import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import theme from '../../../theme';
import Strategies from '../../../pages/Strategies/Strategies';
import { useAuth } from '../../../contexts/AuthContext';
import { strategiesApi, calendarApi } from '../../../services/api';

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../services/api', () => ({
  strategiesApi: {
    getCurrent: jest.fn(),
    generate: jest.fn(),
    updateProgress: jest.fn(),
    getHistory: jest.fn(),
  },
  calendarApi: {
    sync: jest.fn(),
    getAuthUrl: jest.fn(),
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

const mockStrategy = {
  id: 'strategy-1',
  cycleNumber: 1,
  week: 2,
  progress: 45,
  startDate: '2026-01-01',
  endDate: '2026-02-12',
  weeklyGoals: ['Communicate openly', 'Practice active listening', 'Schedule date night'],
  dailyActivities: {
    monday: ['Morning check-in', 'Express gratitude'],
    tuesday: ['Evening walk together'],
    wednesday: [],
    thursday: ['Share a meal without devices'],
    friday: ['Fun activity together'],
    saturday: [],
    sunday: ['Weekly reflection'],
  },
};

describe('Strategies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      relationship: { hasPartner: true },
    });
  });

  test('shows loading spinner while fetching strategy', () => {
    strategiesApi.getCurrent.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<Strategies />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders page title after loading', async () => {
    strategiesApi.getCurrent.mockResolvedValueOnce({
      data: { strategy: mockStrategy },
    });

    renderWithProviders(<Strategies />);

    await waitFor(() => {
      expect(screen.getByText('Your Relationship Strategy')).toBeInTheDocument();
    });
  });

  test('displays current strategy cycle and week info', async () => {
    strategiesApi.getCurrent.mockResolvedValueOnce({
      data: { strategy: mockStrategy },
    });

    renderWithProviders(<Strategies />);

    await waitFor(() => {
      expect(screen.getByText('Cycle 1 - Week 2')).toBeInTheDocument();
    });
  });

  test('shows progress bar with percentage', async () => {
    strategiesApi.getCurrent.mockResolvedValueOnce({
      data: { strategy: mockStrategy },
    });

    renderWithProviders(<Strategies />);

    await waitFor(() => {
      expect(screen.getByText('Week 2 Progress')).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  test('shows "No Active Strategy" message when no strategy exists', async () => {
    strategiesApi.getCurrent.mockRejectedValueOnce({
      response: { status: 404 },
    });

    renderWithProviders(<Strategies />);

    await waitFor(() => {
      expect(screen.getByText('No Active Strategy')).toBeInTheDocument();
      expect(
        screen.getByText(/Generate a personalized 6-week strategy/)
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Generate Strategy/i })).toBeInTheDocument();
    });
  });

  test('displays weekly goals from the strategy', async () => {
    strategiesApi.getCurrent.mockResolvedValueOnce({
      data: { strategy: mockStrategy },
    });

    renderWithProviders(<Strategies />);

    await waitFor(() => {
      expect(screen.getByText('Weekly Goals')).toBeInTheDocument();
    });

    expect(screen.getByText('Communicate openly')).toBeInTheDocument();
    expect(screen.getByText('Practice active listening')).toBeInTheDocument();
    expect(screen.getByText('Schedule date night')).toBeInTheDocument();
  });
});
