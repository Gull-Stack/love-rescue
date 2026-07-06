const express = require('express');
const Stripe = require('stripe');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const { sendEmail } = require('../utils/email');
const { resolveEntitlement, trialDaysRemaining } = require('../lib/entitlement');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// The two purchasable tiers. Both grant premium-level entitlement; the webhook
// maps tier 'premium'|'annual' → subscriptionStatus 'premium'. Dollar amounts
// live in Stripe (fetched via prices.retrieve); env display vars + the coded
// defaults below are the fallback when Stripe is unreachable or unconfigured.
const TIERS = {
  premium: {
    id: 'premium',
    name: 'Premium Monthly',
    priceIdEnv: 'STRIPE_PREMIUM_PRICE_ID',
    displayEnv: 'PLAN_PREMIUM_DISPLAY',
    defaultDisplay: '$49/mo',
    defaultAmount: 4900,
    defaultInterval: 'month'
  },
  annual: {
    id: 'annual',
    name: 'Premium Annual',
    priceIdEnv: 'STRIPE_ANNUAL_PRICE_ID',
    displayEnv: 'PLAN_ANNUAL_DISPLAY',
    defaultDisplay: '$490/yr',
    defaultAmount: 49000,
    defaultInterval: 'year'
  }
};

function getTrialDays() {
  const parsed = parseInt(process.env.TRIAL_DAYS || '14', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 14;
}

function frontendUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:3000';
}

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
 * Apply an entitlement change to a user, gated on the out-of-order watermark,
 * in a single atomic write.
 *
 * `updateMany` matches the row only when it still exists AND this event is not
 * older than the last one we processed (`lastStripeEventAt` null or < the
 * event's `created`). That folds the unknown-user check, the staleness check
 * and the write into one query — no read-then-write race, and every caller is
 * forced to stamp the watermark, so no event case can forget it. Stripe does
 * not guarantee delivery order, so a stale `customer.subscription.updated`
 * must never overwrite the effect of a newer one.
 *
 * Returns true when the write applied, false when it was a no-op (user gone or
 * a stale/redelivered event) so the caller can skip any follow-up work.
 */
async function applyUserEntitlement(prisma, userId, eventCreatedAt, dataToSet) {
  const { count } = await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [
        { lastStripeEventAt: null },
        { lastStripeEventAt: { lt: eventCreatedAt } }
      ]
    },
    data: { ...dataToSet, lastStripeEventAt: eventCreatedAt }
  });
  return count > 0;
}

/**
 * GET /api/payments/plans
 * Public pricing for the two tiers. Reads live amounts from Stripe when the
 * price IDs are configured; falls back to env display vars / coded defaults.
 * Response: { plans: [{ id, name, interval, amount, currency, priceDisplay,
 * priceId }], trialDays }.
 */
router.get('/plans', async (req, res) => {
  const trialDays = getTrialDays();

  const plans = await Promise.all(Object.values(TIERS).map(async (tier) => {
    const priceId = process.env[tier.priceIdEnv] || null;
    let amount = tier.defaultAmount;
    let currency = 'usd';
    let interval = tier.defaultInterval;
    let priceDisplay = process.env[tier.displayEnv] || tier.defaultDisplay;

    if (priceId) {
      try {
        const price = await stripe.prices.retrieve(priceId);
        if (typeof price.unit_amount === 'number') amount = price.unit_amount;
        if (price.currency) currency = price.currency;
        if (price.recurring && price.recurring.interval) interval = price.recurring.interval;
        // Prefer an explicit env display override; otherwise render from Stripe.
        if (!process.env[tier.displayEnv]) {
          priceDisplay = `$${(amount / 100).toFixed(amount % 100 === 0 ? 0 : 2)}/${interval === 'year' ? 'yr' : 'mo'}`;
        }
      } catch (err) {
        logger.warn('Failed to retrieve Stripe price, using fallback', { tier: tier.id, error: err.message });
      }
    }

    return {
      id: tier.id,
      name: tier.name,
      interval,
      amount,
      currency,
      priceDisplay,
      priceId
    };
  }));

  res.json({ plans, trialDays });
});

/**
 * POST /api/payments/create-checkout  { tier }
 * Creates a Stripe Checkout session (mode: subscription) for the given tier.
 * Ensures the Stripe customer carries metadata.userId (the webhook resolves the
 * user from it) and carries the checkout metadata {userId, tier}. Any trial
 * days the user has left are passed to Stripe as subscription_data.trial_period_days.
 * Returns { url, sessionId }.
 */
router.post('/create-checkout', authenticate, async (req, res, next) => {
  try {
    const requestedTier = req.body?.tier;
    const tier = TIERS[requestedTier] ? requestedTier : 'premium';
    const priceId = process.env[TIERS[tier].priceIdEnv];

    if (!priceId) {
      logger.error('Checkout requested but price id not configured', { tier });
      return res.status(500).json({ error: 'Billing is not configured', code: 'PRICE_NOT_CONFIGURED' });
    }

    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
        subscriptionStatus: true,
        trialEndsAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ensure a Stripe customer exists AND carries metadata.userId — the webhook
    // maps customer.metadata.userId back to the user on subscription events.
    let customerId = user.stripeCustomerId;
    if (customerId) {
      // Keep the mapping current (idempotent).
      try {
        await stripe.customers.update(customerId, { metadata: { userId: user.id } });
      } catch (err) {
        logger.warn('Could not update Stripe customer metadata', { userId: user.id, error: err.message });
      }
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id }
      });
      customerId = customer.id;
      await req.prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId }
      });
    }

    const sessionParams = {
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId: user.id, tier },
      success_url: `${frontendUrl()}/subscribe?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl()}/subscribe?status=cancelled`
    };

    // Honour any remaining app trial as a Stripe trial so the user is not
    // double-charged while their in-app trial is still running.
    const remainingTrial = user.subscriptionStatus === 'trial'
      ? trialDaysRemaining(user.trialEndsAt)
      : 0;
    if (remainingTrial > 0) {
      sessionParams.subscription_data = { trial_period_days: remainingTrial };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    logger.info('Checkout session created', { userId: user.id, tier, trialDays: remainingTrial });
    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    logger.error('create-checkout error', { error: error.message });
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

  // Stripe's `created` is a unix timestamp (seconds).
  const eventCreatedAt = new Date((event.created || Math.floor(Date.now() / 1000)) * 1000);

  try {
    // ── Idempotency pre-check. Stripe retries deliveries, so a redelivered
    // event must be a no-op. We look the event up by its id (the WebhookEvent
    // primary key) and, if it's already on the ledger, acknowledge with 200
    // and skip. Crucially, we DO NOT record the event here — it's recorded
    // only AFTER the handler succeeds (below). That way a transient failure
    // mid-handling leaves no ledger row, returns non-2xx, and Stripe's retry
    // genuinely reprocesses the event instead of being acked as a duplicate.
    if (event.id) {
      const existing = await req.prisma.webhookEvent.findUnique({ where: { id: event.id } });
      if (existing) {
        logger.info('Duplicate webhook event skipped', { eventId: event.id, type: event.type });
        return res.json({ received: true, duplicate: true });
      }
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const tier = session.metadata?.tier;

        if (userId) {
          let status = 'paid';
          if (tier === 'annual' || tier === 'premium') status = 'premium';

          const applied = await applyUserEntitlement(req.prisma, userId, eventCreatedAt, {
            subscriptionStatus: status,
            stripeCustomerId: session.customer
          });
          if (!applied) {
            logger.info('Webhook skipped (unknown user or stale event)', { userId, eventId: event.id, type: event.type });
            break;
          }

          logger.info('Subscription activated', { userId, tier });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customer = await stripe.customers.retrieve(subscription.customer);
        const userId = customer.metadata?.userId;

        if (userId) {
          // Full Stripe subscription-status mapping. `undefined` = leave the
          // user's current entitlement untouched (watermark still advances).
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
                subscriptionId: subscription.id
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

          const entitlement = {};
          if (status) entitlement.subscriptionStatus = status;
          const applied = await applyUserEntitlement(req.prisma, userId, eventCreatedAt, entitlement);
          if (!applied) {
            logger.info('Webhook skipped (unknown user or stale event)', { userId, eventId: event.id, type: event.type });
            break;
          }

          logger.info('Subscription updated', { userId, status: status || 'unchanged', stripeStatus: subscription.status });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customer = await stripe.customers.retrieve(subscription.customer);
        const userId = customer.metadata?.userId;

        if (userId) {
          const applied = await applyUserEntitlement(req.prisma, userId, eventCreatedAt, {
            subscriptionStatus: 'expired'
          });
          if (!applied) {
            logger.info('Webhook skipped (unknown user or stale event)', { userId, eventId: event.id, type: event.type });
            break;
          }

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
          // Load the user for their email/name; skip if they no longer exist.
          const user = await req.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, firstName: true }
          });
          if (!user) {
            logger.warn('Payment-failed webhook for unknown user — no dunning email sent', { userId, invoiceId: invoice.id });
            break;
          }

          // Advance the watermark atomically first. A no-op (count 0) means a
          // stale redelivery from before a newer state change — skip the email
          // so we never re-send a dunning notice for an outdated failure.
          const applied = await applyUserEntitlement(req.prisma, userId, eventCreatedAt, {});
          if (!applied) {
            logger.info('Out-of-order payment-failed webhook skipped', { userId, eventId: event.id, type: event.type });
            break;
          }

          // Fire-and-forget the email AFTER the DB write: a slow or down SMTP
          // host must never delay the 200 or trigger a Stripe timeout-retry.
          // Failures are logged, not surfaced — the watermark is already set,
          // so a retry would be deduped anyway.
          const name = user.firstName || 'there';
          const portalUrl = `${process.env.FRONTEND_URL || 'https://loverescue.app'}/settings`;
          sendEmail({
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
          }).catch((err) => {
            logger.error('Dunning email delivery failed', { userId, invoiceId: invoice.id, error: err.message });
          });
        }
        break;
      }

      default:
        logger.info('Unhandled webhook event', { type: event.type });
    }

    // ── Record the event as processed only now that handling succeeded, so a
    // throw above never leaves a ledger row (and Stripe's retry reprocesses).
    // A P2002 here means a concurrent redelivery recorded it first — that's
    // still a duplicate, so ack it. The atomic watermark keeps the entitlement
    // correct even if both deliveries reached the handler.
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
          logger.info('Duplicate webhook event skipped', { eventId: event.id, type: event.type });
          return res.json({ received: true, duplicate: true });
        }
        throw err;
      }
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook handler error', { error: error.message });
    next(error);
  }
});

/**
 * GET /api/payments/subscription
 * Real, couple-aware subscription state. Returns:
 * { status, isPremium, tier, currentPeriodEnd, cancelAtPeriodEnd, trialEndsAt,
 *   trialDaysRemaining, coveredByPartner }.
 */
router.get('/subscription', authenticate, async (req, res, next) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        subscriptionStatus: true,
        trialEndsAt: true,
        stripeCustomerId: true,
        subscriptionCurrentPeriodEnd: true
      }
    });

    // req.entitlement was resolved by authenticate; recompute defensively if
    // absent (e.g. a route mounted without the standard middleware order).
    const entitlement = req.entitlement || await resolveEntitlement(req.prisma, { id: req.user.id, ...user });

    let currentPeriodEnd = user.subscriptionCurrentPeriodEnd || null;
    let cancelAtPeriodEnd = false;

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
          currentPeriodEnd = new Date(sub.current_period_end * 1000);
          cancelAtPeriodEnd = sub.cancel_at_period_end;
        }
      } catch (stripeError) {
        logger.error('Failed to fetch Stripe subscription', { error: stripeError.message });
      }
    }

    res.json({
      status: entitlement.status,
      isPremium: entitlement.tier === 'premium',
      tier: entitlement.tier,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      trialEndsAt: user.trialEndsAt || null,
      trialDaysRemaining: entitlement.trialDaysRemaining,
      coveredByPartner: entitlement.coveredByPartner
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/payments/cancel
 * Cancels the user's active Stripe subscription at the end of the current
 * billing period (they keep access until then). Returns { message, endsAt }.
 */
router.post('/cancel', authenticate, async (req, res, next) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { stripeCustomerId: true }
    });

    if (!user || !user.stripeCustomerId) {
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

    const sub = subscriptions.data[0];
    await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });

    logger.info('Subscription set to cancel at period end', { userId: req.user.id, subscriptionId: sub.id });
    res.json({
      message: 'Your subscription will be cancelled at the end of the billing period.',
      endsAt: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null
    });
  } catch (error) {
    logger.error('cancel subscription error', { error: error.message });
    next(error);
  }
});

/**
 * POST /api/payments/portal
 * Creates a Stripe billing portal session for the user. Returns { url }.
 */
router.post('/portal', authenticate, async (req, res, next) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { stripeCustomerId: true }
    });

    if (!user || !user.stripeCustomerId) {
      return res.status(400).json({ error: 'No customer record found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${frontendUrl()}/settings`
    });

    res.json({ url: session.url });
  } catch (error) {
    logger.error('billing portal error', { error: error.message });
    next(error);
  }
});

module.exports = router;
