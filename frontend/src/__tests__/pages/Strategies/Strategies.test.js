import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../testHelpers/renderWithProviders';
import { createPartnerAuth, createAuthValue } from '../../../testHelpers/mockAuthContext';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../services/api', () =>
  require('../../../testHelpers/mockApi').buildApiModuleMock()
);

jest.mock('../../../utils/platform', () => ({
  isNative: () => false,
  isIOS: () => false,
  isAndroid: () => false,
  isWeb: () => true,
  getPlatform: () => 'web',
  useAppleIAP: () => false,
  useStripeCheckout: () => true,
}));

import Strategies from '../../../pages/Strategies/Strategies';
import { useAuth } from '../../../contexts/AuthContext';
import { strategiesApi, calendarApi } from '../../../services/api';

const mockStrategy = {
  id: 'strategy-1',
  cycleNumber: 1,
  week: 2,
  progress: 45,
  startDate: '2026-01-01',
  endDate: '2026-02-12',
  introduction: {
    weekName: 'Week 2: Rebuilding Trust',
    personalizedMessage: 'This week is about small consistent deposits of trust.',
  },
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

const renderPage = () => renderWithProviders(<Strategies />);

describe('Strategies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    useAuth.mockReturnValue(createPartnerAuth());
    strategiesApi.getCurrent.mockResolvedValue({ data: { strategy: mockStrategy } });
    strategiesApi.updateProgress.mockResolvedValue({ data: {} });
  });

  test('shows loading spinner while fetching strategy', () => {
    strategiesApi.getCurrent.mockImplementation(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders couple title with cycle and week info', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Your Relationship Strategy')).toBeInTheDocument();
    });
    expect(screen.getByText('Cycle 1 - Week 2')).toBeInTheDocument();
  });

  test('solo users get the personal-growth title instead', async () => {
    useAuth.mockReturnValue(createAuthValue()); // no partner
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Your Personal Growth Strategy')).toBeInTheDocument();
    });
  });

  test('shows week progress with percentage', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Week 2 Progress')).toBeInTheDocument();
    });
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  test('renders the personalized weekly introduction', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Week 2: Rebuilding Trust')).toBeInTheDocument();
    });
    expect(
      screen.getByText('This week is about small consistent deposits of trust.')
    ).toBeInTheDocument();
  });

  test('displays weekly goals and daily activity accordions', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Weekly Goals')).toBeInTheDocument();
    });
    expect(screen.getByText('Communicate openly')).toBeInTheDocument();
    expect(screen.getByText('Practice active listening')).toBeInTheDocument();
    expect(screen.getByText('Schedule date night')).toBeInTheDocument();

    // Days with activities appear; empty days don't
    expect(screen.getByText('monday')).toBeInTheDocument();
    expect(screen.getByText('sunday')).toBeInTheDocument();
    expect(screen.queryByText('wednesday')).not.toBeInTheDocument();
  });

  test('checking off a goal persists locally and syncs progress to the backend', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Weekly Goals')).toBeInTheDocument();
    });

    const goalItem = screen.getByText('Communicate openly').closest('li');
    const checkbox = within(goalItem).getByRole('checkbox');
    await userEvent.click(checkbox);

    await waitFor(() => {
      expect(strategiesApi.updateProgress).toHaveBeenCalledWith(
        'strategy-1',
        expect.objectContaining({ progress: expect.any(Number) })
      );
    });
    expect(JSON.parse(localStorage.getItem('strategy_tasks_strategy-1'))).toContain('goal-0');
  });

  test('shows the empty-state roadmap CTA when no strategy exists (404)', async () => {
    strategiesApi.getCurrent.mockRejectedValueOnce({ response: { status: 404 } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Your roadmap is waiting')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /take assessment/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/assessments');
  });

  test('generating a new strategy replaces the current one', async () => {
    strategiesApi.generate.mockResolvedValueOnce({
      data: { strategies: [{ ...mockStrategy, id: 'strategy-2', week: 1, cycleNumber: 2, progress: 0 }] },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Cycle 1 - Week 2')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /new strategy/i }));

    await waitFor(() => {
      expect(screen.getByText('New 6-week strategy generated!')).toBeInTheDocument();
    });
    expect(screen.getByText('Cycle 2 - Week 1')).toBeInTheDocument();
  });

  test('calendar sync success shows confirmation', async () => {
    calendarApi.sync.mockResolvedValueOnce({ data: {} });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Cycle 1 - Week 2')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /sync to calendar/i }));

    await waitFor(() => {
      expect(screen.getByText('Activities synced to Google Calendar!')).toBeInTheDocument();
    });
  });
});
