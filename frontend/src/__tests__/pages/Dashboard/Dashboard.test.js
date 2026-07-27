import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import Dashboard from '../../../pages/Dashboard/Dashboard';
import { useAuth } from '../../../contexts/AuthContext';
import { renderWithProviders } from '../../../testHelpers/renderWithProviders';
import { createAuthValue } from '../../../testHelpers/mockAuthContext';

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../services/api', () =>
  require('../../../testHelpers/mockApi').buildApiModuleMock()
);

jest.mock('../../../utils/celebrate', () => ({
  celebrate: jest.fn(),
}));

import {
  logsApi,
  matchupApi,
  strategiesApi,
  assessmentsApi,
  meetingsApi,
  paymentsApi,
  gratitudeApi,
  streaksApi,
  progressRingsApi,
  realTalkApi,
  insightsApi,
} from '../../../services/api';

const twoCompleted = {
  completed: [
    { type: 'attachment', score: { style: 'secure' } },
    { type: 'personality', score: { type: 'INFJ' } },
  ],
  pending: [
    'love_language', 'human_needs', 'gottman_checkup', 'emotional_intelligence',
    'conflict_style', 'differentiation', 'hormonal_health', 'physical_vitality',
  ],
};

const setupDefaultMocks = ({ assessments = twoCompleted, hasLoggedToday = false } = {}) => {
  logsApi.getPrompt.mockResolvedValue({
    data: { prompt: { prompt: 'What made you smile today?' }, hasLoggedToday },
  });
  logsApi.getStats.mockResolvedValue({ data: { stats: { avgRatio: 3.5, daysLogged: 5 } } });
  assessmentsApi.getResults.mockResolvedValue({ data: assessments });
  meetingsApi.getUpcoming.mockResolvedValue({ data: { meetings: [] } });
  paymentsApi.getSubscription.mockResolvedValue({ data: null });
  gratitudeApi.getToday.mockResolvedValue({ data: { entry: null } });
  gratitudeApi.getStreak.mockResolvedValue({
    data: { currentStreak: 0, longestStreak: 0, totalEntries: 0 },
  });
  gratitudeApi.getLoveNote.mockResolvedValue({ data: { loveNote: null } });
  streaksApi.getStreak.mockResolvedValue({ data: { currentStreak: 0 } });
  progressRingsApi.get.mockResolvedValue({ data: null });
  realTalkApi.list.mockResolvedValue({ data: { pagination: { total: 0 } } });
  strategiesApi.getCurrent.mockResolvedValue({ data: { strategy: null } });
  matchupApi.getCurrent.mockResolvedValue({ data: { matchup: null } });
  insightsApi.getDaily.mockRejectedValue(new Error('no insight'));
};

const failAllMocks = () => {
  const reject = () => Promise.reject(new Error('offline'));
  [
    logsApi.getPrompt, logsApi.getStats, assessmentsApi.getResults,
    meetingsApi.getUpcoming, paymentsApi.getSubscription, gratitudeApi.getToday,
    gratitudeApi.getStreak, gratitudeApi.getLoveNote, streaksApi.getStreak,
    progressRingsApi.get, realTalkApi.list, strategiesApi.getCurrent,
    matchupApi.getCurrent,
  ].forEach((fn) => fn.mockImplementation(reject));
  insightsApi.getDaily.mockRejectedValue(new Error('offline'));
};

const renderPage = () => renderWithProviders(<Dashboard />);

describe('Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    useAuth.mockReturnValue(createAuthValue());
    setupDefaultMocks();
  });

  test('shows layout skeleton while data loads', () => {
    logsApi.getPrompt.mockImplementation(() => new Promise(() => {}));
    logsApi.getStats.mockImplementation(() => new Promise(() => {}));

    const { container } = renderPage();

    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
    expect(screen.queryByText('Your progress')).not.toBeInTheDocument();
  });

  test('renders the relationship-health hero with the checkup invite when no score exists', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('See where things stand')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /take the checkup/i })).toBeInTheDocument();
  });

  test('continue card points at the exact next step (finish assessments)', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Your progress')).toBeInTheDocument();
    });
    // 2 of 3 done → one more to unlock the plan
    const journeyCard = screen.getByText('Your progress').closest('.MuiCard-root');
    expect(
      within(journeyCard).getByText(/finish your assessments — 1 to go/i)
    ).toBeInTheDocument();

    fireEvent.click(within(journeyCard).getByRole('button', { name: /continue/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/assessments');
  });

  test('hero action card mirrors the assessments-remaining state', async () => {
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText(/1 more assessment and your personalized plan unlocks/i)
      ).toBeInTheDocument();
    });
  });

  test('shows the "How Love Rescue works" roadmap for early users', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('How Love Rescue works')).toBeInTheDocument();
    });
    expect(screen.getByText('Take a few quick assessments')).toBeInTheDocument();
    expect(screen.getByText('Get your personalized weekly plan')).toBeInTheDocument();
  });

  test('renders completed assessment result cards with score chips', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('secure')).toBeInTheDocument();
    });
    expect(screen.getByText('INFJ')).toBeInTheDocument();
  });

  test('after the plan unlocks, the next step becomes the daily check-in', async () => {
    setupDefaultMocks({
      assessments: {
        completed: [
          { type: 'attachment', score: { style: 'secure' } },
          { type: 'personality', score: { type: 'INFJ' } },
          { type: 'love_language', score: { primary: 'quality_time' } },
        ],
        pending: ['human_needs'],
      },
      hasLoggedToday: false,
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/do today's check-in/i)).toBeInTheDocument();
    });
    // ActionCard's check-in CTA routes to /daily
    fireEvent.click(screen.getByRole('button', { name: /check in \(~45 sec\)/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/daily');
  });

  test('shows a retry banner instead of a silent blank dashboard when loading fails', async () => {
    failAllMocks();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/some things didn't load/i)).toBeInTheDocument();
    });

    // Retry re-fires the dashboard queries
    setupDefaultMocks();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(screen.queryByText(/some things didn't load/i)).not.toBeInTheDocument();
    });
    expect(logsApi.getPrompt.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  test('persists the derived user state for Layout\'s dynamic nav', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Your progress')).toBeInTheDocument();
    });
    // Journey state is server-owned now — the Dashboard must NOT relay it
    // through localStorage (that relay left the nav permanently stale).
    expect(localStorage.getItem('lr_user_state')).toBeNull();
  });
});
