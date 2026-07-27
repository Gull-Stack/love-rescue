import React from 'react';
import { screen, waitFor } from '@testing-library/react';
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

jest.mock('../../../utils/celebrate', () => ({
  celebrate: jest.fn(),
}));

import MatchupPage from '../../../pages/Matchup/Matchup';
import { useAuth } from '../../../contexts/AuthContext';
import { matchupApi, strategiesApi } from '../../../services/api';
import { celebrate } from '../../../utils/celebrate';

const mockStatusNotReady = {
  data: {
    canGenerateMatchup: false,
    user1: { name: 'Alice', completed: ['attachment', 'personality'] },
    user2: { name: 'Bob', completed: ['attachment'] },
  },
};

const mockStatusReady = {
  data: {
    canGenerateMatchup: true,
    user1: { name: 'Alice', completed: ['attachment', 'personality', 'love_language', 'gottman_checkup'] },
    user2: { name: 'Bob', completed: ['attachment', 'personality', 'love_language', 'gottman_checkup'] },
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

const mockNoMatchup = { data: { matchup: null } };

const renderPage = () => renderWithProviders(<MatchupPage />);

describe('Matchup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue(createPartnerAuth());
    matchupApi.getStatus.mockResolvedValue(mockStatusReady);
    matchupApi.getCurrent.mockResolvedValue(mockNoMatchup);
    matchupApi.generate.mockResolvedValue(mockMatchup);
    strategiesApi.generate.mockResolvedValue({ data: {} });
  });

  test('shows page skeleton while loading', () => {
    matchupApi.getStatus.mockReturnValue(new Promise(() => {}));
    matchupApi.getCurrent.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  test('without a partner, shows the "Better together" empty state with a direct invite', async () => {
    useAuth.mockReturnValue(createAuthValue()); // hasPartner: false
    matchupApi.getCurrent.mockRejectedValue(new Error('Not found'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Your matchup is waiting')).toBeInTheDocument();
    });
    // The invite now happens in place (share-sheet card) — no detour to
    // the bottom of the Settings page.
    expect(screen.getByRole('button', { name: /invite/i })).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalledWith('/settings');
  });

  test('shows both partners\' assessment progress when not everyone is done', async () => {
    matchupApi.getStatus.mockResolvedValue(mockStatusNotReady);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Where you two stand')).toBeInTheDocument();
    });
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(
      screen.getByText(/both partners need to complete all assessments/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Complete Assessments First')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /go to assessments/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/assessments');
  });

  test('shows "Ready to Generate!" state when both partners are done', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Ready to Generate!')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /see your matchup/i })).toBeInTheDocument();
  });

  test('displays an existing matchup with verdict, alignments, and friction areas', async () => {
    matchupApi.getCurrent.mockResolvedValue(mockMatchup);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Compatibility')).toBeInTheDocument();
    });
    // 78 → "Solid foundation" verdict band
    expect(screen.getByText('Solid foundation')).toBeInTheDocument();

    expect(screen.getByText('Alignments')).toBeInTheDocument();
    expect(screen.getByText('Communication')).toBeInTheDocument();
    expect(screen.getByText('Both value open communication')).toBeInTheDocument();
    expect(screen.getByText('Values')).toBeInTheDocument();

    expect(screen.getByText('Where it gets hard')).toBeInTheDocument();
    expect(screen.getByText('Conflict Style')).toBeInTheDocument();
    expect(screen.getByText('Different approaches to conflict resolution')).toBeInTheDocument();

    // Follow-up actions
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /view strategies/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/strategies');
  });

  test('generating a matchup celebrates, renders the score, and kicks off strategies', async () => {
    renderPage();

    const generateBtn = await screen.findByRole('button', { name: /see your matchup/i });
    await userEvent.click(generateBtn);

    await waitFor(() => {
      expect(matchupApi.generate).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(strategiesApi.generate).toHaveBeenCalledTimes(1);
    });
    expect(celebrate).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText('Solid foundation')).toBeInTheDocument();
    });
  });

  test('shows a friendly error when generation fails', async () => {
    matchupApi.generate.mockRejectedValue({
      response: { data: { error: 'Generation blew up' } },
    });
    renderPage();

    const generateBtn = await screen.findByRole('button', { name: /see your matchup/i });
    await userEvent.click(generateBtn);

    await waitFor(() => {
      expect(screen.getByText('Generation blew up')).toBeInTheDocument();
    });
  });
});
