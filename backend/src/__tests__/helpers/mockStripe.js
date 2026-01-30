/**
 * Mock Stripe module for testing.
 * Provides jest.fn() mocks for all Stripe API methods used in the application.
 */

const mockCustomersCreate = jest.fn().mockResolvedValue({
  id: 'cus_test_123',
  email: 'test@example.com',
  metadata: {}
});

const mockCustomersRetrieve = jest.fn().mockResolvedValue({
  id: 'cus_test_123',
  email: 'test@example.com',
  metadata: { userId: 'test-user-id' }
});

const mockCheckoutSessionsCreate = jest.fn().mockResolvedValue({
  id: 'cs_test_123',
  url: 'https://checkout.stripe.com/test'
});

const mockSubscriptionsList = jest.fn().mockResolvedValue({
  data: [],
  has_more: false
});

const mockSubscriptionsUpdate = jest.fn().mockResolvedValue({
  id: 'sub_test_123',
  status: 'active',
  cancel_at_period_end: true
});

const mockWebhooksConstructEvent = jest.fn().mockReturnValue({
  type: 'checkout.session.completed',
  data: { object: {} }
});

const mockBillingPortalSessionsCreate = jest.fn().mockResolvedValue({
  id: 'bps_test_123',
  url: 'https://billing.stripe.com/test'
});

/**
 * Mock Stripe instance with all API methods used in the application.
 */
const mockStripeInstance = {
  customers: {
    create: mockCustomersCreate,
    retrieve: mockCustomersRetrieve
  },
  checkout: {
    sessions: {
      create: mockCheckoutSessionsCreate
    }
  },
  subscriptions: {
    list: mockSubscriptionsList,
    update: mockSubscriptionsUpdate
  },
  webhooks: {
    constructEvent: mockWebhooksConstructEvent
  },
  billingPortal: {
    sessions: {
      create: mockBillingPortalSessionsCreate
    }
  }
};

/**
 * Mock Stripe constructor.
 * When called with `new Stripe(key)` or `Stripe(key)`, returns the mock instance.
 */
const MockStripe = jest.fn(() => mockStripeInstance);

module.exports = {
  MockStripe,
  mockStripeInstance,
  mockCustomersCreate,
  mockCustomersRetrieve,
  mockCheckoutSessionsCreate,
  mockSubscriptionsList,
  mockSubscriptionsUpdate,
  mockWebhooksConstructEvent,
  mockBillingPortalSessionsCreate
};
