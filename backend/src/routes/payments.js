const express = require('express');
const Stripe = require('stripe');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * POST /api/payments/create-checkout
 * DISABLED — app is free.
 */
router.post('/create-checkout', authenticate, (req, res) => {
  res.status(410).json({ error: 'LoveRescue is now free. No checkout required.', code: 'APP_IS_FREE' });
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

    // App is free — always return premium status
    res.json({
      status: 'premium',
      isPremium: true,
      trialEndsAt: null,
      subscription,
      trialDaysRemaining: null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/cancel
 * DISABLED — app is free.
 */
router.post('/cancel', authenticate, (req, res) => {
  res.status(410).json({ error: 'LoveRescue is now free. No subscription to cancel.', code: 'APP_IS_FREE' });
});

/**
 * POST /api/payments/portal
 * DISABLED — app is free.
 */
router.post('/portal', authenticate, (req, res) => {
  res.status(410).json({ error: 'LoveRescue is now free. No billing portal required.', code: 'APP_IS_FREE' });
});

module.exports = router;
