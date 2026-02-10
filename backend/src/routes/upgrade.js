const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://loverescue.app';

// In-memory rate limit store (use Redis in production)
const emailRateLimit = new Map();

const PRICING = {
  monthly: {
    stripe_price_id: process.env.STRIPE_MONTHLY_PRICE_ID,
    label: '$9.99/month',
  },
  yearly: {
    stripe_price_id: process.env.STRIPE_YEARLY_PRICE_ID,
    label: '$79.99/year (save 33%)',
  },
};

/**
 * POST /api/upgrade/send-link
 * Send a personalized upgrade email with Stripe checkout link.
 * Rate limited: 1 email per 24 hours per user.
 */
router.post('/send-link', authenticate, async (req, res) => {
  try {
    const { email, plan = 'yearly' } = req.body;
    const userId = req.user.id;
    const targetEmail = email || req.user.email;

    // Rate limit check
    const lastSent = emailRateLimit.get(userId);
    if (lastSent && Date.now() - lastSent < 24 * 60 * 60 * 1000) {
      return res.status(429).json({
        error: 'Upgrade link already sent. Check your email or try again in 24 hours.',
      });
    }

    // Get user data for personalization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        email: true,
        subscriptionStatus: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (['paid', 'premium'].includes(user.subscriptionStatus)) {
      return res.status(400).json({ error: 'You already have an active subscription.' });
    }

    // Count completed assessments for personalization
    const assessmentCount = await prisma.assessment.count({
      where: { userId },
    });

    // Build Stripe checkout URL
    const checkoutUrl = `${FRONTEND_URL}/subscribe?plan=${plan}&email=${encodeURIComponent(targetEmail)}`;

    // Send email
    const firstName = user.firstName || 'there';
    const sent = await sendEmail({
      to: targetEmail,
      subject: `${firstName}, unlock your full relationship potential 💜`,
      text: `Hi ${firstName},\n\nYou've completed ${assessmentCount} assessment${assessmentCount !== 1 ? 's' : ''} on LoveRescue. Ready to go deeper?\n\nUnlock all 12 assessments, matchup scores, daily journaling, and AI-powered strategies:\n${checkoutUrl}\n\nYour upgrade: ${PRICING[plan]?.label || PRICING.yearly.label}\n\n— The LoveRescue Team`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #fafafa; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Ready to Go Deeper? 💜</h1>
          </div>
          <div style="padding: 30px;">
            <p style="font-size: 16px; color: #333;">Hi ${firstName},</p>
            <p style="font-size: 16px; color: #555; line-height: 1.6;">
              You've completed <strong>${assessmentCount} assessment${assessmentCount !== 1 ? 's' : ''}</strong> on LoveRescue. 
              You've already started discovering powerful insights about yourself.
            </p>
            <p style="font-size: 16px; color: #555; line-height: 1.6;">
              Unlock the full experience and discover <strong>all 12 dimensions</strong> of your relationship:
            </p>
            <ul style="color: #555; line-height: 2; font-size: 15px;">
              <li>✨ All 12 relationship assessments</li>
              <li>💕 Partner matchup & compatibility scores</li>
              <li>🎯 AI-powered personalized strategies</li>
              <li>📓 Full daily tracking with gratitude & journal</li>
              <li>📊 Detailed relationship reports</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${checkoutUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(99,102,241,0.3);">
                Upgrade Now — ${PRICING[plan]?.label || PRICING.yearly.label}
              </a>
            </div>
            <p style="font-size: 13px; color: #999; text-align: center;">
              Secure checkout powered by Stripe. Cancel anytime.
            </p>
          </div>
        </div>
      `,
    });

    if (sent) {
      emailRateLimit.set(userId, Date.now());
      logger.info('Upgrade email sent', { userId, targetEmail, plan });
      res.json({ success: true, message: 'Upgrade link sent to your email.' });
    } else {
      res.status(500).json({ error: 'Failed to send email. Please try again later.' });
    }
  } catch (error) {
    logger.error('Upgrade send-link error', { error: error.message });
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

/**
 * POST /api/upgrade/checkout
 * Create a Stripe Checkout session and return the URL.
 */
router.post('/checkout', authenticate, async (req, res) => {
  try {
    if (!STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const stripe = require('stripe')(STRIPE_SECRET_KEY);
    const { plan = 'yearly' } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { email: true, stripeCustomerId: true, subscriptionStatus: true },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (['paid', 'premium'].includes(user.subscriptionStatus)) {
      return res.status(400).json({ error: 'Already subscribed' });
    }

    const priceId = PRICING[plan]?.stripe_price_id;
    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: req.user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${FRONTEND_URL}/dashboard?upgraded=true`,
      cancel_url: `${FRONTEND_URL}/subscribe`,
      metadata: { userId: req.user.id },
    });

    res.json({ url: session.url });
  } catch (error) {
    logger.error('Checkout session error', { error: error.message });
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

module.exports = router;
