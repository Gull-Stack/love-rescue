import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DailyInsight from '../../../components/common/DailyInsight';
import { renderWithProviders } from '../../../testHelpers/renderWithProviders';

jest.mock('../../../services/api', () => ({
  insightsApi: {
    getDaily: jest.fn(),
  },
}));
import { insightsApi } from '../../../services/api';

describe('DailyInsight', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows loading skeleton while fetching insight', () => {
    insightsApi.getDaily.mockImplementation(() => new Promise(() => {}));

    const { container } = renderWithProviders(<DailyInsight />);

    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  test('displays insight text, week/day chip, and personalized badge', async () => {
    insightsApi.getDaily.mockResolvedValueOnce({
      data: {
        insight: {
          text: 'Focus on expressing appreciation today.',
          week: 2,
          day: 3,
          isPersonalized: true,
        },
      },
    });

    renderWithProviders(<DailyInsight />);

    await waitFor(() => {
      expect(screen.getByText('Daily Insight')).toBeInTheDocument();
    });
    expect(screen.getByText('Focus on expressing appreciation today.')).toBeInTheDocument();
    expect(screen.getByText('Week 2, Day 3')).toBeInTheDocument();
    expect(screen.getByText('Personalized')).toBeInTheDocument();
  });

  test('long insight text is truncated with a working Read more toggle', async () => {
    const longText = 'A'.repeat(80) + ' middle marker ' + 'B'.repeat(80) + ' THE END';
    insightsApi.getDaily.mockResolvedValueOnce({
      data: { insight: { text: longText, week: 1, day: 1, isPersonalized: false } },
    });

    renderWithProviders(<DailyInsight />);

    const readMore = await screen.findByRole('button', { name: /read more/i });
    expect(screen.queryByText(/THE END/)).not.toBeInTheDocument();

    await userEvent.click(readMore);

    expect(screen.getByText(new RegExp('THE END'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show less/i })).toBeInTheDocument();
  });

  test('renders nothing when the insight fetch fails', async () => {
    insightsApi.getDaily.mockRejectedValueOnce(new Error('Not found'));

    const { container } = renderWithProviders(<DailyInsight />);

    await waitFor(() => {
      expect(container.querySelectorAll('.MuiSkeleton-root').length).toBe(0);
    });
    expect(screen.queryByText('Daily Insight')).not.toBeInTheDocument();
  });
});
