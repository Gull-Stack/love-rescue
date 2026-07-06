import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../testHelpers/renderWithProviders';
import { createPartnerAuth } from '../../../testHelpers/mockAuthContext';

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../services/api', () =>
  require('../../../testHelpers/mockApi').buildApiModuleMock()
);

jest.mock('../../../utils/haptics', () => ({
  hapticLight: jest.fn(),
  hapticMedium: jest.fn(),
  hapticSuccess: jest.fn(),
}));

jest.mock('../../../utils/celebrate', () => ({
  celebrate: jest.fn(),
}));

jest.mock('canvas-confetti', () => jest.fn());

jest.mock('../../../hooks/usePushNotifications', () => ({
  __esModule: true,
  default: () => ({
    isSupported: false,
    isSubscribed: false,
    subscribe: jest.fn(),
  }),
}));

import DailyLog from '../../../pages/DailyLog/DailyLog';
import { useAuth } from '../../../contexts/AuthContext';
import { logsApi, streaksApi, gratitudeApi } from '../../../services/api';
import { celebrate } from '../../../utils/celebrate';

const mockPromptResponse = {
  data: {
    prompt: { id: 1, prompt: 'What happened today?', type: 'appreciation' },
    hasLoggedToday: false,
    todayLog: null,
  },
};

const mockStreak = {
  data: {
    currentStreak: 1,
    longestStreak: 3,
    xp: 50,
    level: 1,
    levelName: 'Relationship Rookie',
    levelProgress: 10,
    xpToNextLevel: 100,
    streakAlive: true,
    loggedToday: false,
  },
};

const renderPage = () => renderWithProviders(<DailyLog />);

// The check-in is a 7-card swipe deck; simulate a left swipe (next card).
const swipeLeft = (element) => {
  fireEvent.touchStart(element, { touches: [{ clientX: 300, clientY: 200 }] });
  fireEvent.touchEnd(element, { changedTouches: [{ clientX: 100, clientY: 200 }] });
};

const clickNext = async (name = /^next$/i) => {
  fireEvent.click(screen.getByRole('button', { name }));
};

describe('DailyLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue(createPartnerAuth());
    logsApi.getPrompt.mockResolvedValue(mockPromptResponse);
    logsApi.getDaily.mockRejectedValue(new Error('No log for today'));
    logsApi.submitDaily.mockResolvedValue({ data: { message: 'Daily log saved', log: {} } });
    streaksApi.getStreak.mockResolvedValue(mockStreak);
    gratitudeApi.submitEntry.mockResolvedValue({ data: {} });
  });

  test('shows loading spinner initially', () => {
    logsApi.getPrompt.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('starts on the mood card', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('How are you feeling?')).toBeInTheDocument();
    });
    expect(screen.getByText(/auto-advances after selection/i)).toBeInTheDocument();
  });

  test('swiping left advances to the connection card (uses partner name)', async () => {
    const { container } = renderPage();
    await waitFor(() => {
      expect(screen.getByText('How are you feeling?')).toBeInTheDocument();
    });

    swipeLeft(container.firstChild);

    await waitFor(() => {
      expect(
        screen.getByText(/how close did you feel to partner today\?/i)
      ).toBeInTheDocument();
    });
  });

  test('already logged today shows the done state with an edit escape hatch', async () => {
    logsApi.getPrompt.mockResolvedValue({
      data: {
        prompt: { id: 1, prompt: 'x' },
        hasLoggedToday: true,
        todayLog: { positiveCount: 4, negativeCount: 1, mood: 7, closenessScore: 6 },
      },
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Logged today')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /edit today's log/i }));

    await waitFor(() => {
      expect(screen.getByText('How are you feeling?')).toBeInTheDocument();
    });
  });

  test('interaction counters increment and cannot go below zero', async () => {
    const { container } = renderPage();
    await waitFor(() => {
      expect(screen.getByText('How are you feeling?')).toBeInTheDocument();
    });

    // Mood → Connection → Interactions
    swipeLeft(container.firstChild);
    await waitFor(() => {
      expect(screen.getByText(/how close did you feel/i)).toBeInTheDocument();
    });
    await clickNext();
    await waitFor(() => {
      expect(screen.getByText("Today's moments")).toBeInTheDocument();
    });

    const addPositive = screen.getByRole('button', { name: /add a positive moment/i });
    const removePositive = screen.getByRole('button', { name: /remove one positive moment/i });
    const removeNegative = screen.getByRole('button', { name: /remove one difficult moment/i });

    expect(removePositive).toBeDisabled();
    expect(removeNegative).toBeDisabled();

    fireEvent.click(addPositive);
    fireEvent.click(addPositive);

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
    expect(removePositive).not.toBeDisabled();
  });

  test('completing the deck auto-submits the check-in with gratitude and emotions', async () => {
    const { container } = renderPage();
    await waitFor(() => {
      expect(screen.getByText('How are you feeling?')).toBeInTheDocument();
    });

    // 0 Mood → 1 Connection
    swipeLeft(container.firstChild);
    await waitFor(() => expect(screen.getByText(/how close did you feel/i)).toBeInTheDocument());
    // 1 → 2 Interactions
    await clickNext();
    await waitFor(() => expect(screen.getByText("Today's moments")).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /add a positive moment/i }));
    // 2 → 3 Gratitude
    await clickNext();
    await waitFor(() =>
      expect(screen.getByText(/one thing you appreciate about partner/i)).toBeInTheDocument()
    );
    await userEvent.type(
      screen.getByPlaceholderText(/what did partner do that mattered\?/i),
      'Made me coffee'
    );
    // 3 → 4 Emotions
    await clickNext();
    await waitFor(() => expect(screen.getByText('What did you feel?')).toBeInTheDocument());
    // 4 → 5 Reflection (skip emotions)
    fireEvent.click(screen.getByRole('button', { name: /^skip$/i }));
    await waitFor(() =>
      expect(screen.getByText(/anything to remember about today\?/i)).toBeInTheDocument()
    );
    // 5 → 6 Done — auto-submit fires
    fireEvent.click(screen.getByRole('button', { name: /finish/i }));

    await waitFor(() => {
      expect(logsApi.submitDaily).toHaveBeenCalledTimes(1);
    });
    expect(logsApi.submitDaily).toHaveBeenCalledWith(
      expect.objectContaining({
        positiveCount: 1,
        negativeCount: 0,
        closenessScore: 5,
        mood: 5,
        emotions: [],
      })
    );

    await waitFor(() => {
      expect(screen.getByText('Done')).toBeInTheDocument();
    });
    expect(gratitudeApi.submitEntry).toHaveBeenCalledWith({ text: 'Made me coffee' });
    expect(celebrate).toHaveBeenCalledWith({ big: true });
    expect(screen.getAllByText(/day 1/i).length).toBeGreaterThanOrEqual(1);
  });

  test('crisis detection replaces the celebration with supportive resources', async () => {
    logsApi.submitDaily.mockResolvedValue({
      data: {
        message: 'Daily log saved',
        crisis: {
          detected: true,
          message: "It sounds like you're carrying something heavy right now.",
          resources: [
            {
              name: '988 Suicide & Crisis Lifeline',
              contact: 'Call or text 988',
              available: '24/7',
            },
          ],
        },
      },
    });

    const { container } = renderPage();
    await waitFor(() => {
      expect(screen.getByText('How are you feeling?')).toBeInTheDocument();
    });

    // Fast-forward the deck: swipe through every card to reach Done (index 6),
    // giving the 300ms slide transition time to land between swipes.
    for (let card = 0; card < 6; card += 1) {
      swipeLeft(container.firstChild);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    await waitFor(() => {
      expect(logsApi.submitDaily).toHaveBeenCalled();
    });

    // Crisis dialog appears with tappable resources; no confetti celebration.
    await waitFor(() => {
      expect(screen.getByText("Before you go — we're here")).toBeInTheDocument();
    });
    expect(
      screen.getByText("It sounds like you're carrying something heavy right now.")
    ).toBeInTheDocument();
    expect(screen.getByText('988 Suicide & Crisis Lifeline')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /call 988/i })).toHaveAttribute('href', 'tel:988');
    expect(celebrate).not.toHaveBeenCalled();

    // Dismissing keeps the saved state
    fireEvent.click(screen.getByRole('button', { name: /i'm safe — continue/i }));
    await waitFor(() => {
      expect(screen.queryByText("Before you go — we're here")).not.toBeInTheDocument();
    });
  });

  test('a failed save is retried and the check-in is not lost', async () => {
    // NOTE: the auto-submit effect on the Done card resubmits as soon as a
    // failed attempt resets the double-submit guard, so a transient failure
    // recovers without user action. (Persistent failures retry in a loop —
    // flagged as a source bug; see suite notes.) We assert the recovery
    // behavior: first attempt fails, follow-up succeeds, nothing is lost.
    logsApi.submitDaily
      .mockRejectedValueOnce({ response: { data: { error: 'Server exploded' } } })
      .mockResolvedValue({ data: { message: 'Daily log saved' } });

    const { container } = renderPage();
    await waitFor(() => {
      expect(screen.getByText('How are you feeling?')).toBeInTheDocument();
    });

    for (let card = 0; card < 6; card += 1) {
      swipeLeft(container.firstChild);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    await waitFor(() => {
      expect(screen.getByText('Done')).toBeInTheDocument();
    });
    expect(logsApi.submitDaily.mock.calls.length).toBeGreaterThanOrEqual(2);
    // Every attempt carried the same full payload — the check-in survived the failure.
    expect(logsApi.submitDaily).toHaveBeenLastCalledWith(
      expect.objectContaining({ mood: 5, closenessScore: 5 })
    );
  });
});
