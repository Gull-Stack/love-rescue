const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} = require('@simplewebauthn/server');
const { OAuth2Client } = require('google-auth-library');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = express.Router();

// HIGH-05: Account lockout tracking
// In-memory store for failed login attempts (in production, use Redis)
const failedAttempts = new Map(); // email -> { count, lockedUntil }
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function checkAccountLockout(email) {
  const record = failedAttempts.get(email);
  if (!record) return false;
  if (record.lockedUntil && record.lockedUntil > Date.now()) {
    return true; // Account is locked
  }
  if (record.lockedUntil && record.lockedUntil <= Date.now()) {
    // Lockout expired, reset
    failedAttempts.delete(email);
    return false;
  }
  return false;
}

function recordFailedAttempt(email) {
  const record = failedAttempts.get(email) || { count: 0, lockedUntil: null };
  record.count += 1;
  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    logger.warn('Account locked due to too many failed login attempts', { email });
  }
  failedAttempts.set(email, record);
}

function clearFailedAttempts(email) {
  failedAttempts.delete(email);
}

// WebAuthn configuration
const rpName = process.env.WEBAUTHN_RP_NAME || 'Marriage Rescue App';
const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
const origin = process.env.WEBAUTHN_ORIGIN || 'http://localhost:3000';

/**
 * POST /api/auth/signup
 * Create new user account
 */
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, gender } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user exists
    const existingUser = await req.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Calculate trial end date (14 days)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    // Create user
    const user = await req.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        gender: gender || null,
        subscriptionStatus: 'trial',
        trialEndsAt
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        gender: true,
        subscriptionStatus: true
      }
    });

    // Create relationship (solo start)
    await req.prisma.relationship.create({
      data: {
        user1Id: user.id,
        inviteCode: uuidv4().substring(0, 8).toUpperCase()
      }
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info('User signed up', { userId: user.id });

    res.status(201).json({
      message: 'Account created successfully',
      user,
      token
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Login with email/password
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase();

    // HIGH-05: Check account lockout
    if (checkAccountLockout(normalizedEmail)) {
      return res.status(429).json({ error: 'Account temporarily locked due to too many failed attempts. Try again in 15 minutes.' });
    }

    const user = await req.prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      // Don't reveal whether account exists
      recordFailedAttempt(normalizedEmail);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.passwordHash) {
      // Don't reveal auth provider to avoid account enumeration
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      recordFailedAttempt(normalizedEmail);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Clear failed attempts on successful login
    clearFailedAttempts(normalizedEmail);

    // Check and update subscription status if trial expired
    if (user.subscriptionStatus === 'trial' && user.trialEndsAt < new Date()) {
      await req.prisma.user.update({
        where: { id: user.id },
        data: { subscriptionStatus: 'expired' }
      });
      user.subscriptionStatus = 'expired';
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info('User logged in', { userId: user.id });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        gender: user.gender,
        subscriptionStatus: user.subscriptionStatus
      },
      token
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/google
 * Authenticate with Google ID token (popup-based)
 */
router.post('/google', async (req, res, next) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    // Verify the Google ID token
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (err) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    const payload = ticket.getPayload();
    const { sub: googleId, email, email_verified, given_name, family_name } = payload;

    if (!email_verified) {
      return res.status(401).json({ error: 'Google email not verified' });
    }

    let user;
    let isNewUser = false;

    // 1. Look up by googleId first
    user = await req.prisma.user.findUnique({
      where: { googleId }
    });

    if (!user) {
      // 2. Look up by email (account linking)
      user = await req.prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (user) {
        // Link Google account to existing email user
        user = await req.prisma.user.update({
          where: { id: user.id },
          data: { googleId }
        });
      } else {
        // 3. Create new user (no password)
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14);

        user = await req.prisma.user.create({
          data: {
            email: email.toLowerCase(),
            googleId,
            authProvider: 'google',
            firstName: given_name || null,
            lastName: family_name || null,
            subscriptionStatus: 'trial',
            trialEndsAt
          }
        });

        // Create solo relationship
        await req.prisma.relationship.create({
          data: {
            user1Id: user.id,
            inviteCode: uuidv4().substring(0, 8).toUpperCase()
          }
        });

        isNewUser = true;
      }
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info('Google auth', { userId: user.id, isNewUser });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        gender: user.gender,
        subscriptionStatus: user.subscriptionStatus
      },
      token,
      isNewUser
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/webauthn/register/options
 * Generate WebAuthn registration options
 */
router.post('/webauthn/register/options', authenticate, async (req, res, next) => {
  try {
    const user = req.user;

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: user.id,
      userName: user.email,
      userDisplayName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred'
      }
    });

    // Store challenge temporarily (in production, use Redis)
    await req.prisma.token.create({
      data: {
        email: user.email,
        token: options.challenge,
        type: 'webauthn_challenge',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      }
    });

    res.json(options);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/webauthn/register/verify
 * Verify WebAuthn registration
 */
router.post('/webauthn/register/verify', authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    const { credential } = req.body;

    // Get stored challenge
    const challengeRecord = await req.prisma.token.findFirst({
      where: {
        email: user.email,
        type: 'webauthn_challenge',
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!challengeRecord) {
      return res.status(400).json({ error: 'Challenge expired or not found' });
    }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: challengeRecord.token,
      expectedOrigin: origin,
      expectedRPID: rpID
    });

    if (!verification.verified) {
      return res.status(400).json({ error: 'Verification failed' });
    }

    // Store credential
    await req.prisma.user.update({
      where: { id: user.id },
      data: {
        biometricKey: Buffer.from(verification.registrationInfo.credentialPublicKey).toString('base64'),
        biometricKeyId: Buffer.from(verification.registrationInfo.credentialID).toString('base64')
      }
    });

    // Mark challenge as used
    await req.prisma.token.update({
      where: { id: challengeRecord.id },
      data: { usedAt: new Date() }
    });

    logger.info('WebAuthn registered', { userId: user.id });

    res.json({ verified: true });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/webauthn/login/options
 * Generate WebAuthn authentication options
 */
router.post('/webauthn/login/options', async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await req.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user || !user.biometricKeyId) {
      return res.status(400).json({ error: 'Biometric login not set up for this account' });
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: [{
        id: Buffer.from(user.biometricKeyId, 'base64'),
        type: 'public-key'
      }],
      userVerification: 'preferred'
    });

    // Store challenge
    await req.prisma.token.create({
      data: {
        email: user.email,
        token: options.challenge,
        type: 'webauthn_auth_challenge',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      }
    });

    res.json(options);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/webauthn/login/verify
 * Verify WebAuthn authentication
 */
router.post('/webauthn/login/verify', async (req, res, next) => {
  try {
    const { email, credential } = req.body;

    const user = await req.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user || !user.biometricKey) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const challengeRecord = await req.prisma.token.findFirst({
      where: {
        email: user.email,
        type: 'webauthn_auth_challenge',
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!challengeRecord) {
      return res.status(400).json({ error: 'Challenge expired' });
    }

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: challengeRecord.token,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(user.biometricKeyId, 'base64'),
        credentialPublicKey: Buffer.from(user.biometricKey, 'base64'),
        counter: 0
      }
    });

    if (!verification.verified) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    // HIGH-07: TODO - Persist the updated counter from verification to prevent replay attacks.
    // The User model needs a `biometricCounter` Int field (schema update required).
    // After schema update, uncomment and use:
    // const newCounter = verification.authenticationInfo.newCounter;
    // await req.prisma.user.update({
    //   where: { id: user.id },
    //   data: { biometricCounter: newCounter }
    // });
    // And pass the stored counter instead of hardcoded 0 in the authenticator config above.

    await req.prisma.token.update({
      where: { id: challengeRecord.id },
      data: { usedAt: new Date() }
    });

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info('WebAuthn login', { userId: user.id });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        gender: user.gender,
        subscriptionStatus: user.subscriptionStatus
      },
      token
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/invite-partner
 * Generate partner invite link
 */
router.post('/invite-partner', authenticate, async (req, res, next) => {
  try {
    const { partnerEmail } = req.body;

    // Find user's active relationship
    const relationship = await req.prisma.relationship.findFirst({
      where: {
        OR: [
          { user1Id: req.user.id },
          { user2Id: req.user.id }
        ],
        status: 'active'
      }
    });

    if (!relationship) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    if (relationship.user2Id) {
      return res.status(400).json({ error: 'Partner already joined' });
    }

    // Generate new invite code if needed
    const inviteCode = relationship.inviteCode || uuidv4().substring(0, 8).toUpperCase();

    await req.prisma.relationship.update({
      where: { id: relationship.id },
      data: {
        inviteCode,
        inviteEmail: partnerEmail?.toLowerCase()
      }
    });

    // TODO: Send invite email via nodemailer

    logger.info('Partner invited', { userId: req.user.id, inviteCode });

    res.json({
      message: 'Invite created',
      inviteCode,
      inviteLink: `${process.env.FRONTEND_URL}/join/${inviteCode}`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/join/:code
 * Join relationship with invite code
 */
router.post('/join/:code', authenticate, async (req, res, next) => {
  try {
    const { code } = req.params;

    const relationship = await req.prisma.relationship.findUnique({
      where: { inviteCode: code.toUpperCase() }
    });

    if (!relationship) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    if (relationship.user2Id) {
      return res.status(400).json({ error: 'Invite already used' });
    }

    if (relationship.user1Id === req.user.id) {
      return res.status(400).json({ error: 'Cannot join your own relationship' });
    }

    // Delete the joining user's auto-created solo relationship
    await req.prisma.relationship.deleteMany({
      where: {
        user1Id: req.user.id,
        user2Id: null
      }
    });

    await req.prisma.relationship.update({
      where: { id: relationship.id },
      data: {
        user2Id: req.user.id,
        inviteCode: null // Clear code after use
      }
    });

    logger.info('Partner joined', { userId: req.user.id, relationshipId: relationship.id });

    res.json({ message: 'Successfully joined relationship' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        gender: true,
        subscriptionStatus: true,
        authProvider: true,
        trialEndsAt: true,
        createdAt: true
      }
    });

    const relationship = await req.prisma.relationship.findFirst({
      where: {
        OR: [
          { user1Id: req.user.id },
          { user2Id: req.user.id }
        ],
        status: 'active'
      },
      include: {
        user1: { select: { id: true, firstName: true, lastName: true } },
        user2: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    res.json({
      user,
      relationship: relationship ? {
        id: relationship.id,
        hasPartner: !!relationship.user2Id,
        inviteCode: relationship.inviteCode,
        partner: relationship.user1Id === req.user.id ? relationship.user2 : relationship.user1
      } : null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/auth/update-profile
 * Update user profile fields (gender, name, etc.)
 */
router.patch('/update-profile', authenticate, async (req, res, next) => {
  try {
    const { gender, firstName, lastName } = req.body;

    const updateData = {};
    if (gender !== undefined) {
      const validGenders = ['male', 'female', 'other', 'prefer_not_to_say', ''];
      if (!validGenders.includes(gender)) {
        return res.status(400).json({ error: 'Invalid gender value' });
      }
      updateData.gender = gender || null;
    }
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const user = await req.prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        gender: true,
        subscriptionStatus: true
      }
    });

    logger.info('Profile updated', { userId: req.user.id, fields: Object.keys(updateData) });

    res.json({ message: 'Profile updated', user });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/change-password
 * Change current user's password
 */
router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user.passwordHash) {
      return res.status(400).json({ error: 'Google Sign-In accounts cannot change password' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await req.prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash }
    });

    logger.info('Password changed', { userId: req.user.id });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/revoke-partner
 * End relationship and revoke partner/therapist access
 */
router.post('/revoke-partner', authenticate, async (req, res, next) => {
  try {
    const relationship = await req.prisma.relationship.findFirst({
      where: {
        OR: [
          { user1Id: req.user.id },
          { user2Id: req.user.id }
        ],
        status: 'active',
        user2Id: { not: null }
      }
    });

    if (!relationship) {
      return res.status(400).json({ error: 'No active paired relationship' });
    }

    await req.prisma.$transaction([
      // End relationship
      req.prisma.relationship.update({
        where: { id: relationship.id },
        data: {
          status: 'ended',
          sharedConsent: false,
          user1TherapistConsent: false,
          user2TherapistConsent: false
        }
      }),
      // Revoke all therapist assignments
      req.prisma.therapistAssignment.updateMany({
        where: { relationshipId: relationship.id, status: 'active' },
        data: { status: 'revoked', revokedAt: new Date() }
      }),
      // Log consent revocation
      req.prisma.consentLog.create({
        data: {
          userId: req.user.id,
          relationshipId: relationship.id,
          consentType: 'partner_sharing',
          granted: false,
          ipAddress: req.ip
        }
      })
    ]);

    // Create new solo relationships for both users so they can continue using the app
    const partnerId = relationship.user1Id === req.user.id
      ? relationship.user2Id
      : relationship.user1Id;

    await Promise.all([
      req.prisma.relationship.create({
        data: {
          user1Id: req.user.id,
          inviteCode: uuidv4().substring(0, 8).toUpperCase()
        }
      }),
      req.prisma.relationship.create({
        data: {
          user1Id: partnerId,
          inviteCode: uuidv4().substring(0, 8).toUpperCase()
        }
      })
    ]);

    logger.info('Partner access revoked', {
      userId: req.user.id,
      relationshipId: relationship.id
    });

    res.json({ message: 'Relationship ended. Shared data is now archived.' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/auth/delete-account
 * Delete user account with cascade handling
 */
router.delete('/delete-account', authenticate, async (req, res, next) => {
  try {
    const { password, confirmDelete } = req.body;

    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user.passwordHash) {
      // Google-only user: confirm with confirmDelete flag
      if (!confirmDelete) {
        return res.status(400).json({ error: 'Please confirm account deletion' });
      }
    } else {
      // Email/password user: confirm with password
      if (!password) {
        return res.status(400).json({ error: 'Password required to confirm deletion' });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Incorrect password' });
      }
    }

    // End any active relationships first (don't cascade-delete partner's data)
    const relationships = await req.prisma.relationship.findMany({
      where: {
        OR: [
          { user1Id: req.user.id },
          { user2Id: req.user.id }
        ],
        status: 'active'
      }
    });

    for (const rel of relationships) {
      await req.prisma.relationship.update({
        where: { id: rel.id },
        data: {
          status: 'ended',
          sharedConsent: false,
          user1TherapistConsent: false,
          user2TherapistConsent: false
        }
      });

      // Revoke therapist assignments
      await req.prisma.therapistAssignment.updateMany({
        where: { relationshipId: rel.id, status: 'active' },
        data: { status: 'revoked', revokedAt: new Date() }
      });
    }

    // Delete user (cascades to personal data: logs, assessments, etc.)
    await req.prisma.user.delete({
      where: { id: req.user.id }
    });

    logger.info('Account deleted', { userId: req.user.id });

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/forgot-password
 * HIGH-06: Initiate password reset flow
 */
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase();

    // Always return success to avoid email enumeration
    const user = await req.prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (user && user.passwordHash) {
      // Generate a 6-digit reset code
      const resetCode = crypto.randomInt(100000, 999999).toString();

      await req.prisma.token.create({
        data: {
          email: normalizedEmail,
          token: resetCode,
          type: 'password_reset',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour expiry
        }
      });

      // TODO: Send email with reset code via nodemailer/SendGrid
      // For now, log it (development only)
      logger.info('Password reset token generated', {
        email: normalizedEmail,
        resetCode: process.env.NODE_ENV !== 'production' ? resetCode : '[REDACTED]'
      });
    }

    // Always return same response regardless of whether user exists
    res.json({ message: 'If an account with that email exists, a password reset code has been sent.' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/reset-password
 * HIGH-06: Complete password reset with token
 */
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token: resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Find valid, unused reset token
    const tokenRecord = await req.prisma.token.findFirst({
      where: {
        token: resetToken,
        type: 'password_reset',
        usedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    if (!tokenRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Find user
    const user = await req.prisma.user.findUnique({
      where: { email: tokenRecord.email }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash and update password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await req.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    // Mark token as used
    await req.prisma.token.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() }
    });

    // Delete any other unused reset tokens for this email
    await req.prisma.token.deleteMany({
      where: {
        email: tokenRecord.email,
        type: 'password_reset',
        usedAt: null
      }
    });

    // Clear any lockout
    clearFailedAttempts(tokenRecord.email);

    logger.info('Password reset completed', { userId: user.id });

    res.json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
