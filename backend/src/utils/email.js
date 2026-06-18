const nodemailer = require('nodemailer');
const logger = require('./logger');

// Create transporter based on environment
let transporter;

function getTransporter() {
  if (transporter) return transporter;

  // Check if SMTP is configured
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    logger.info('Email transporter configured with SMTP');
  } else if (process.env.SENDGRID_API_KEY) {
    // Use SendGrid if configured
    transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
    logger.info('Email transporter configured with SendGrid');
  } else {
    // No email configured - log warning
    logger.warn('No email service configured (SMTP_HOST or SENDGRID_API_KEY required)');
    return null;
  }

  return transporter;
}

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content (optional)
 * @returns {Promise<boolean>} - True if sent successfully
 */
async function sendEmail({ to, subject, text, html }) {
  const transport = getTransporter();
  
  if (!transport) {
    logger.warn('Email not sent - no email service configured', { to, subject });
    return false;
  }

  const fromEmail = process.env.EMAIL_FROM || 'noreply@loverescue.app';
  const fromName = process.env.EMAIL_FROM_NAME || 'Love Rescue';

  try {
    await transport.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      text,
      html: html || text
    });
    logger.info('Email sent successfully', { to, subject });
    return true;
  } catch (error) {
    logger.error('Failed to send email', { to, subject, error: error.message });
    return false;
  }
}

/**
 * Send password reset email
 * @param {string} email - User's email
 * @param {string} code - 6-digit reset code
 */
async function sendPasswordResetEmail(email, code) {
  return sendEmail({
    to: email,
    subject: 'Love Rescue - Password Reset Code',
    text: `Your password reset code is: ${code}\n\nThis code expires in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">Password Reset</h2>
        <p>Your password reset code is:</p>
        <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: bold; margin: 20px 0;">
          ${code}
        </div>
        <p style="color: #666;">This code expires in 1 hour.</p>
        <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
      </div>
    `
  });
}

/**
 * Send partner invite email
 * @param {string} email - Partner's email
 * @param {string} inviterName - Name of person sending invite
 * @param {string} inviteLink - Link to accept invite
 */
async function sendPartnerInviteEmail(email, inviterName, inviteLink) {
  return sendEmail({
    to: email,
    subject: `${inviterName} invited you to Love Rescue`,
    text: `${inviterName} has invited you to join them on Love Rescue - a relationship improvement app.\n\nClick here to accept: ${inviteLink}\n\nThis invitation expires in 7 days.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366f1;">You're Invited!</h2>
        <p><strong>${inviterName}</strong> has invited you to join them on Love Rescue - a relationship improvement app.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" style="background: #6366f1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Accept Invitation</a>
        </div>
        <p style="color: #666;">This invitation expires in 7 days.</p>
      </div>
    `
  });
}

/**
 * Re-engagement: nudge a user whose streak is about to break (missed yesterday,
 * hasn't logged today). Email reaches everyone regardless of push permission.
 */
async function sendStreakBreakNudge(email, firstName, currentStreak) {
  const name = firstName || 'there';
  const streakLine = currentStreak > 0
    ? `Your ${currentStreak}-day streak is still alive — but only until tonight.`
    : `It's been a couple of days. Today's a good day to get back on track.`;
  const ctaUrl = `${process.env.FRONTEND_URL || 'https://loverescue.app'}/daily`;
  return sendEmail({
    to: email,
    subject: currentStreak > 0 ? `Don't break your ${currentStreak}-day streak` : 'Your marriage is worth 60 seconds today',
    text: `Hey ${name},\n\n${streakLine}\n\nTake 60 seconds for your check-in: ${ctaUrl}\n\nShowing up daily is the whole game.\n— Love Rescue`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0F1722;">Hey ${name},</h2>
        <p style="font-size: 16px; color: #1B2735;">${streakLine}</p>
        <p style="font-size: 16px; color: #1B2735;">Showing up daily is the whole game. It takes about 60 seconds.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${ctaUrl}" style="background: #E08A3C; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Take today's check-in</a>
        </div>
        <p style="color: #9FB0C0; font-size: 13px;">You can turn these reminders off anytime in Settings.</p>
      </div>
    `
  });
}

/**
 * Re-engagement: weekly digest of the user's progress (the `weeklyDigest`
 * preference previously had no sender).
 */
async function sendWeeklyDigest(email, firstName, stats = {}) {
  const name = firstName || 'there';
  const { logsThisWeek = 0, currentStreak = 0, headline } = stats;
  const ctaUrl = `${process.env.FRONTEND_URL || 'https://loverescue.app'}/dashboard`;
  const summary = headline || `You logged ${logsThisWeek} ${logsThisWeek === 1 ? 'day' : 'days'} this week${currentStreak > 0 ? ` and you're on a ${currentStreak}-day streak` : ''}.`;
  return sendEmail({
    to: email,
    subject: 'Your week on Love Rescue',
    text: `Hey ${name},\n\n${summary}\n\nSee your full progress: ${ctaUrl}\n\n— Love Rescue`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0F1722;">Your week, ${name}</h2>
        <p style="font-size: 16px; color: #1B2735;">${summary}</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${ctaUrl}" style="background: #E08A3C; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">See your progress</a>
        </div>
        <p style="color: #9FB0C0; font-size: 13px;">You can turn the weekly digest off anytime in Settings.</p>
      </div>
    `
  });
}

/** True if any email transport is configured (SMTP or SendGrid). */
function isEmailConfigured() {
  return Boolean(
    (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) ||
    process.env.SENDGRID_API_KEY
  );
}

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendPartnerInviteEmail,
  sendStreakBreakNudge,
  sendWeeklyDigest,
  isEmailConfigured
};
