import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../testHelpers/renderWithProviders';
import { createAuthValue, createPartnerAuth } from '../../../testHelpers/mockAuthContext';

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../../services/api', () =>
  require('../../../testHelpers/mockApi').buildApiModuleMock()
);

// Owned by other flows/agents — keep Settings' test isolated from their internals.
// mockAppleIAP is mutable so individual tests can exercise the Apple IAP path.
var mockAppleIAP = false;
jest.mock('../../../utils/platform', () => ({
  isNative: () => false,
  isIOS: () => false,
  isAndroid: () => false,
  isWeb: () => true,
  getPlatform: () => 'web',
  useAppleIAP: () => mockAppleIAP,
  useStripeCheckout: () => true,
}));
jest.mock('../../../services/iapService', () => ({
  __esModule: true,
  default: { restorePurchases: jest.fn() },
}));

// Spy on the PremiumGate cache so entitlement-changing flows can be asserted.
jest.mock('../../../components/common/PremiumGate', () => ({
  __esModule: true,
  default: () => null,
  clearSubscriptionCache: jest.fn(),
  primeSubscriptionCache: jest.fn(),
}));

// Child sections with their own data fetching are covered by their own suites.
jest.mock('../../../pages/Settings/MyTherapistSection', () => () => (
  <div data-testid="my-therapist-section" />
));
jest.mock('../../../components/NotificationSettings', () => () => (
  <div data-testid="notification-settings" />
));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

import Settings from '../../../pages/Settings/Settings';
import { useAuth } from '../../../contexts/AuthContext';
import api, { calendarApi, therapistApi, progressRingsApi, paymentsApi } from '../../../services/api';
import { clearSubscriptionCache } from '../../../components/common/PremiumGate';
import iapService from '../../../services/iapService';

const renderPage = (initialEntries = ['/settings']) =>
  renderWithProviders(<Settings />, { initialEntries });

describe('Settings', () => {
  let auth;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAppleIAP = false;
    auth = createAuthValue({
      user: {
        id: 'user-1',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    });
    useAuth.mockReturnValue(auth);
    calendarApi.getStatus.mockResolvedValue({ data: { connected: false } });
    therapistApi.getConsent.mockResolvedValue({ data: { consent: false } });
    progressRingsApi.get.mockResolvedValue({ data: null });
    paymentsApi.getSubscription.mockResolvedValue({ data: null });
  });

  test('renders the page immediately with account info while data loads in background', () => {
    calendarApi.getStatus.mockImplementation(() => new Promise(() => {}));
    paymentsApi.getSubscription.mockImplementation(() => new Promise(() => {}));

    renderPage();

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  test('includes the notification and therapist sections', async () => {
    renderPage();

    expect(screen.getByTestId('notification-settings')).toBeInTheDocument();
    expect(screen.getByTestId('my-therapist-section')).toBeInTheDocument();
  });

  test('shows the subscription section with a status chip', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Subscription')).toBeInTheDocument();
    });
    // No subscription snapshot and no user status → FREE chip
    expect(screen.getByText('FREE')).toBeInTheDocument();
  });

  test('invite partner flow generates and displays a link', async () => {
    auth.invitePartner.mockResolvedValueOnce({
      inviteLink: 'http://localhost:3000/join/ABC123',
      inviteCode: 'ABC123',
    });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/invite your partner to unlock full features/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /generate invite link/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('http://localhost:3000/join/ABC123')).toBeInTheDocument();
    });
    expect(auth.invitePartner).toHaveBeenCalled();
    expect(screen.getByText(/invite link generated/i)).toBeInTheDocument();
  });

  test('connected partner shows the connected chip instead of the invite form', async () => {
    useAuth.mockReturnValue(createPartnerAuth());
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Partner Connected')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /generate invite link/i })).not.toBeInTheDocument();
  });

  test('Google Calendar section offers connect when disconnected', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Google Calendar')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /connect calendar/i })).toBeInTheDocument();
  });

  test('Google Calendar section offers disconnect when connected', async () => {
    calendarApi.getStatus.mockResolvedValue({ data: { connected: true } });
    calendarApi.disconnect.mockResolvedValue({ data: {} });
    renderPage();

    const disconnectBtn = await screen.findByRole('button', { name: /disconnect/i });
    fireEvent.click(disconnectBtn);

    await waitFor(() => {
      expect(calendarApi.disconnect).toHaveBeenCalled();
    });
    expect(await screen.findByText('Calendar disconnected')).toBeInTheDocument();
  });

  test('change-password dialog validates mismatched passwords locally', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /change password/i }));

    await userEvent.type(screen.getByLabelText(/current password/i), 'oldpass123');
    await userEvent.type(screen.getByLabelText(/^new password/i), 'newpass456');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'different99');

    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText('New passwords do not match')).toBeInTheDocument();
    });
    expect(auth.changePassword).not.toHaveBeenCalled();
  });

  test('change-password dialog submits and confirms other devices were signed out', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /change password/i }));

    await userEvent.type(screen.getByLabelText(/current password/i), 'oldpass123');
    await userEvent.type(screen.getByLabelText(/^new password/i), 'newpass456');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'newpass456');

    fireEvent.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(auth.changePassword).toHaveBeenCalledWith('oldpass123', 'newpass456');
    });
    expect(
      await screen.findByText(/you have been signed out on your other devices/i)
    ).toBeInTheDocument();
  });

  test('delete account requires typing DELETE before the destructive action arms', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /delete my account/i }));

    const confirmButton = await screen.findByRole('button', { name: /permanently delete/i });
    expect(confirmButton).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/type "delete" to confirm/i), 'DELETE');
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/auth/delete-account', {
        data: { confirmDelete: true },
      });
    });
    expect(auth.logout).toHaveBeenCalled();
  });

  test('payment=success query param confirms the subscription, clears the gate cache, and refreshes user', async () => {
    renderPage(['/settings?payment=success']);

    await waitFor(() => {
      expect(screen.getByText(/subscription active — thank you/i)).toBeInTheDocument();
    });
    expect(auth.refreshUser).toHaveBeenCalled();
    // The PremiumGate module cache must be invalidated so gates re-check.
    expect(clearSubscriptionCache).toHaveBeenCalled();
  });

  test('restore purchases clears the stale gate cache after the receipt verifies', async () => {
    mockAppleIAP = true;
    iapService.restorePurchases.mockResolvedValue('apple-receipt');
    paymentsApi.verifyAppleReceipt.mockResolvedValue({ data: { ok: true } });
    paymentsApi.getSubscription.mockResolvedValue({
      data: { status: 'active', isPremium: true },
    });

    renderPage();

    const restoreBtn = await screen.findByRole('button', { name: /restore purchases/i });
    fireEvent.click(restoreBtn);

    await waitFor(() => {
      expect(screen.getByText('Purchases restored.')).toBeInTheDocument();
    });
    expect(paymentsApi.verifyAppleReceipt).toHaveBeenCalledWith('apple-receipt');
    expect(clearSubscriptionCache).toHaveBeenCalled();
  });

  test('an expired trial (status trial, 0 days left) does not show the trial "days left" line', async () => {
    paymentsApi.getSubscription.mockResolvedValue({
      data: { status: 'trial', isPremium: false, isTrial: false, trialDaysRemaining: 0 },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('TRIAL')).toBeInTheDocument();
    });
    expect(screen.queryByText(/free trial —/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/days left/i)).not.toBeInTheDocument();
    // A lapsed trial is unentitled — the upsell CTA must be offered.
    expect(screen.getByRole('button', { name: /see plans/i })).toBeInTheDocument();
  });

  test('an active trial shows the remaining days', async () => {
    paymentsApi.getSubscription.mockResolvedValue({
      data: { status: 'trial', isTrial: true, trialDaysRemaining: 7 },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/free trial —/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/7 days left/i)).toBeInTheDocument();
  });
});
