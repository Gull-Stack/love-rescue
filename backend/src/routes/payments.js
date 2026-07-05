const express = require('express');
const Stripe = require('stripe');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const { sendEmail } = require('../utils/email');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Resolve the entitlement tier for an entitled (active/trialing) subscription
 * from its price IDs: premium/annual price → 'premium', anything else → 'paid'.
 */
function entitlementForSubscription(subscription) {
  const premiumPriceId = process.env.STRIPE_PREMIUM_PRICE_ID;
  const annualPriceId = process.env.STRIPE_ANNUAL_PRICE_ID;
  const hasPremiumOrAnnual = subscription.items?.data?.some(
    (item) => item.price?.id === premiumPriceId || item.price?.id === annualPriceId
  );
  return hasPremiumOrAnnual ? 'premium' : 'paid';
}

/**
 * Out-of-order protection: true when this event was created before the last
 * Stripe event we already processed for this user. Stripe does not guarantee
 * delivery order, so a stale `customer.subscription.updated` must never
 * overwrite the effect of a newer one.
 */
function isStaleEvent(user, eventCreatedAt) {
  return Boolean(user.lastStripeEventAt && user.lastStripeEventAt > eventCreatedAt);
}

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

  // Stripe's `created` is a unix timestamp (seconds).
  const eventCreatedAt = new Date((event.created || Math.floor(Date.now() / 1000)) * 1000);

  try {
    // ── Idempotency: record the event id BEFORE processing. Stripe retries
    // deliveries, so the unique primary key on WebhookEvent.id turns a
    // redelivered event into a no-op — we acknowledge with 200 and skip.
    if (event.id) {
      try {
        await req.prisma.webhookEvent.create({
          data: {
            id: event.id,
            type: event.type,
            payloadSummary: {
              created: event.created || null,
              objectId: event.data?.object?.id || null
            }
          }
        });
      } catch (err) {
        if (err.code === 'P2002') {
          // Unique constraint violation = we already saw this event.
          logger.info('Duplicate webhook event skipped', { eventId: event.id, type: event.type });
          return res.json({ received: true, duplicate: true });
        }
        throw err;
      }
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const tier = session.metadata?.tier;

        if (userId) {
          const user = await req.prisma.user.findUnique({
            where: { id: userId },
            select: { lastStripeEventAt: true }
          });
          if (!user) {
            logger.warn('Webhook for unknown user skipped', { userId, eventId: event.id, type: event.type });
            break;
          }
          if (isStaleEvent(user, eventCreatedAt)) {
            logger.info('Out-of-order webhook event skipped', { userId, eventId: event.id, type: event.type });
            break;
          }

          let status = 'paid';
          if (tier === 'annual') status = 'premium';
          else if (tier === 'premium') status = 'premium';

          await req.prisma.user.update({
            where: { id: userId },
            data: {
              subscriptionStatus: status,
              stripeCustomerId: session.customer,
              lastStripeEventAt: eventCreatedAt
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
          const user = await req.prisma.user.findUnique({
            where: { id: userId },
            select: { lastStripeEventAt: true, subscriptionStatus: true }
          });
          if (!user) {
            logger.warn('Webhook for unknown user skipped', { userId, eventId: event.id, type: event.type });
            break;
          }
          if (isStaleEvent(user, eventCreatedAt)) {
            logger.info('Out-of-order webhook event skipped', { userId, eventId: event.id, type: event.type });
            break;
          }

          // Full Stripe subscription-status mapping. `undefined` = leave the
          // user's current entitlement untouched.
          let status;
          switch (subscription.status) {
            // Entitled: the subscription is in good standing. `trialing`
            // counts — a Stripe trial grants full access until it converts
            // or lapses. Tier (premium vs paid) is derived from price IDs.
            case 'active':
            case 'trialing':
              status = entitlementForSubscription(subscription);
              break;

            // Grace period: a renewal payment failed and Stripe is retrying.
            // We deliberately KEEP the current entitlement — dunning emails
            // (invoice.payment_failed) nudge the user; if all retries fail,
            // Stripe moves the subscription to canceled/unpaid and we expire
            // it then.
            case 'past_due':
              logger.warn('Subscription past_due — keeping current entitlement during grace period', {
                userId,
                subscriptionId: subscription.id,
                currentStatus: user.subscriptionStatus
              });
              break;

            // Terminal: the subscription is gone (canceled), Stripe gave up
            // collecting (unpaid), or the initial payment never completed
            // within 23 hours (incomplete_expired). Entitlement ends.
            case 'canceled':
            case 'unpaid':
            case 'incomplete_expired':
              status = 'expired';
              break;

            // Initial payment still settling (e.g. 3DS challenge pending).
            // No change — checkout.session.completed or a later update will
            // resolve it one way or the other.
            case 'incomplete':
              logger.info('Subscription incomplete — awaiting initial payment, no entitlement change', {
                userId,
                subscriptionId: subscription.id
              });
              break;

            // Unknown/future Stripe status: fail safe by not touching the
            // entitlement, but make noise so it gets looked at.
            default:
              logger.warn('Unhandled Stripe subscription status — no entitlement change', {
                userId,
                subscriptionId: subscription.id,
                stripeStatus: subscription.status
              });
          }

          const data = { lastStripeEventAt: eventCreatedAt };
          if (status) data.subscriptionStatus = status;
          await req.prisma.user.update({
            where: { id: userId },
            data
          });

          logger.info('Subscription updated', { userId, status: status || user.subscriptionStatus, stripeStatus: subscription.status });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customer = await stripe.customers.retrieve(subscription.customer);
        const userId = customer.metadata?.userId;

        if (userId) {
          const user = await req.prisma.user.findUnique({
            where: { id: userId },
            select: { lastStripeEventAt: true }
          });
          if (!user) {
            logger.warn('Webhook for unknown user skipped', { userId, eventId: event.id, type: event.type });
            break;
          }
          if (isStaleEvent(user, eventCreatedAt)) {
            logger.info('Out-of-order webhook event skipped', { userId, eventId: event.id, type: event.type });
            break;
          }

          await req.prisma.user.update({
            where: { id: userId },
            data: { subscriptionStatus: 'expired', lastStripeEventAt: eventCreatedAt }
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

          // Dunning email: this event only fires for a real Stripe
          // subscription, so if it arrives billing is genuinely in play.
          // Guard: only send when the user actually exists and the event
          // isn't a stale redelivery from before a newer state change.
          const user = await req.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, firstName: true, lastStripeEventAt: true }
          });
          if (!user) {
            logger.warn('Payment-failed webhook for unknown user — no dunning email sent', { userId, invoiceId: invoice.id });
            break;
          }
          if (isStaleEvent(user, eventCreatedAt)) {
            logger.info('Out-of-order webhook event skipped', { userId, eventId: event.id, type: event.type });
            break;
          }

          const name = user.firstName || 'there';
          const portalUrl = `${process.env.FRONTEND_URL || 'https://loverescue.app'}/settings`;
          await sendEmail({
            to: user.email,
            subject: 'Love Rescue - We couldn\'t process your payment',
            text: `Hey ${name},\n\nWe tried to renew your Love Rescue subscription, but your payment didn't go through. This usually just means a card expired or was replaced.\n\nUpdate your payment method here and you're all set: ${portalUrl}\n\nWe'll retry automatically over the next few days, and your access stays active in the meantime. If the payment keeps failing, your subscription will pause — and we'd hate to interrupt your progress.\n\n— Love Rescue`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #0F1722;">Hey ${name},</h2>
                <p style="font-size: 16px; color: #1B2735;">We tried to renew your Love Rescue subscription, but your payment didn't go through. This usually just means a card expired or was replaced.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${portalUrl}" style="background: #E08A3C; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Update payment method</a>
                </div>
                <p style="font-size: 16px; color: #1B2735;">We'll retry automatically over the next few days, and your access stays active in the meantime. If the payment keeps failing, your subscription will pause — and we'd hate to interrupt your progress.</p>
                <p style="color: #9FB0C0; font-size: 13px;">Questions? Just reply to this email.</p>
              </div>
            `
          });

          await req.prisma.user.update({
            where: { id: userId },
            data: { lastStripeEventAt: eventCreatedAt }
          });
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
