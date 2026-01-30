import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import theme from '../../../theme';
import DailyVideo from '../../../components/common/DailyVideo';
import { videosApi } from '../../../services/api';

jest.mock('../../../services/api', () => ({
  videosApi: {
    getDaily: jest.fn(),
    markComplete: jest.fn(),
    getStreak: jest.fn(),
  },
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

const mockVideo = {
  id: 'video-1',
  title: 'Building Trust in Relationships',
  description: 'Learn the key elements of trust.',
  youtubeId: 'dQw4w9WgXcQ',
  week: 2,
  day: 4,
};

describe('DailyVideo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows loading skeleton while fetching video', () => {
    videosApi.getDaily.mockImplementation(() => new Promise(() => {}));
    videosApi.getStreak.mockImplementation(() => new Promise(() => {}));

    const { container } = renderWithProviders(<DailyVideo />);

    const skeletons = container.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('displays video content when data is available', async () => {
    videosApi.getDaily.mockResolvedValueOnce({
      data: { video: mockVideo, completed: false, fallbackText: '' },
    });
    videosApi.getStreak.mockResolvedValueOnce({ data: { streak: 5 } });

    renderWithProviders(<DailyVideo />);

    await waitFor(() => {
      expect(screen.getByText('Daily Video')).toBeInTheDocument();
    });

    expect(screen.getByText('Building Trust in Relationships')).toBeInTheDocument();
    expect(screen.getByText('Learn the key elements of trust.')).toBeInTheDocument();
    expect(screen.getByText('Week 2, Day 4')).toBeInTheDocument();
    expect(screen.getByText('5 day streak')).toBeInTheDocument();
    expect(screen.getByLabelText('Mark as watched')).toBeInTheDocument();
  });

  test('marks video as complete on checkbox click', async () => {
    videosApi.getDaily.mockResolvedValueOnce({
      data: { video: mockVideo, completed: false, fallbackText: '' },
    });
    videosApi.getStreak.mockResolvedValueOnce({ data: { streak: 3 } });
    videosApi.markComplete.mockResolvedValueOnce({});

    renderWithProviders(<DailyVideo />);

    await waitFor(() => {
      expect(screen.getByLabelText('Mark as watched')).toBeInTheDocument();
    });

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(videosApi.markComplete).toHaveBeenCalledWith('video-1');
    });
  });
});
