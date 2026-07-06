import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../testHelpers/renderWithProviders';

jest.mock('../../../services/api', () =>
  require('../../../testHelpers/mockApi').buildApiModuleMock()
);

import MyTherapistSection from '../../../pages/Settings/MyTherapistSection';
import api from '../../../services/api';

const therapist = {
  id: 'link-1',
  therapistName: 'Dr. Rivera',
  practiceName: 'Riverside Counseling',
  permissionLevel: 'STANDARD',
  connectedAt: '2026-05-01T00:00:00.000Z',
};

const renderSection = () => renderWithProviders(<MyTherapistSection />);

describe('MyTherapistSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockResolvedValue({ data: { therapists: [] } });
  });

  test('shows a skeleton while loading', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    const { container } = renderSection();
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0);
  });

  test('shows the empty state when no therapists are linked', async () => {
    renderSection();

    await waitFor(() => {
      expect(screen.getByText('My Therapist')).toBeInTheDocument();
    });
    expect(screen.getByText(/no therapists linked/i)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/client/therapists');
  });

  test('shows a retry banner when the therapist list fails to load', async () => {
    api.get.mockRejectedValueOnce({ response: { status: 500 } });
    renderSection();

    await waitFor(() => {
      expect(screen.getByText(/could not load your therapist connections/i)).toBeInTheDocument();
    });

    api.get.mockResolvedValueOnce({ data: { therapists: [therapist] } });
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText('Dr. Rivera')).toBeInTheDocument();
    });
  });

  test('lists a connected therapist with their permission level', async () => {
    api.get.mockResolvedValue({ data: { therapists: [therapist] } });
    renderSection();

    await waitFor(() => {
      expect(screen.getByText('Dr. Rivera')).toBeInTheDocument();
    });
    expect(screen.getByText('Riverside Counseling')).toBeInTheDocument();
    // API returns 'STANDARD'; UI normalizes casing for the chip
    expect(screen.getByText('Standard Access')).toBeInTheDocument();
  });

  test('revoke flow: confirmation dialog, DELETE call, success message, refetch', async () => {
    api.get.mockResolvedValue({ data: { therapists: [therapist] } });
    api.delete.mockResolvedValue({ data: {} });
    renderSection();

    await waitFor(() => {
      expect(screen.getByText('Dr. Rivera')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /revoke access/i }));

    // Confirmation dialog explains the consequence before anything happens
    await waitFor(() => {
      expect(screen.getByText('Revoke Therapist Access?')).toBeInTheDocument();
    });
    expect(
      screen.getByText(/will immediately lose access to all your shared data/i)
    ).toBeInTheDocument();
    expect(api.delete).not.toHaveBeenCalled();

    // Dialog has its own "Revoke Access" confirm button
    const dialogButtons = screen.getAllByRole('button', { name: /revoke access/i });
    fireEvent.click(dialogButtons[dialogButtons.length - 1]);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/client/therapists/link-1');
    });
    await waitFor(() => {
      expect(screen.getByText('Therapist access revoked')).toBeInTheDocument();
    });
    // List refetched after revoke
    expect(api.get.mock.calls.filter(([url]) => url === '/client/therapists').length).toBe(2);
  });

  test('"Keep Access" cancels the revoke without calling the API', async () => {
    api.get.mockResolvedValue({ data: { therapists: [therapist] } });
    renderSection();

    await waitFor(() => {
      expect(screen.getByText('Dr. Rivera')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /revoke access/i }));
    await waitFor(() => {
      expect(screen.getByText('Revoke Therapist Access?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /keep access/i }));

    await waitFor(() => {
      expect(screen.queryByText('Revoke Therapist Access?')).not.toBeInTheDocument();
    });
    expect(api.delete).not.toHaveBeenCalled();
  });

  test('permission change dialog patches the new level', async () => {
    api.get.mockResolvedValue({ data: { therapists: [therapist] } });
    api.patch.mockResolvedValue({ data: {} });
    renderSection();

    await waitFor(() => {
      expect(screen.getByText('Dr. Rivera')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /change permissions/i }));

    await waitFor(() => {
      expect(screen.getByText('Change Sharing Permissions')).toBeInTheDocument();
    });

    // Current level (standard, from the API's 'STANDARD') is preselected
    const radios = screen.getAllByRole('radio');
    const standardRadio = radios.find((r) => r.value === 'standard');
    expect(standardRadio).toBeChecked();

    const fullRadio = radios.find((r) => r.value === 'full');
    fireEvent.click(fullRadio);
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/client/therapists/link-1/permission', {
        permissionLevel: 'full',
      });
    });
    await waitFor(() => {
      expect(screen.getByText('Permission level updated')).toBeInTheDocument();
    });
  });

  test('sharing history toggle fetches and renders the audit table', async () => {
    api.get
      .mockResolvedValueOnce({ data: { therapists: [therapist] } }) // initial list
      .mockResolvedValueOnce({
        data: {
          entries: [
            {
              id: 'h1',
              timestamp: '2026-06-01T12:00:00.000Z',
              therapistName: 'Dr. Rivera',
              dataType: 'Assessment scores',
            },
          ],
          total: 1,
        },
      });
    renderSection();

    await waitFor(() => {
      expect(screen.getByText('Dr. Rivera')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /data sharing history/i }));

    await waitFor(() => {
      expect(screen.getByText('Assessment scores')).toBeInTheDocument();
    });
    expect(api.get).toHaveBeenCalledWith('/client/therapist-sharing-history', {
      params: { page: 1, limit: 10 },
    });
  });
});
