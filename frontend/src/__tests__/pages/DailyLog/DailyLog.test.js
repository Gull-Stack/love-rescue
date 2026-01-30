import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import theme from '../../../theme';

jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
  logsApi: {
    getPrompt: jest.fn(),
    getDaily: jest.fn(),
    submitDaily: jest.fn(),
  },
}));

jest.mock('../../../components/common/DailyInsight', () => () => <div data-testid="daily-insight" />);
jest.mock('../../../components/common/DailyVideo', () => () => <div data-testid="daily-video" />);

import DailyLog from '../../../pages/DailyLog/DailyLog';
import { logsApi } from '../../../services/api';

const mockPromptResponse = {
  data: {
    prompt: {
      id: 1,
      title: 'Test',
      prompt: 'What happened today?',
      type: 'appreciation',
    },
    hasLoggedToday: false,
    todayLog: null,
  },
};

const mockSubmitResponse = {
  data: {
    message: 'Daily log saved',
    log: {},
  },
};

const renderComponent = () => {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <DailyLog />
      </MemoryRouter>
    </ThemeProvider>
  );
};

describe('DailyLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    logsApi.getPrompt.mockResolvedValue(mockPromptResponse);
    logsApi.getDaily.mockRejectedValue(new Error('No log for today'));
    logsApi.submitDaily.mockResolvedValue(mockSubmitResponse);
  });

  test('shows loading spinner initially', () => {
    logsApi.getPrompt.mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders "Daily Log" title', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Daily Log')).toBeInTheDocument();
    });
  });

  test('shows today\'s prompt', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('What happened today?')).toBeInTheDocument();
    });
    expect(screen.getByText("Today's Prompt")).toBeInTheDocument();
  });

  test('renders positive interaction counter', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Positive Interactions')).toBeInTheDocument();
    });
  });

  test('renders negative interaction counter', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Negative Interactions')).toBeInTheDocument();
    });
  });

  test('increment positive count on + click', async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Positive Interactions')).toBeInTheDocument();
    });

    // The positive count starts at 0, find the positive section's + button
    // Positive section uses color="success" on the AddIcon button
    const addButtons = screen.getAllByTestId('AddIcon');
    // First AddIcon is in the positive section
    const positiveAddButton = addButtons[0].closest('button');
    await user.click(positiveAddButton);

    // After clicking +, the positive count should be 1
    // Look within the Interaction Counter card
    await waitFor(() => {
      const headings = screen.getAllByRole('heading');
      // The positive count is rendered as an h4 Typography
      const countElements = screen.getAllByText('1');
      expect(countElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  test('decrement positive count on - click does not go below 0', async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Positive Interactions')).toBeInTheDocument();
    });

    // The positive - button should be disabled when count is 0
    const removeButtons = screen.getAllByTestId('RemoveIcon');
    const positiveRemoveButton = removeButtons[0].closest('button');
    expect(positiveRemoveButton).toBeDisabled();
  });

  test('shows ratio display', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Your Ratio')).toBeInTheDocument();
    });
    // Initial state: 0 positive, 0 negative => ratio is '0'
    expect(screen.getByText('0:1')).toBeInTheDocument();
  });

  test('saves log on submit', async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Daily Log')).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save log/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(logsApi.submitDaily).toHaveBeenCalledTimes(1);
    });
    expect(logsApi.submitDaily).toHaveBeenCalledWith(
      expect.objectContaining({
        positiveCount: 0,
        negativeCount: 0,
        journalEntry: '',
        closenessScore: 5,
        mood: 5,
      })
    );
  });

  test('shows success message after save', async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Daily Log')).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /save log/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Daily log saved successfully!')).toBeInTheDocument();
    });
    // After saving, the button text should change to "Update Log"
    expect(screen.getByRole('button', { name: /update log/i })).toBeInTheDocument();
  });
});
