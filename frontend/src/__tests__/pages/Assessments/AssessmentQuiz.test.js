import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import theme from '../../../theme';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ type: 'attachment' }),
}));

jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
  assessmentsApi: {
    getQuestions: jest.fn(),
    submit: jest.fn(),
  },
}));

import AssessmentQuiz from '../../../pages/Assessments/AssessmentQuiz';
import { assessmentsApi } from '../../../services/api';

const mockQuestions = {
  data: {
    type: 'attachment',
    questions: [
      { id: 1, text: 'Question 1', category: 'anxious' },
      { id: 2, text: 'Question 2', category: 'secure' },
    ],
  },
};

const mockSubmitResult = {
  data: {
    message: 'Assessment completed',
    assessment: {
      id: 'a-1',
      type: 'attachment',
      score: { style: 'secure' },
      completedAt: new Date().toISOString(),
    },
  },
};

const renderComponent = () => {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <AssessmentQuiz />
      </MemoryRouter>
    </ThemeProvider>
  );
};

describe('AssessmentQuiz', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    assessmentsApi.getQuestions.mockResolvedValue(mockQuestions);
    assessmentsApi.submit.mockResolvedValue(mockSubmitResult);
  });

  test('shows loading spinner initially', () => {
    // Make the API call hang so the spinner stays visible
    assessmentsApi.getQuestions.mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders assessment title after loading', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Attachment Style Assessment')).toBeInTheDocument();
    });
  });

  test('displays first question', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeInTheDocument();
    });
    expect(screen.getByText('Question 1 of 2')).toBeInTheDocument();
  });

  test('shows radio options from Strongly Disagree through Strongly Agree', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Strongly Disagree')).toBeInTheDocument();
    expect(screen.getByLabelText('Disagree')).toBeInTheDocument();
    expect(screen.getByLabelText('Neutral')).toBeInTheDocument();
    expect(screen.getByLabelText('Agree')).toBeInTheDocument();
    expect(screen.getByLabelText('Strongly Agree')).toBeInTheDocument();
  });

  test('Next button advances to next question', async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeInTheDocument();
    });

    // Select an answer to enable the Next button
    await user.click(screen.getByLabelText('Agree'));
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText('Question 2')).toBeInTheDocument();
    });
    expect(screen.getByText('Question 2 of 2')).toBeInTheDocument();
  });

  test('Back button goes to previous question', async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeInTheDocument();
    });

    // Answer and move to question 2
    await user.click(screen.getByLabelText('Agree'));
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText('Question 2')).toBeInTheDocument();
    });

    // Go back - use exact name to avoid matching "Back to Assessments"
    const backButtons = screen.getAllByRole('button', { name: /back/i });
    const navBackButton = backButtons.find((btn) => btn.textContent.trim() === 'Back');
    await user.click(navBackButton);
    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeInTheDocument();
    });
  });

  test('Back button is disabled on first question', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeInTheDocument();
    });

    const backButtons = screen.getAllByRole('button', { name: /back/i });
    // The navigation Back button (with disabled prop) is the one at the bottom
    const navBackButton = backButtons.find(
      (btn) => btn.hasAttribute('disabled') || btn.closest('[disabled]')
    );
    // At minimum, the bottom navigation Back should be disabled
    expect(
      backButtons.some((btn) => btn.disabled)
    ).toBe(true);
  });

  test('Submit button appears on last question', async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeInTheDocument();
    });

    // Answer first question and advance
    await user.click(screen.getByLabelText('Agree'));
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText('Question 2')).toBeInTheDocument();
    });

    // On the last question, Submit should appear instead of Next
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
  });

  test('shows result after successful submit', async () => {
    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeInTheDocument();
    });

    // Answer question 1
    await user.click(screen.getByLabelText('Agree'));
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText('Question 2')).toBeInTheDocument();
    });

    // Answer question 2 and submit
    await user.click(screen.getByLabelText('Strongly Agree'));
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText('Assessment Complete!')).toBeInTheDocument();
    });
    expect(screen.getByText('secure Attachment')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to assessments/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view matchup/i })).toBeInTheDocument();
  });

  test('shows error on failed submit', async () => {
    assessmentsApi.submit.mockRejectedValue({
      response: { data: { error: 'Submission failed' } },
    });

    const user = userEvent.setup();
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeInTheDocument();
    });

    // Answer question 1
    await user.click(screen.getByLabelText('Agree'));
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText('Question 2')).toBeInTheDocument();
    });

    // Answer question 2 and submit
    await user.click(screen.getByLabelText('Strongly Agree'));
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText('Submission failed')).toBeInTheDocument();
    });
  });
});
