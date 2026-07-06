import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../testHelpers/renderWithProviders';
import { createAuthValue } from '../../../testHelpers/mockAuthContext';

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

import Assessments from '../../../pages/Assessments/Assessments';
import { useAuth } from '../../../contexts/AuthContext';
import { assessmentsApi } from '../../../services/api';

const ALL_TYPES = [
  'attachment',
  'personality',
  'love_language',
  'human_needs',
  'gottman_checkup',
  'emotional_intelligence',
  'conflict_style',
  'differentiation',
  'hormonal_health',
  'physical_vitality',
];

const mockNoResults = {
  data: { completed: [], pending: [...ALL_TYPES], allCompleted: false },
};

const mockPartialResults = {
  data: {
    completed: [
      { type: 'attachment', score: { style: 'secure' } },
      { type: 'personality', score: { type: 'INFJ' } },
    ],
    pending: ALL_TYPES.filter((t) => !['attachment', 'personality'].includes(t)),
    allCompleted: false,
  },
};

const mockAllComplete = {
  data: {
    completed: ALL_TYPES.map((type) => ({ type, score: { score: 80 } })),
    pending: [],
    allCompleted: true,
  },
};

const renderPage = () => renderWithProviders(<Assessments />);

describe('Assessments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue(createAuthValue());
    assessmentsApi.getResults.mockResolvedValue(mockNoResults);
  });

  test('shows page skeleton while loading', () => {
    assessmentsApi.getResults.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  test('renders page title and philosophy banner', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Self-Discovery Assessments')).toBeInTheDocument();
    });
    expect(screen.getByText('These assessments are mirrors, not weapons.')).toBeInTheDocument();
  });

  test('shows overall journey progress out of the full 10-assessment catalog', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Your Journey')).toBeInTheDocument();
    });
    expect(screen.getByText('0/10')).toBeInTheDocument();
    expect(
      screen.getByText(/0 of 10 assessments complete/i)
    ).toBeInTheDocument();
  });

  test('groups assessments under the four category sections', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Know Yourself')).toBeInTheDocument();
    });
    expect(screen.getByText('Own Yourself')).toBeInTheDocument();
    expect(screen.getByText('Grow Yourself')).toBeInTheDocument();
    expect(screen.getByText('Fuel Yourself')).toBeInTheDocument();

    // A few representative assessment cards (Attachment also appears in the
    // Recommended Next hero, so allow multiple matches).
    expect(screen.getAllByText('Attachment Style').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Personality Type')).toBeInTheDocument();
    expect(screen.getByText('Relationship Health Checkup')).toBeInTheDocument();
    expect(screen.getByText('Physical Vitality')).toBeInTheDocument();
  });

  test('progressive unlock: first tier is startable, later tiers are locked', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Attachment Style').length).toBeGreaterThanOrEqual(1);
    });

    // Tier 0 (attachment, love_language, personality) startable + the
    // Recommended Next hero also carries the same CTA.
    const startButtons = screen.getAllByRole('button', {
      name: /see what this says about you/i,
    });
    expect(startButtons.length).toBe(4);

    // The remaining 7 assessments are locked until more are completed.
    const lockedButtons = screen.getAllByRole('button', { name: /^locked$/i });
    expect(lockedButtons).toHaveLength(7);
    lockedButtons.forEach((btn) => expect(btn).toBeDisabled());
    expect(screen.getAllByText(/complete \d+ more/i).length).toBeGreaterThan(0);
  });

  test('recommends the next unlocked, untaken assessment', async () => {
    assessmentsApi.getResults.mockResolvedValue(mockPartialResults);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Recommended Next')).toBeInTheDocument();
    });
    // attachment + personality done → love_language is the next tier-0 pick
    expect(screen.getAllByText('Love Language').length).toBeGreaterThanOrEqual(1);
  });

  test('completed assessments show a Done chip, result summary, and retake CTA', async () => {
    assessmentsApi.getResults.mockResolvedValue(mockPartialResults);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('2/10')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Done')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /run it again/i })).toHaveLength(2);
    // Primary result line for attachment (score.style) and personality (score.type)
    expect(screen.getByText('secure')).toBeInTheDocument();
    expect(screen.getByText('INFJ')).toBeInTheDocument();
  });

  test('all complete: celebration CTA navigates to matchup', async () => {
    assessmentsApi.getResults.mockResolvedValue(mockAllComplete);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('All Assessments Complete!')).toBeInTheDocument();
    });

    const matchupButton = screen.getByRole('button', { name: /view matchup score/i });
    await userEvent.click(matchupButton);
    expect(mockNavigate).toHaveBeenCalledWith('/matchup');
  });
});
