import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import theme from '../../../theme';
import Reports from '../../../pages/Reports/Reports';
import { reportsApi, logsApi } from '../../../services/api';

jest.mock('../../../services/api', () => ({
  reportsApi: {
    getWeekly: jest.fn(),
    getMonthly: jest.fn(),
    getProgress: jest.fn(),
  },
  logsApi: {
    getStats: jest.fn(),
  },
}));

// Mock chart.js and react-chartjs-2 to avoid canvas rendering issues in tests
jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="line-chart">Line Chart</div>,
  Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
}));

jest.mock('chart.js', () => ({
  Chart: { register: jest.fn() },
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  PointElement: jest.fn(),
  LineElement: jest.fn(),
  BarElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
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

const mockReport = {
  weekStart: '2026-01-20',
  weekEnd: '2026-01-26',
  highlights: ['Great communication on Monday', 'Positive date night on Friday'],
  improvements: ['Reduce screen time during meals', 'More active listening needed'],
  recommendations: [
    { priority: 'high', text: 'Schedule weekly check-ins' },
    { priority: 'medium', text: 'Try a new shared hobby' },
  ],
  dailyBreakdown: [
    { date: '2026-01-20', positiveCount: 5, negativeCount: 1 },
    { date: '2026-01-21', positiveCount: 3, negativeCount: 2 },
  ],
};

const mockStats = {
  stats: {
    avgRatio: 3.5,
    totalPositives: 28,
    totalNegatives: 8,
    trend: 'improving',
  },
  chartData: [
    { date: '2026-01-20', ratio: 3.0 },
    { date: '2026-01-21', ratio: 4.0 },
  ],
};

describe('Reports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows loading spinner while fetching data', () => {
    reportsApi.getWeekly.mockImplementation(() => new Promise(() => {}));
    logsApi.getStats.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<Reports />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders reports page title and period toggles', async () => {
    reportsApi.getWeekly.mockResolvedValueOnce({ data: { report: mockReport } });
    logsApi.getStats.mockResolvedValueOnce({ data: mockStats });

    renderWithProviders(<Reports />);

    await waitFor(() => {
      expect(screen.getByText('Reports')).toBeInTheDocument();
    });

    expect(screen.getByText('7 Days')).toBeInTheDocument();
    expect(screen.getByText('30 Days')).toBeInTheDocument();
    expect(screen.getByText('90 Days')).toBeInTheDocument();
  });

  test('displays statistics including positives, negatives, and ratio', async () => {
    reportsApi.getWeekly.mockResolvedValueOnce({ data: { report: mockReport } });
    logsApi.getStats.mockResolvedValueOnce({ data: mockStats });

    renderWithProviders(<Reports />);

    await waitFor(() => {
      expect(screen.getByText('3.5:1')).toBeInTheDocument();
    });

    expect(screen.getByText('28')).toBeInTheDocument();
    expect(screen.getByText('Positives')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Negatives')).toBeInTheDocument();
    expect(screen.getByText('Avg Ratio')).toBeInTheDocument();
  });

  test('shows highlights section with items', async () => {
    reportsApi.getWeekly.mockResolvedValueOnce({ data: { report: mockReport } });
    logsApi.getStats.mockResolvedValueOnce({ data: mockStats });

    renderWithProviders(<Reports />);

    await waitFor(() => {
      expect(screen.getByText('Highlights')).toBeInTheDocument();
    });

    expect(screen.getByText('Great communication on Monday')).toBeInTheDocument();
    expect(screen.getByText('Positive date night on Friday')).toBeInTheDocument();
  });

  test('shows areas to improve section with items', async () => {
    reportsApi.getWeekly.mockResolvedValueOnce({ data: { report: mockReport } });
    logsApi.getStats.mockResolvedValueOnce({ data: mockStats });

    renderWithProviders(<Reports />);

    await waitFor(() => {
      expect(screen.getByText('Areas to Improve')).toBeInTheDocument();
    });

    expect(screen.getByText('Reduce screen time during meals')).toBeInTheDocument();
    expect(screen.getByText('More active listening needed')).toBeInTheDocument();
  });

  test('shows trend indicator', async () => {
    reportsApi.getWeekly.mockResolvedValueOnce({ data: { report: mockReport } });
    logsApi.getStats.mockResolvedValueOnce({ data: mockStats });

    renderWithProviders(<Reports />);

    await waitFor(() => {
      expect(screen.getByText('improving')).toBeInTheDocument();
    });

    expect(screen.getByText('Trend')).toBeInTheDocument();
  });
});
