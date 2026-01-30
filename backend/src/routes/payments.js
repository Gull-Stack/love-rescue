const express = require('express');
const Stripe = require('stripe');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * POST /api/payments/create-checkout
 * Create Stripe checkout session
 */
router.post('/create-checkout', authenticate, async (req, res, next) => {
  try {
    // Get or create Stripe customer
    let customerId = req.user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        metadata: {
          userId: req.user.id
        }
      });
      customerId = customer.id;

      await req.prisma.user.update({
        where: { id: req.user.id },
        data: { stripeCustomerId: customerId }
      });
    }

    // Determine tier and price
    const { tier } = req.body || {};
    let priceId;
    let tierLabel;
    if (tier === 'annual') {
      priceId = process.env.STRIPE_ANNUAL_PRICE_ID;
      tierLabel = 'annual';
    } else if (tier === 'premium') {
      priceId = process.env.STRIPE_PREMIUM_PRICE_ID;
      tierLabel = 'premium';
    } else {
      priceId = process.env.STRIPE_PRICE_ID;
      tierLabel = 'standard';
    }

    // Create checkout session
    const sessionParams = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/settings?payment=success`,
      cancel_url: `${process.env.FRONTEND_URL}/settings?payment=cancelled`,
      metadata: {
        userId: req.user.id,
        tier: tierLabel
      }
    };

    // Annual tier has a 12-month minimum commitment
    if (tier === 'annual') {
      sessionParams.subscription_data = {
        metadata: { tier: 'annual', commitment: '12_months' }
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    logger.info('Checkout session created', { userId: req.user.id });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/webhook
 * Handle Stripe webhook events
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    logger.error('Webhook signature verification failed', { error: err.message });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const tier = session.metadata?.tier;

        if (userId) {
          let status = 'paid';
          if (tier === 'annual') status = 'premium';
          else if (tier === 'premium') status = 'premium';

          await req.prisma.user.update({
            where: { id: userId },
            data: {
              subscriptionStatus: status,
              stripeCustomerId: session.customer
            }
          });

          logger.info('Subscription activated', { userId, tier });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customer = await stripe.customers.retrieve(subscription.customer);
        const userId = customer.metadata?.userId;

        if (userId) {
          let status = 'expired';
          if (subscription.status === 'active') {
            const premiumPriceId = process.env.STRIPE_PREMIUM_PRICE_ID;
            const annualPriceId = process.env.STRIPE_ANNUAL_PRICE_ID;
            const hasPremiumOrAnnual = subscription.items?.data?.some(
              (item) => item.price?.id === premiumPriceId || item.price?.id === annualPriceId
            );
            status = hasPremiumOrAnnual ? 'premium' : 'paid';
          }
          await req.prisma.user.update({
            where: { id: userId },
            data: { subscriptionStatus: status }
          });

          logger.info('Subscription updated', { userId, status });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customer = await stripe.customers.retrieve(subscription.customer);
        const userId = customer.metadata?.userId;

        if (userId) {
          await req.prisma.user.update({
            where: { id: userId },
            data: { subscriptionStatus: 'expired' }
          });

          logger.info('Subscription cancelled', { userId });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customer = await stripe.customers.retrieve(invoice.customer);
        const userId = customer.metadata?.userId;

        if (userId) {
          logger.warn('Payment failed', { userId, invoiceId: invoice.id });
          // Could send email notification here
        }
        break;
      }

      default:
        logger.info('Unhandled webhook event', { type: event.type });
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook handler error', { error: error.message });
    next(error);
  }
});

/**
 * GET /api/payments/subscription
 * Get current subscription status
 */
router.get('/subscription', authenticate, async (req, res, next) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        subscriptionStatus: true,
        trialEndsAt: true,
        stripeCustomerId: true
      }
    });

    let subscription = null;
    const isPaidOrPremium = user.subscriptionStatus === 'paid' || user.subscriptionStatus === 'premium';
    if (user.stripeCustomerId && isPaidOrPremium) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: 'active',
          limit: 1
        });

        if (subscriptions.data.length > 0) {
          const sub = subscriptions.data[0];
          subscription = {
            id: sub.id,
            status: sub.status,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end
          };
        }
      } catch (stripeError) {
        logger.error('Failed to fetch Stripe subscription', { error: stripeError.message });
      }
    }

    res.json({
      status: user.subscriptionStatus,
      isPremium: user.subscriptionStatus === 'premium',
      trialEndsAt: user.trialEndsAt,
      subscription,
      trialDaysRemaining: user.subscriptionStatus === 'trial' && user.trialEndsAt
        ? Math.max(0, Math.ceil((user.trialEndsAt - new Date()) / (1000 * 60 * 60 * 24)))
        : null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/cancel
 * Cancel subscription
 */
router.post('/cancel', authenticate, async (req, res, next) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user.stripeCustomerId) {
      return res.status(400).json({ error: 'No active subscription' });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return res.status(400).json({ error: 'No active subscription' });
    }

    // Cancel at period end (user keeps access until then)
    await stripe.subscriptions.update(subscriptions.data[0].id, {
      cancel_at_period_end: true
    });

    logger.info('Subscription cancellation scheduled', { userId: req.user.id });

    res.json({
      message: 'Subscription will be cancelled at the end of the billing period',
      endsAt: new Date(subscriptions.data[0].current_period_end * 1000)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/portal
 * Create customer portal session
 */
router.post('/portal', authenticate, async (req, res, next) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user.stripeCustomerId) {
      return res.status(400).json({ error: 'No customer record found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/settings`
    });

    res.json({ url: session.url });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
