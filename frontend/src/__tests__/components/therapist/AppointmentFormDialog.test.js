import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../theme';
import AppointmentFormDialog from '../../../components/therapist/AppointmentFormDialog';
import therapistService from '../../../services/therapistService';

jest.mock('../../../services/therapistService', () => ({
  __esModule: true,
  default: {
    createAppointment: jest.fn(),
    updateAppointment: jest.fn(),
  },
}));

const CLIENTS = [{ id: 'client-1', name: 'Casey Client' }];

const renderDialog = (props = {}) =>
  render(
    <ThemeProvider theme={theme}>
      <AppointmentFormDialog
        open
        onClose={jest.fn()}
        clients={CLIENTS}
        onSaved={jest.fn()}
        {...props}
      />
    </ThemeProvider>
  );

// A time comfortably in the future so PAST_SCHEDULING-style validation never trips.
const futureISO = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

describe('AppointmentFormDialog (timezone contract)', () => {
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  beforeEach(() => {
    jest.clearAllMocks();
    therapistService.createAppointment.mockResolvedValue({
      data: { appointment: { id: 'appt-1' } },
    });
    therapistService.updateAppointment.mockResolvedValue({
      data: { appointment: { id: 'appt-1' } },
    });
  });

  test('create payload includes the therapist IANA timezone', async () => {
    renderDialog();

    // Pick the client from the MUI select.
    fireEvent.mouseDown(screen.getByLabelText('Client'));
    fireEvent.click(await screen.findByRole('option', { name: 'Casey Client' }));

    fireEvent.click(screen.getByRole('button', { name: 'Schedule' }));

    await waitFor(() => expect(therapistService.createAppointment).toHaveBeenCalled());
    expect(therapistService.createAppointment).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'client-1',
        durationMinutes: 50,
        locationType: 'video',
        scheduledAt: expect.any(String),
        timezone: localTz,
      })
    );
  });

  test('reschedule payload includes the timezone too (emails reformat on reschedule)', async () => {
    const appointment = {
      id: 'appt-7',
      clientId: 'client-1',
      scheduledAt: futureISO(),
      durationMinutes: 60,
      locationType: 'video',
    };
    renderDialog({ appointment });

    fireEvent.click(screen.getByRole('button', { name: 'Reschedule' }));

    await waitFor(() => expect(therapistService.updateAppointment).toHaveBeenCalled());
    expect(therapistService.updateAppointment).toHaveBeenCalledWith(
      'appt-7',
      expect.objectContaining({
        scheduledAt: expect.any(String),
        durationMinutes: 60,
        timezone: localTz,
      })
    );
  });
});
