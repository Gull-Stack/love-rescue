import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import theme from '../../../theme';
import Subscribe from '../../../pages/Subscribe/Subscribe';
import { paymentsApi } from '../../../services/api';

jest.mock('../../../services/api', () => ({
  paymentsApi: {
    getPlans: jest.fn(),
    getSubscription: jest.fn(),
    createCheckout: jest.fn(),
    verifyAppleReceipt: jest.fn(),
  },
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

const renderWithProviders = (ui) =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>{ui}</MemoryRouter>
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

  test('surfaces a cancelled checkout without error styling break', async () => {
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/subscribe?payment=cancelled']}>
          <Subscribe />
        </MemoryRouter>
      </ThemeProvider>
    );

    await waitFor(() => expect(screen.getByText(/cancelled/i)).toBeInTheDocument());
  });
});
