import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../testHelpers/renderWithProviders';
import { createAuthValue } from '../../../testHelpers/mockAuthContext';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ type: 'attachment' }),
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../services/api', () =>
  require('../../../testHelpers/mockApi').buildApiModuleMock()
);

jest.mock('canvas-confetti', () => jest.fn());

jest.mock('../../../utils/haptics', () => ({
  hapticLight: jest.fn(),
  hapticMedium: jest.fn(),
  hapticSuccess: jest.fn(),
}));

import AssessmentQuiz from '../../../pages/Assessments/AssessmentQuiz';
import { useAuth } from '../../../contexts/AuthContext';
import { assessmentsApi } from '../../../services/api';

const mockQuestions = {
  data: {
    type: 'attachment',
    questions: [
      { id: 1, text: 'I worry my partner will stop loving me.', category: 'anxious' },
      { id: 2, text: 'I find it easy to depend on my partner.', category: 'secure' },
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
      interpretation: 'You have a secure attachment style.',
      actionSteps: [],
      strengths: [],
      growthEdges: [],
      completedAt: new Date().toISOString(),
    },
  },
};

const answerCurrentQuestion = async (value = 5) => {
  // Likert buttons are labeled "<n> — <label>", e.g. "5 — Slightly Agree"
  const buttons = screen.getAllByRole('button', { name: new RegExp(`^${value} — `) });
  fireEvent.click(buttons[0]);
};

const renderPage = () => renderWithProviders(<AssessmentQuiz />);

describe('AssessmentQuiz', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue(createAuthValue());
    assessmentsApi.getQuestions.mockResolvedValue(mockQuestions);
    assessmentsApi.submit.mockResolvedValue(mockSubmitResult);
  });

  test('shows page skeleton while questions load', () => {
    assessmentsApi.getQuestions.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  test('shows an error when questions fail to load', async () => {
    assessmentsApi.getQuestions.mockRejectedValueOnce(new Error('network'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/failed to load questions/i)).toBeInTheDocument();
    });
  });

  test('renders the first question with progress and a 7-point Likert scale', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('I worry my partner will stop loving me.')).toBeInTheDocument();
    });
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    // Endpoint anchors + all seven scale buttons
    expect(screen.getByRole('button', { name: '1 — Strongly Disagree' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '4 — Neutral' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7 — Strongly Agree' })).toBeInTheDocument();

    // Back is disabled on the first question
    expect(screen.getByRole('button', { name: /← back/i })).toBeDisabled();
  });

  test('answering auto-advances to the next question', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });

    await answerCurrentQuestion(6);

    await waitFor(() => {
      expect(screen.getByText('I find it easy to depend on my partner.')).toBeInTheDocument();
    });
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
  });

  test('Back returns to the previous question with the answer preserved', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });

    await answerCurrentQuestion(6);
    await waitFor(() => {
      expect(screen.getByText('2 / 2')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /← back/i }));

    await waitFor(() => {
      expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });
    // The previously chosen value renders its selected-label feedback
    expect(screen.getByText('I worry my partner will stop loving me.')).toBeInTheDocument();
  });

  test('number keys answer via keyboard shortcuts', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: '3' });

    await waitFor(() => {
      expect(screen.getByText('2 / 2')).toBeInTheDocument();
    });
  });

  test('Complete is disabled until every question is answered', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });

    await answerCurrentQuestion(6);
    await waitFor(() => {
      expect(screen.getByText('2 / 2')).toBeInTheDocument();
    });

    const completeButton = screen.getByRole('button', { name: /complete/i });
    expect(completeButton).toBeDisabled();

    await answerCurrentQuestion(7);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /complete/i })).not.toBeDisabled();
    });
  });

  test('submitting shows the rich result view', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });

    await answerCurrentQuestion(6);
    await waitFor(() => {
      expect(screen.getByText('2 / 2')).toBeInTheDocument();
    });
    await answerCurrentQuestion(7);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /complete/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /complete/i }));

    await waitFor(() => {
      expect(screen.getByText('Assessment Complete!')).toBeInTheDocument();
    });
    expect(assessmentsApi.submit).toHaveBeenCalledWith(
      'attachment',
      expect.objectContaining({ 1: 6, 2: 7 })
    );
    expect(screen.getByText('Your Result')).toBeInTheDocument();
  });

  test('shows server error when submission fails', async () => {
    assessmentsApi.submit.mockRejectedValue({
      response: { data: { error: 'Submission failed' } },
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });

    await answerCurrentQuestion(6);
    await waitFor(() => {
      expect(screen.getByText('2 / 2')).toBeInTheDocument();
    });
    await answerCurrentQuestion(7);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /complete/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /complete/i }));

    await waitFor(() => {
      expect(screen.getByText('Submission failed')).toBeInTheDocument();
    });
    expect(screen.queryByText('Assessment Complete!')).not.toBeInTheDocument();
  });
});
