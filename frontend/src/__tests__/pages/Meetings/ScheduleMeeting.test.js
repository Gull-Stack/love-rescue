import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import theme from '../../../theme';
import ScheduleMeeting from '../../../pages/Meetings/ScheduleMeeting';
import { mediatorsApi, meetingsApi } from '../../../services/api';

jest.mock('../../../services/api', () => ({
  mediatorsApi: {
    getAvailable: jest.fn(),
  },
  meetingsApi: {
    getUpcoming: jest.fn(),
    checkAvailability: jest.fn(),
    schedule: jest.fn(),
    cancel: jest.fn(),
    consent: jest.fn(),
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

const mockMediators = [
  { id: 'med-1', name: 'Sarah Johnson', bio: 'Experienced relationship facilitator', rate: 0 },
  { id: 'med-2', name: 'Mike Chen', bio: 'Certified conflict mediator', rate: 0 },
];

const mockMeetings = [
  {
    id: 'meeting-1',
    mediator: { name: 'Sarah Johnson' },
    scheduledAt: '2026-02-01T10:00:00.000Z',
    duration: 30,
    week: 3,
    partnerConsent: true,
    meetLink: 'https://meet.google.com/abc-defg-hij',
    isCreator: true,
  },
];

describe('ScheduleMeeting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows loading spinner when mediators are being fetched', async () => {
    mediatorsApi.getAvailable.mockImplementation(() => new Promise(() => {}));
    meetingsApi.getUpcoming.mockResolvedValueOnce({ data: { meetings: [] } });

    renderWithProviders(<ScheduleMeeting />);

    // The stepper wizard shows a CircularProgress when mediators array is empty and no error
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  test('renders meeting scheduling page with title and stepper', async () => {
    mediatorsApi.getAvailable.mockResolvedValueOnce({ data: { mediators: mockMediators } });
    meetingsApi.getUpcoming.mockResolvedValueOnce({ data: { meetings: [] } });

    renderWithProviders(<ScheduleMeeting />);

    await waitFor(() => {
      expect(screen.getByText('Mediated Meetings')).toBeInTheDocument();
    });

    // "Choose a Facilitator" appears twice: once as a stepper label and once as a heading
    const facilitatorTexts = screen.getAllByText('Choose a Facilitator');
    expect(facilitatorTexts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Pick a Time')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  test('lists available mediators', async () => {
    mediatorsApi.getAvailable.mockResolvedValueOnce({ data: { mediators: mockMediators } });
    meetingsApi.getUpcoming.mockResolvedValueOnce({ data: { meetings: [] } });

    renderWithProviders(<ScheduleMeeting />);

    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    });

    expect(screen.getByText('Mike Chen')).toBeInTheDocument();
    expect(screen.getByText('Experienced relationship facilitator')).toBeInTheDocument();
    expect(screen.getByText('Certified conflict mediator')).toBeInTheDocument();
  });

  test('shows upcoming meetings when they exist', async () => {
    mediatorsApi.getAvailable.mockResolvedValueOnce({ data: { mediators: mockMediators } });
    meetingsApi.getUpcoming.mockResolvedValueOnce({ data: { meetings: mockMeetings } });

    renderWithProviders(<ScheduleMeeting />);

    await waitFor(() => {
      expect(screen.getByText('Upcoming Meetings')).toBeInTheDocument();
    });

    // "Sarah Johnson" appears in both upcoming meetings and mediator selection grid
    const sarahTexts = screen.getAllByText('Sarah Johnson');
    expect(sarahTexts.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Week 3')).toBeInTheDocument();
    expect(screen.getByText('Partner Confirmed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Join/i })).toBeInTheDocument();
  });
});
