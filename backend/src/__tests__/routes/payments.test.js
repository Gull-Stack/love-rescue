const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock Stripe before requiring the route
const mockStripe = {
  customers: { create: jest.fn(), retrieve: jest.fn() },
  checkout: { sessions: { create: jest.fn() } },
  subscriptions: { list: jest.fn(), update: jest.fn() },
  webhooks: { constructEvent: jest.fn() },
  billingPortal: { sessions: { create: jest.fn() } }
};
jest.mock('stripe', () => jest.fn(() => mockStripe));

const { errorHandler } = require('../../middleware/errorHandler');

const JWT_SECRET = 'test-jwt-secret-key-for-testing';

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

function createApp(mockPrisma) {
  const app = express();
  // The webhook route uses express.raw, but all other routes need JSON parsing.
  // We apply JSON parsing globally, and the webhook route overrides via its own middleware.
  app.use((req, res, next) => {
    // Skip JSON parsing for webhook endpoint - it needs raw body
    if (req.path === '/api/payments/webhook') {
      return next();
    }
    express.json()(req, res, next);
  });
  app.use((req, res, next) => {
    req.prisma = mockPrisma;
    next();
  });
  app.use('/api/payments', require('../../routes/payments'));
  app.use(errorHandler);
  return app;
}

describe('Payments Routes', () => {
  let mockPrisma;
  let app;
  let token;
  const userId = 'user-pay-1';
  const mockUser = {
    id: userId,
    email: 'payer@example.com',
    firstName: 'Pay',
    lastName: 'User',
    subscriptionStatus: 'paid',
    stripeCustomerId: 'cus_existing123',
    createdAt: new Date('2025-01-01')
  };

  beforeEach(() => {
    token = generateToken(userId);
    jest.clearAllMocks();

    mockPrisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(mockUser),
        update: jest.fn().mockResolvedValue(mockUser)
      }
    };

    app = createApp(mockPrisma);
  });

  // -------------------------------------------------------------------------
  // POST /api/payments/create-checkout
  // -------------------------------------------------------------------------
  describe('POST /create-checkout', () => {
    test('creates checkout session for new customer without stripeCustomerId', async () => {
      const newUser = { ...mockUser, stripeCustomerId: null };
      mockPrisma.user.findUnique.mockResolvedValue(newUser);
      mockStripe.customers.create.mockResolvedValue({ id: 'cus_new123' });
      mockPrisma.user.update.mockResolvedValue({ ...newUser, stripeCustomerId: 'cus_new123' });
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_session',
        url: 'https://checkout.stripe.com/session'
      });

      const res = await request(app)
        .post('/api/payments/create-checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.sessionId).toBe('cs_test_session');
      expect(res.body.url).toBe('https://checkout.stripe.com/session');
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: newUser.email,
        metadata: { userId: newUser.id }
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { stripeCustomerId: 'cus_new123' }
      });
    });

    test('uses existing stripeCustomerId without creating new customer', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_test_existing',
        url: 'https://checkout.stripe.com/existing'
      });

      const res = await request(app)
        .post('/api/payments/create-checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(200);
      expect(mockStripe.customers.create).not.toHaveBeenCalled();
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_existing123'
        })
      );
    });

    test('creates premium checkout when tier is premium', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_premium',
        url: 'https://checkout.stripe.com/premium'
      });

      const res = await request(app)
        .post('/api/payments/create-checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({ tier: 'premium' });

      expect(res.status).toBe(200);
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [{
            price: 'price_test_premium',
            quantity: 1
          }],
          metadata: expect.objectContaining({
            tier: 'premium'
          })
        })
      );
    });

    test('returns sessionId and url', async () => {
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'cs_full_response',
        url: 'https://checkout.stripe.com/full'
      });

      const res = await request(app)
        .post('/api/payments/create-checkout')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('sessionId', 'cs_full_response');
      expect(res.body).toHaveProperty('url', 'https://checkout.stripe.com/full');
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/payments/webhook
  // -------------------------------------------------------------------------
  describe('POST /webhook', () => {
    test('handles checkout.session.completed - activates subscription', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'user-webhook-1', tier: 'standard' },
            customer: 'cus_webhook1'
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(event));

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-webhook-1' },
        data: {
          subscriptionStatus: 'paid',
          stripeCustomerId: 'cus_webhook1'
        }
      });
    });

    test('handles checkout.session.completed with premium tier', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'user-premium-1', tier: 'premium' },
            customer: 'cus_premium1'
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(event));

      expect(res.status).toBe(200);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-premium-1' },
        data: {
          subscriptionStatus: 'premium',
          stripeCustomerId: 'cus_premium1'
        }
      });
    });

    test('handles customer.subscription.deleted - sets expired', async () => {
      const event = {
        type: 'customer.subscription.deleted',
        data: {
          object: { customer: 'cus_del_1' }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);
      mockStripe.customers.retrieve.mockResolvedValue({
        id: 'cus_del_1',
        metadata: { userId: 'user-deleted-1' }
      });

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(event));

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-deleted-1' },
        data: { subscriptionStatus: 'expired' }
      });
    });

    test('handles invoice.payment_failed', async () => {
      const event = {
        type: 'invoice.payment_failed',
        data: {
          object: { id: 'inv_fail_1', customer: 'cus_fail_1' }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);
      mockStripe.customers.retrieve.mockResolvedValue({
        id: 'cus_fail_1',
        metadata: { userId: 'user-fail-1' }
      });

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(event));

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
    });

    test('returns 400 for invalid signature', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', 'bad_sig')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ type: 'test' }));

      expect(res.status).toBe(400);
      expect(res.text).toContain('Webhook Error');
    });

    test('handles customer.subscription.updated', async () => {
      const event = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            customer: 'cus_update_1',
            status: 'active',
            items: {
              data: [
                { price: { id: 'price_test_standard' } }
              ]
            }
          }
        }
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(event);
      mockStripe.customers.retrieve.mockResolvedValue({
        id: 'cus_update_1',
        metadata: { userId: 'user-update-1' }
      });

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('stripe-signature', 'valid_sig')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(event));

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-update-1' },
        data: { subscriptionStatus: 'paid' }
      });
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/payments/subscription
  // -------------------------------------------------------------------------
  describe('GET /subscription', () => {
    test('returns trial status with days remaining', async () => {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 5);

      // Override findUnique for the auth middleware check first
      const trialUser = { ...mockUser, subscriptionStatus: 'trial', stripeCustomerId: null };
      // First call: auth middleware, second call: route handler
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(trialUser)
        .mockResolvedValueOnce({
          subscriptionStatus: 'trial',
          trialEndsAt: trialEnd,
          stripeCustomerId: null
        });

      const res = await request(app)
        .get('/api/payments/subscription')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('trial');
      expect(res.body.trialDaysRemaining).toBeGreaterThanOrEqual(4);
      expect(res.body.trialDaysRemaining).toBeLessThanOrEqual(5);
      expect(res.body.subscription).toBeNull();
    });

    test('returns paid status with Stripe subscription details', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({
          subscriptionStatus: 'paid',
          trialEndsAt: null,
          stripeCustomerId: 'cus_existing123'
        });

      mockStripe.subscriptions.list.mockResolvedValue({
        data: [{
          id: 'sub_active_1',
          status: 'active',
          current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
          cancel_at_period_end: false
        }]
      });

      const res = await request(app)
        .get('/api/payments/subscription')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('paid');
      expect(res.body.isPremium).toBe(false);
      expect(res.body.subscription).toBeDefined();
      expect(res.body.subscription.id).toBe('sub_active_1');
      expect(res.body.subscription.status).toBe('active');
      expect(res.body.subscription.cancelAtPeriodEnd).toBe(false);
    });

    test('returns expired status', async () => {
      const expiredUser = { ...mockUser, subscriptionStatus: 'expired' };
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(expiredUser)
        .mockResolvedValueOnce({
          subscriptionStatus: 'expired',
          trialEndsAt: null,
          stripeCustomerId: 'cus_expired'
        });

      const res = await request(app)
        .get('/api/payments/subscription')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('expired');
      expect(res.body.subscription).toBeNull();
      expect(res.body.trialDaysRemaining).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/payments/cancel
  // -------------------------------------------------------------------------
  describe('POST /cancel', () => {
    test('cancels subscription at period end', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, stripeCustomerId: 'cus_existing123' });

      const periodEnd = Math.floor(Date.now() / 1000) + 86400 * 30;
      mockStripe.subscriptions.list.mockResolvedValue({
        data: [{
          id: 'sub_to_cancel',
          status: 'active',
          current_period_end: periodEnd
        }]
      });
      mockStripe.subscriptions.update.mockResolvedValue({
        id: 'sub_to_cancel',
        cancel_at_period_end: true
      });

      const res = await request(app)
        .post('/api/payments/cancel')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('cancelled at the end of the billing period');
      expect(res.body.endsAt).toBeDefined();
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_to_cancel', {
        cancel_at_period_end: true
      });
    });

    test('returns 400 when no stripeCustomerId', async () => {
      const noStripeUser = { ...mockUser, stripeCustomerId: null };
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(noStripeUser)
        .mockResolvedValueOnce({ ...noStripeUser, stripeCustomerId: null });

      const res = await request(app)
        .post('/api/payments/cancel')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No active subscription');
    });

    test('returns 400 when no active subscription found', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser });

      mockStripe.subscriptions.list.mockResolvedValue({ data: [] });

      const res = await request(app)
        .post('/api/payments/cancel')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No active subscription');
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/payments/portal
  // -------------------------------------------------------------------------
  describe('POST /portal', () => {
    test('creates billing portal session', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, stripeCustomerId: 'cus_existing123' });

      mockStripe.billingPortal.sessions.create.mockResolvedValue({
        url: 'https://billing.stripe.com/portal/session'
      });

      const res = await request(app)
        .post('/api/payments/portal')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.url).toBe('https://billing.stripe.com/portal/session');
      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_existing123',
        return_url: 'http://localhost:3000/settings'
      });
    });

    test('returns 400 when no customer record', async () => {
      const noCustomerUser = { ...mockUser, stripeCustomerId: null };
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(noCustomerUser)
        .mockResolvedValueOnce({ ...noCustomerUser, stripeCustomerId: null });

      const res = await request(app)
        .post('/api/payments/portal')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No customer record found');
    });
  });
});
