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

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../services/api', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
  matchupApi: { getStatus: jest.fn(), getCurrent: jest.fn(), generate: jest.fn() },
  strategiesApi: { generate: jest.fn() },
}));

import MatchupPage from '../../../pages/Matchup/Matchup';
import { useAuth } from '../../../contexts/AuthContext';
import { matchupApi, strategiesApi } from '../../../services/api';

const mockStatusNotReady = {
  data: {
    canGenerateMatchup: false,
    user1: {
      name: 'Alice',
      completed: ['attachment', 'personality'],
    },
    user2: {
      name: 'Bob',
      completed: ['attachment'],
    },
  },
};

const mockStatusReady = {
  data: {
    canGenerateMatchup: true,
    user1: {
      name: 'Alice',
      completed: ['attachment', 'personality', 'wellness_behavior', 'negative_patterns_closeness'],
    },
    user2: {
      name: 'Bob',
      completed: ['attachment', 'personality', 'wellness_behavior', 'negative_patterns_closeness'],
    },
  },
};

const mockMatchup = {
  data: {
    matchup: {
      score: 78,
      alignments: [
        { area: 'Communication', note: 'Both value open communication' },
        { area: 'Values', note: 'Shared core values on family' },
      ],
      misses: [
        { area: 'Conflict Style', note: 'Different approaches to conflict resolution' },
      ],
    },
  },
};

const mockNoMatchup = {
  data: { matchup: null },
};

const mockGenerateResult = {
  data: {
    matchup: {
      score: 78,
      alignments: [
        { area: 'Communication', note: 'Both value open communication' },
      ],
      misses: [
        { area: 'Conflict Style', note: 'Different approaches to conflict resolution' },
      ],
    },
  },
};

const renderComponent = () => {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <MatchupPage />
      </MemoryRouter>
    </ThemeProvider>
  );
};

describe('Matchup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      relationship: { hasPartner: true },
    });
    matchupApi.getStatus.mockResolvedValue(mockStatusReady);
    matchupApi.getCurrent.mockResolvedValue(mockNoMatchup);
    matchupApi.generate.mockResolvedValue(mockGenerateResult);
    strategiesApi.generate.mockResolvedValue({ data: {} });
  });

  test('shows loading spinner initially', () => {
    matchupApi.getStatus.mockReturnValue(new Promise(() => {}));
    matchupApi.getCurrent.mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('shows "Partner Required" when no partner', async () => {
    useAuth.mockReturnValue({
      relationship: { hasPartner: false },
    });
    matchupApi.getStatus.mockResolvedValue(mockStatusNotReady);
    matchupApi.getCurrent.mockRejectedValue(new Error('Not found'));
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Partner Required')).toBeInTheDocument();
    });
    expect(screen.getByText(/invite your partner/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /invite partner/i })).toBeInTheDocument();
  });

  test('shows assessment progress when not all complete', async () => {
    matchupApi.getStatus.mockResolvedValue(mockStatusNotReady);
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Assessment Progress')).toBeInTheDocument();
    });
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(
      screen.getByText(/both partners need to complete all assessments/i)
    ).toBeInTheDocument();
  });

  test('shows "Generate Matchup Score" button when ready', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Ready to Generate!')).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', { name: /generate matchup score/i })
    ).toBeInTheDocument();
  });

  test('displays matchup score percentage', async () => {
    matchupApi.getCurrent.mockResolvedValue(mockMatchup);
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('78%')).toBeInTheDocument();
    });
    expect(screen.getByText('Compatibility Score')).toBeInTheDocument();
  });

  test('shows alignments section', async () => {
    matchupApi.getCurrent.mockResolvedValue(mockMatchup);
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Alignments')).toBeInTheDocument();
    });
    expect(screen.getByText('Communication')).toBeInTheDocument();
    expect(screen.getByText('Both value open communication')).toBeInTheDocument();
    expect(screen.getByText('Values')).toBeInTheDocument();
    expect(screen.getByText('Shared core values on family')).toBeInTheDocument();
  });

  test('shows areas to work on (misses)', async () => {
    matchupApi.getCurrent.mockResolvedValue(mockMatchup);
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Areas to Work On')).toBeInTheDocument();
    });
    expect(screen.getByText('Conflict Style')).toBeInTheDocument();
    expect(
      screen.getByText('Different approaches to conflict resolution')
    ).toBeInTheDocument();
  });

  test('generate button creates matchup and strategies', async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /generate matchup score/i })
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole('button', { name: /generate matchup score/i })
    );

    await waitFor(() => {
      expect(matchupApi.generate).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(strategiesApi.generate).toHaveBeenCalledTimes(1);
    });
    // After generation, the matchup score should be displayed
    await waitFor(() => {
      expect(screen.getByText('78%')).toBeInTheDocument();
    });
  });
});
