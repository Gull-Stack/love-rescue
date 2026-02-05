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

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendPartnerInviteEmail
};
