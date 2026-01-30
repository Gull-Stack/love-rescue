import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import theme from '../../../theme';
import DailyInsight from '../../../components/common/DailyInsight';
import { insightsApi } from '../../../services/api';

jest.mock('../../../services/api', () => ({
  insightsApi: {
    getDaily: jest.fn(),
  },
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderWithProviders = (ui) => {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </ThemeProvider>
  );
};

describe('DailyInsight', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows loading skeleton while fetching insight', () => {
    insightsApi.getDaily.mockImplementation(() => new Promise(() => {}));

    const { container } = renderWithProviders(<DailyInsight />);

    // MUI Skeleton elements are rendered during loading
    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('displays insight text when data is available', async () => {
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
    expect(screen.getByRole('button', { name: /Reflect on This/i })).toBeInTheDocument();
  });

  test('renders nothing when no insight is available', async () => {
    insightsApi.getDaily.mockRejectedValueOnce(new Error('Not found'));

    const { container } = renderWithProviders(<DailyInsight />);

    await waitFor(() => {
      // After loading completes with no insight, the component returns null
      const skeletons = container.querySelectorAll('.MuiSkeleton-root');
      expect(skeletons.length).toBe(0);
    });

    expect(screen.queryByText('Daily Insight')).not.toBeInTheDocument();
  });
});
