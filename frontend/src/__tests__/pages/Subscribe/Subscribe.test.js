import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import theme from '../../../theme';
import Subscribe from '../../../pages/Subscribe/Subscribe';
import { paymentsApi } from '../../../services/api';
import { clearSubscriptionCache } from '../../../components/common/PremiumGate';

jest.mock('../../../services/api', () => ({
  paymentsApi: {
    getPlans: jest.fn(),
    getSubscription: jest.fn(),
    createCheckout: jest.fn(),
    verifyAppleReceipt: jest.fn(),
  },
}));

// Spy on the gate cache so we can assert checkout success invalidates it.
jest.mock('../../../components/common/PremiumGate', () => ({
  __esModule: true,
  default: () => null,
  clearSubscriptionCache: jest.fn(),
  primeSubscriptionCache: jest.fn(),
}));

// Web funnel: Stripe checkout, no Apple IAP.
jest.mock('../../../utils/platform', () => ({
  useAppleIAP: () => false,
  useStripeCheckout: () => true,
  isWeb: () => true,
  isNative: () => false,
  isIOS: () => false,
}));

jest.mock('../../../services/iapService', () => ({
  __esModule: true,
  default: { purchase: jest.fn(), restorePurchases: jest.fn() },
}));

const renderWithProviders = (ui, initialEntries = ['/subscribe']) =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </ThemeProvider>
  );

const PLANS = {
  data: {
    trialDays: 14,
    plans: [
      { id: 'premium', name: 'Monthly', interval: 'month', amount: 4900, currency: 'usd', priceDisplay: '$49', priceId: 'price_m' },
      { id: 'annual', name: 'Annual', interval: 'year', amount: 49000, currency: 'usd', priceDisplay: '$490', priceId: 'price_a' },
    ],
  },
};

describe('Subscribe (web paywall)', () => {
  let originalLocation;

  beforeAll(() => {
    originalLocation = window.location;
    delete window.location;
    window.location = { href: '', pathname: '/subscribe' };
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    window.location.href = '';
    paymentsApi.getPlans.mockResolvedValue(PLANS);
    paymentsApi.getSubscription.mockResolvedValue({ data: { status: 'none', isPremium: false } });
    paymentsApi.createCheckout.mockResolvedValue({ data: { url: 'https://checkout.stripe.test/session' } });
  });

  test('renders plans with API-provided prices (never hardcoded)', async () => {
    renderWithProviders(<Subscribe />);

    await waitFor(() => expect(screen.getByText('Monthly')).toBeInTheDocument());
    expect(screen.getByText('Annual')).toBeInTheDocument();
    expect(screen.getByText('$49')).toBeInTheDocument();
    expect(screen.getByText('$490')).toBeInTheDocument();
    // Trial offer surfaced from the API's trialDays (appears in the banner and
    // on the plan CTAs).
    expect(screen.getAllByText(/14-day free trial/i).length).toBeGreaterThan(0);
  });

  test('choosing a plan on web starts Stripe checkout and redirects', async () => {
    renderWithProviders(<Subscribe />);

    const buttons = await screen.findAllByRole('button', { name: /Start 14-day free trial/i });
    fireEvent.click(buttons[0]); // premium (first plan)

    await waitFor(() => expect(paymentsApi.createCheckout).toHaveBeenCalledWith('premium'));
    await waitFor(() =>
      expect(window.location.href).toBe('https://checkout.stripe.test/session')
    );
  });

  test('surfaces a cancelled checkout (legacy payment= param) without error styling break', async () => {
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/subscribe?payment=cancelled']}>
          <Subscribe />
        </MemoryRouter>
      </ThemeProvider>
    );

    await waitFor(() =>
      expect(screen.getByText(/checkout was cancelled — no charge was made/i)).toBeInTheDocument()
    );
  });

  test('status=cancelled (backend redirect param) shows the no-charge notice', async () => {
    renderWithProviders(<Subscribe />, ['/subscribe?status=cancelled']);

    await waitFor(() =>
      expect(screen.getByText(/checkout was cancelled — no charge was made/i)).toBeInTheDocument()
    );
    // Cancel is informational, not a failure state — plans remain available.
    expect(await screen.findByText('Monthly')).toBeInTheDocument();
  });

  test('status=success clears the gate cache and confirms once the entitlement is live', async () => {
    paymentsApi.getSubscription.mockResolvedValue({
      data: { status: 'active', isPremium: true },
    });

    renderWithProviders(<Subscribe />, ['/subscribe?status=success']);

    expect(
      await screen.findByText(/your subscription is active — welcome aboard/i)
    ).toBeInTheDocument();
    expect(clearSubscriptionCache).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeInTheDocument();
    // The trial banner must not show alongside the confirmation.
    expect(screen.queryByText(/day free trial/i)).not.toBeInTheDocument();
  });

  test('status=success polls until the webhook lands (activation delay)', async () => {
    jest.useFakeTimers();
    try {
      paymentsApi.getSubscription
        // First two calls (initial page load + poll attempt 1): not yet premium.
        .mockResolvedValueOnce({ data: { status: 'none', isPremium: false } })
        .mockResolvedValueOnce({ data: { status: 'none', isPremium: false } })
        // Webhook landed by the second poll attempt.
        .mockResolvedValue({ data: { status: 'active', isPremium: true } });

      renderWithProviders(<Subscribe />, ['/subscribe?status=success']);

      // Flush the initial load + first poll attempt.
      await act(async () => {});
      expect(screen.getByText(/payment received — activating your subscription/i)).toBeInTheDocument();
      expect(clearSubscriptionCache).toHaveBeenCalled();

      // Advance past the poll interval — second attempt sees the entitlement.
      await act(async () => {
        jest.advanceTimersByTime(2100);
      });
      expect(
        screen.getByText(/your subscription is active — welcome aboard/i)
      ).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  test('status=success falls back to a pending notice when polling never confirms', async () => {
    jest.useFakeTimers();
    try {
      paymentsApi.getSubscription.mockResolvedValue({
        data: { status: 'none', isPremium: false },
      });

      renderWithProviders(<Subscribe />, ['/subscribe?status=success']);

      await act(async () => {});
      // Exhaust all 5 attempts (4 waits between them).
      for (let i = 0; i < 4; i++) {
        // eslint-disable-next-line no-await-in-loop
        await act(async () => {
          jest.advanceTimersByTime(2100);
        });
      }
      expect(
        screen.getByText(/taking a moment to activate/i)
      ).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  test('an expired trial does not render the "days remaining" trial banner', async () => {
    paymentsApi.getSubscription.mockResolvedValue({
      data: { status: 'trial', isPremium: false, isTrial: false, trialDaysRemaining: 0 },
    });

    renderWithProviders(<Subscribe />);

    await waitFor(() => expect(screen.getByText('Monthly')).toBeInTheDocument());
    expect(screen.queryByText(/you’re on a free trial/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/days remaining/i)).not.toBeInTheDocument();
  });

  test('an active trial still shows the remaining days', async () => {
    paymentsApi.getSubscription.mockResolvedValue({
      data: { status: 'trial', isTrial: true, trialDaysRemaining: 5 },
    });

    renderWithProviders(<Subscribe />);

    await waitFor(() =>
      expect(screen.getByText(/you’re on a free trial/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/5 days remaining/i)).toBeInTheDocument();
  });
});
