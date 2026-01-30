import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import theme from '../../../theme';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
  assessmentsApi: { getResults: jest.fn() },
}));

import Assessments from '../../../pages/Assessments/Assessments';
import { assessmentsApi } from '../../../services/api';

const mockNoResults = {
  data: {
    completed: [],
    pending: ['attachment', 'personality', 'wellness_behavior', 'negative_patterns_closeness'],
    allCompleted: false,
  },
};

const mockPartialResults = {
  data: {
    completed: [
      { type: 'attachment', score: { style: 'Secure' } },
      { type: 'personality', score: { type: 'INFJ' } },
    ],
    pending: ['wellness_behavior', 'negative_patterns_closeness'],
    allCompleted: false,
  },
};

const mockAllComplete = {
  data: {
    completed: [
      { type: 'attachment', score: { style: 'Secure' } },
      { type: 'personality', score: { type: 'INFJ' } },
      { type: 'wellness_behavior', score: { score: 82, level: 'Good' } },
      { type: 'negative_patterns_closeness', score: { closeness: 75 } },
    ],
    pending: [],
    allCompleted: true,
  },
};

const renderComponent = () => {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <Assessments />
      </MemoryRouter>
    </ThemeProvider>
  );
};

describe('Assessments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    assessmentsApi.getResults.mockResolvedValue(mockNoResults);
  });

  test('shows loading spinner initially', () => {
    assessmentsApi.getResults.mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders page title "Assessments"', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Assessments')).toBeInTheDocument();
    });
  });

  test('renders all 4 assessment cards', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Attachment Style')).toBeInTheDocument();
    });
    expect(screen.getByText('16 Personalities')).toBeInTheDocument();
    expect(screen.getByText('Wellness Behavior')).toBeInTheDocument();
    expect(screen.getByText('Patterns & Closeness')).toBeInTheDocument();
  });

  test('shows progress bar', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Overall Progress')).toBeInTheDocument();
    });
    expect(screen.getByText('0/4 completed')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('shows "Start" button for incomplete assessments', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Attachment Style')).toBeInTheDocument();
    });
    const startButtons = screen.getAllByRole('button', { name: /start/i });
    expect(startButtons).toHaveLength(4);
  });

  test('shows "Retake" and "Completed" chip for completed assessments', async () => {
    assessmentsApi.getResults.mockResolvedValue(mockPartialResults);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Attachment Style')).toBeInTheDocument();
    });
    const retakeButtons = screen.getAllByRole('button', { name: /retake/i });
    expect(retakeButtons).toHaveLength(2);
    const completedChips = screen.getAllByText('Completed');
    expect(completedChips).toHaveLength(2);
    // Remaining 2 should still have Start
    const startButtons = screen.getAllByRole('button', { name: /start/i });
    expect(startButtons).toHaveLength(2);
  });

  test('shows score result for completed assessments', async () => {
    assessmentsApi.getResults.mockResolvedValue(mockPartialResults);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Attachment Style')).toBeInTheDocument();
    });
    expect(screen.getByText('Style: Secure')).toBeInTheDocument();
    expect(screen.getByText('Type: INFJ')).toBeInTheDocument();
  });

  test('shows "View Matchup Score" button when all complete', async () => {
    assessmentsApi.getResults.mockResolvedValue(mockAllComplete);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('All assessments completed!')).toBeInTheDocument();
    });
    const matchupButton = screen.getByRole('button', { name: /view matchup score/i });
    expect(matchupButton).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(matchupButton);
    expect(mockNavigate).toHaveBeenCalledWith('/matchup');
  });
});
