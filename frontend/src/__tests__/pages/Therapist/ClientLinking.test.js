import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../testHelpers/renderWithProviders';

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({ user: { id: 'therapist-1' } })),
}));

jest.mock('../../../services/api', () =>
  require('../../../testHelpers/mockApi').buildApiModuleMock()
);

import TherapistClientLinking from '../../../pages/Therapist/ClientLinking';
import api from '../../../services/api';

describe('TherapistClientLinking (invite flow)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockResolvedValue({ data: { invites: [] } });
  });

  const generateInviteWith = async (email, postResponse) => {
    api.post.mockResolvedValue({ data: postResponse });
    renderWithProviders(<TherapistClientLinking />);

    if (email) {
      fireEvent.change(screen.getByLabelText(/client's email/i), {
        target: { value: email },
      });
    }
    fireEvent.click(screen.getByRole('button', { name: /generate invite link/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalled());
  };

  test('sends clientEmail (with legacy email field kept for one release)', async () => {
    await generateInviteWith('client@example.com', {
      inviteLink: 'http://localhost:3000/therapist-invite/tok1',
      emailSent: true,
    });

    expect(api.post).toHaveBeenCalledWith('/therapist/clients/invite', {
      clientEmail: 'client@example.com',
      email: 'client@example.com',
    });
  });

  test('emailSent: true → honest success message naming the recipient', async () => {
    await generateInviteWith('client@example.com', {
      inviteLink: 'http://localhost:3000/therapist-invite/tok1',
      emailSent: true,
    });

    expect(
      await screen.findByText(
        /invite sent to client@example\.com — they'll get an email with your link/i
      )
    ).toBeInTheDocument();
  });

  test('emailSent: false → warning that the email failed, with the copyable link shown', async () => {
    await generateInviteWith('client@example.com', {
      inviteLink: 'http://localhost:3000/therapist-invite/tok2',
      emailSent: false,
    });

    expect(
      await screen.findByText(/we couldn't email the invite — copy the link below/i)
    ).toBeInTheDocument();
    // The copy-link fallback is right there for the therapist to share manually.
    expect(
      screen.getByDisplayValue('http://localhost:3000/therapist-invite/tok2')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy invite link/i })).toBeInTheDocument();
  });

  test('no email entered → plain link-generated confirmation', async () => {
    await generateInviteWith(null, {
      inviteLink: 'http://localhost:3000/therapist-invite/tok3',
    });

    expect(await screen.findByText(/invite link generated!/i)).toBeInTheDocument();
  });
});
