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
const { resolveEntitlement } = require('../lib/entitlement');
const { computeJourney } = require('../lib/journey');

// New OAuth accounts start on the same free trial as email signups.
const trialStart = () => {
  const days = parseInt(process.env.TRIAL_DAYS || '14', 10);
  return new Date(Date.now() + (Number.isFinite(days) ? days : 14) * 24 * 60 * 60 * 1000);
};
const logger = require('../utils/logger');
const { sendPasswordResetEmail, sendPartnerInviteEmail } = require('../utils/email');

// Google OAuth Client IDs - web + iOS
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_IOS_CLIENT_ID = process.env.GOOGLE_IOS_CLIENT_ID || '665328889617-1a8v62hq6j6iu9ju323dgjol7e0b721p.apps.googleusercontent.com';
const GOOGLE_CLIENT_IDS = [GOOGLE_CLIENT_ID, GOOGLE_IOS_CLIENT_ID].filter(Boolean);
if (!GOOGLE_CLIENT_ID) {
  console.warn('WARNING: GOOGLE_CLIENT_ID not set. Google OAuth login will be unavailable.');
}
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const router = express.Router();

// Token expiration configuration
// SECURITY FIX: reduced from 30d back to 7d — long-lived access tokens defeat
// revocation. PWA persistence is handled by the 90-day refresh token instead.
const ACCESS_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_EXPIRY_DAYS = 90; // Refresh tokens last 90 days

// HIGH-04: Account lockout tracking with Redis support.
// SECURITY FIX: the fallback when REDIS_URL is unset is now DB-backed
// (failedLoginCount/lockedUntil on User) instead of an in-memory Map that
// reset on every deploy/restart. Same policy on both paths: 5 attempts,
// 15-minute lockout window. The DB fallback only tracks real accounts
// (non-existent emails still get the enumeration-safe 401 and are covered by
// the per-IP authLimiter in index.js).
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 15 * 60; // 15 minutes

let redisClient = null;

// Initialize Redis if configured
if (process.env.REDIS_URL) {
  try {
    const Redis = require('ioredis');
    redisClient = new Redis(process.env.REDIS_URL);
    redisClient.on('error', (err) => {
      logger.error('Redis connection error', { error: err.message });
    });
    redisClient.on('connect', () => {
      logger.info('Redis connected for account lockout');
    });
  } catch (err) {
    logger.warn('Redis not available, using database-backed lockout', { error: err.message });
  }
}

async function checkAccountLockout(prisma, email) {
  const normalizedEmail = email.toLowerCase();
  const key = `lockout:${normalizedEmail}`;

  if (redisClient) {
    try {
      const lockUntil = await redisClient.get(`${key}:locked`);
      if (lockUntil && parseInt(lockUntil) > Date.now()) {
        return true;
      }
      return false;
    } catch (err) {
      logger.error('Redis lockout check failed, using database', { error: err.message });
    }
  }

  // Fallback to database
  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { lockedUntil: true }
    });
    return !!(user?.lockedUntil && user.lockedUntil > new Date());
  } catch (err) {
    logger.error('DB lockout check failed', { error: err.message });
    return false;
  }
}

async function recordFailedAttempt(prisma, email) {
  const normalizedEmail = email.toLowerCase();
  const key = `lockout:${normalizedEmail}`;

  if (redisClient) {
    try {
      const count = await redisClient.incr(`${key}:count`);
      // Set TTL on count key so it auto-expires
      await redisClient.expire(`${key}:count`, LOCKOUT_DURATION_SECONDS);

      if (count >= MAX_FAILED_ATTEMPTS) {
        const lockUntil = Date.now() + (LOCKOUT_DURATION_SECONDS * 1000);
        await redisClient.setex(`${key}:locked`, LOCKOUT_DURATION_SECONDS, lockUntil.toString());
        logger.warn('Account locked due to too many failed login attempts', { email });
      }
      return;
    } catch (err) {
      logger.error('Redis lockout record failed, using database', { error: err.message });
    }
  }

  // Fallback to database — sliding 15-minute window on the User row
  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { failedLoginCount: true, lastFailedLoginAt: true }
    });
    if (!user) return; // non-existent accounts are handled by the per-IP limiter

    const now = Date.now();
    const windowExpired = !user.lastFailedLoginAt ||
      (now - user.lastFailedLoginAt.getTime()) > LOCKOUT_DURATION_SECONDS * 1000;
    const count = windowExpired ? 1 : (user.failedLoginCount || 0) + 1;

    const data = { failedLoginCount: count, lastFailedLoginAt: new Date(now) };
    if (count >= MAX_FAILED_ATTEMPTS) {
      data.lockedUntil = new Date(now + LOCKOUT_DURATION_SECONDS * 1000);
      logger.warn('Account locked due to too many failed login attempts', { email });
    }

    // updateMany so a concurrently-deleted user doesn't throw P2025
    await prisma.user.updateMany({ where: { email: normalizedEmail }, data });
  } catch (err) {
    logger.error('DB lockout record failed', { error: err.message });
  }
}

async function clearFailedAttempts(prisma, email) {
  const normalizedEmail = email.toLowerCase();
  const key = `lockout:${normalizedEmail}`;

  if (redisClient) {
    try {
      await redisClient.del(`${key}:count`, `${key}:locked`);
      return;
    } catch (err) {
      logger.error('Redis lockout clear failed, using database', { error: err.message });
    }
  }

  // Fallback to database
  try {
    await prisma.user.updateMany({
      where: { email: normalizedEmail },
      data: { failedLoginCount: 0, lastFailedLoginAt: null, lockedUntil: null }
    });
  } catch (err) {
    logger.error('DB lockout clear failed', { error: err.message });
  }
}

// WebAuthn configuration
// WebAuthn configuration - production defaults for loverescue.app
const isProduction = process.env.NODE_ENV === 'production';
const rpName = process.env.WEBAUTHN_RP_NAME || 'Love Rescue';
const rpID = process.env.WEBAUTHN_RP_ID || (isProduction ? 'loverescue.app' : 'localhost');
const origin = process.env.WEBAUTHN_ORIGIN || (isProduction ? 'https://loverescue.app' : 'http://localhost:3000');

/**
 * Generate access and refresh tokens for a user.
 * tokenVersion is embedded in the access token so the auth middleware can
 * reject tokens issued before a password change/reset or logout.
 */
async function generateTokenPair(userId, prisma, tokenVersion = 0) {
  const accessToken = jwt.sign(
    { userId, tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY, algorithm: 'HS256' }
  );

  // Generate a secure refresh token
  const refreshToken = crypto.randomBytes(64).toString('hex');
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  // Store refresh token in database
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await prisma.token.create({
    data: {
      email: `user:${userId}`, // Using email field to store user reference
      token: refreshTokenHash,
      type: 'refresh_token',
      expiresAt
    }
  });

  return { accessToken, refreshToken };
}

/**
 * Revoke every session for a user: bump tokenVersion (kills all outstanding
 * access tokens at the middleware check) and mark all refresh tokens used
 * (so no new access tokens can be minted). Used on password change/reset
 * and logout.
 *
 * Returns the user's new tokenVersion so a caller that wants to keep the
 * CURRENT session alive (e.g. change-password) can immediately mint a fresh
 * token pair carrying the incremented version.
 */
async function revokeAllSessions(userId, prisma) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
    select: { tokenVersion: true }
  });
  await prisma.token.updateMany({
    where: {
      email: `user:${userId}`, // refresh tokens store the user reference here
      type: 'refresh_token',
      usedAt: null
    },
    data: { usedAt: new Date() }
  });
  return updated?.tokenVersion ?? null;
}

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

    // Create user — new users start on a free trial (default 14 days).
    const trialDays = parseInt(process.env.TRIAL_DAYS || '14', 10);
    const trialEndsAt = new Date(Date.now() + (Number.isFinite(trialDays) ? trialDays : 14) * 24 * 60 * 60 * 1000);
    const user = await req.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        gender: gender || null,
        subscriptionStatus: 'trial',
        trialEndsAt,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        gender: true,
        subscriptionStatus: true,
        trialEndsAt: true
      }
    });

    // Create relationship (solo start)
    await req.prisma.relationship.create({
      data: {
        user1Id: user.id,
        inviteCode: uuidv4().substring(0, 8).toUpperCase()
      }
    });

    // Generate token pair
    const { accessToken, refreshToken } = await generateTokenPair(user.id, req.prisma);

    logger.info('User signed up', { userId: user.id });

    res.status(201).json({
      message: 'Account created successfully',
      user,
      token: accessToken,
      refreshToken
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

    // HIGH-04: Check account lockout (Redis if configured, otherwise DB-backed)
    if (await checkAccountLockout(req.prisma, normalizedEmail)) {
      return res.status(429).json({ error: 'Account temporarily locked due to too many failed attempts. Try again in 15 minutes.' });
    }

    const user = await req.prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      // Don't reveal whether account exists
      await recordFailedAttempt(req.prisma, normalizedEmail);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.passwordHash) {
      // Don't reveal auth provider to avoid account enumeration
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      await recordFailedAttempt(req.prisma, normalizedEmail);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Clear failed attempts on successful login
    await clearFailedAttempts(req.prisma, normalizedEmail);

    // Generate token pair
    const { accessToken, refreshToken } = await generateTokenPair(user.id, req.prisma, user.tokenVersion ?? 0);

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
      token: accessToken,
      refreshToken
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
        audience: GOOGLE_CLIENT_IDS,
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
        user = await req.prisma.user.create({
          data: {
            email: email.toLowerCase(),
            googleId,
            authProvider: 'google',
            firstName: given_name || null,
            lastName: family_name || null,
            subscriptionStatus: 'trial',
            trialEndsAt: trialStart(),
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

    // Generate token pair
    const { accessToken, refreshToken } = await generateTokenPair(user.id, req.prisma, user.tokenVersion ?? 0);

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
      token: accessToken,
      refreshToken,
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

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await req.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user || !user.biometricKeyId) {
      // MED: enumeration-safe — same generic error whether the account is
      // missing or simply has no biometrics (mirrors the password login path).
      // Endpoint is also behind authLimiter in index.js.
      return res.status(401).json({ error: 'Invalid credentials' });
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
        counter: user.biometricCounter || 0
      }
    });

    if (!verification.verified) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    // Update the counter to prevent replay attacks
    const newCounter = verification.authenticationInfo.newCounter;
    await req.prisma.user.update({
      where: { id: user.id },
      data: { biometricCounter: newCounter }
    });

    await req.prisma.token.update({
      where: { id: challengeRecord.id },
      data: { usedAt: new Date() }
    });

    // Generate token pair
    const { accessToken, refreshToken } = await generateTokenPair(user.id, req.prisma, user.tokenVersion ?? 0);

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
      token: accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Hash the provided token for comparison
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Find valid refresh token
    const tokenRecord = await req.prisma.token.findFirst({
      where: {
        token: refreshTokenHash,
        type: 'refresh_token',
        usedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    if (!tokenRecord) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Extract userId from email field (stored as "user:userId")
    const userId = tokenRecord.email.replace('user:', '');

    // Find user
    const user = await req.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Mark old refresh token as used
    await req.prisma.token.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() }
    });

    // Generate new token pair (token rotation for security)
    const { accessToken, refreshToken: newRefreshToken } = await generateTokenPair(user.id, req.prisma, user.tokenVersion ?? 0);

    logger.info('Token refreshed', { userId: user.id });

    res.json({
      token: accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        gender: user.gender,
        subscriptionStatus: user.subscriptionStatus
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/biometric-status
 * Check if user has biometrics registered
 */
router.get('/biometric-status', authenticate, async (req, res, next) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { biometricKeyId: true }
    });

    res.json({
      biometricEnabled: !!user?.biometricKeyId
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

    // Send invite email if partner email provided
    const inviteLink = `${process.env.FRONTEND_URL}/join/${inviteCode}`;
    if (partnerEmail) {
      const inviterName = req.user.firstName || req.user.email.split('@')[0];
      await sendPartnerInviteEmail(partnerEmail, inviterName, inviteLink);
    }

    logger.info('Partner invited', { userId: req.user.id, inviteCode, emailSent: !!partnerEmail });

    res.json({
      message: 'Invite created',
      inviteCode,
      inviteLink
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

    // Joining is a mutual opt-in (one partner invited, the other accepted), so
    // it establishes partner-to-partner data sharing (sharedConsent) — the gate
    // for assessment comparison and partner reports. Therapist access remains a
    // separate, explicit consent (user1/user2TherapistConsent).
    await req.prisma.relationship.update({
      where: { id: relationship.id },
      data: {
        user2Id: req.user.id,
        inviteCode: null, // Clear code after use
        sharedConsent: true
      }
    });

    await req.prisma.consentLog.create({
      data: {
        userId: req.user.id,
        relationshipId: relationship.id,
        consentType: 'partner_sharing',
        granted: true,
        ipAddress: req.ip
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
        role: true,
        subscriptionStatus: true,
        subscriptionSource: true,
        appleExpiresAt: true,
        authProvider: true,
        trialEndsAt: true,
        isPlatformAdmin: true,
        createdAt: true
      }
    });

    // Update lastActiveAt
    await req.prisma.user.update({
      where: { id: req.user.id },
      data: { lastActiveAt: new Date() }
    }).catch(() => {}); // Non-blocking

    const relationship = await req.prisma.relationship.findFirst({
      where: {
        OR: [
          { user1Id: req.user.id },
          { user2Id: req.user.id }
        ],
        status: 'active'
      },
      include: {
        user1: { select: { id: true, firstName: true, lastName: true, lastActiveAt: true } },
        user2: { select: { id: true, firstName: true, lastName: true, lastActiveAt: true } }
      }
    });

    // Partner presence: did they check in today, and when were they last seen?
    // The dashboard's PartnerPulse renders these; without them every partner
    // shows as permanently inactive.
    let partnerLoggedToday = false;
    let partnerLastActive = null;
    if (relationship && relationship.user2Id) {
      const partnerRecord = relationship.user1Id === req.user.id ? relationship.user2 : relationship.user1;
      partnerLastActive = partnerRecord.lastActiveAt || null;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      let partnerLog = null;
      try {
        partnerLog = await req.prisma.dailyLog.findFirst({
          where: { userId: partnerRecord.id, createdAt: { gte: todayStart } },
          select: { id: true }
        });
      } catch (_e) { partnerLog = null; }
      partnerLoggedToday = !!partnerLog;
    }

    // Report the user's REAL entitlement (couple-aware: an active trial, a
    // paid/premium plan, or partner coverage). Never force-premium — the
    // client's feature gating reads this.
    const entitlement = await resolveEntitlement(req.prisma, user);
    const journey = await computeJourney(req.prisma, user, relationship);
    const { subscriptionSource: _src, appleExpiresAt: _exp, ...safeUser } = user;
    res.json({
      journey,
      user: {
        ...safeUser,
        subscriptionStatus: entitlement.status,
        tier: entitlement.tier,
        isEntitled: entitlement.isEntitled,
        isTrial: entitlement.isTrial,
        trialDaysRemaining: entitlement.trialDaysRemaining,
        coveredByPartner: entitlement.coveredByPartner
      },
      relationship: relationship ? {
        id: relationship.id,
        hasPartner: !!relationship.user2Id,
        inviteCode: relationship.inviteCode,
        partner: (() => {
          const p = relationship.user1Id === req.user.id ? relationship.user2 : relationship.user1;
          if (!p) return p;
          const { lastActiveAt: _la, ...publicPartner } = p;
          return publicPartner;
        })(),
        partnerLoggedToday,
        partnerLastActive
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

    // Revoke every OTHER session — old access tokens die at the tokenVersion
    // check and outstanding refresh tokens can no longer be redeemed. This
    // also invalidates the access/refresh tokens on THIS device, so we
    // immediately mint a fresh pair carrying the new tokenVersion to keep the
    // current session alive (the user shouldn't be logged out of the device
    // they just used to change their password).
    const newTokenVersion = await revokeAllSessions(req.user.id, req.prisma);
    const { accessToken, refreshToken } = await generateTokenPair(
      req.user.id,
      req.prisma,
      newTokenVersion ?? 0
    );

    logger.info('Password changed', { userId: req.user.id });

    res.json({
      message: 'Password changed successfully. Please log in again on your other devices.',
      token: accessToken,
      refreshToken
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Revoke the presented refresh token and invalidate all outstanding access
 * tokens (bumps tokenVersion → global logout across devices).
 */
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    // Revoke the presented refresh token first (best effort)
    if (refreshToken) {
      const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await req.prisma.token.updateMany({
        where: {
          token: refreshTokenHash,
          type: 'refresh_token',
          usedAt: null
        },
        data: { usedAt: new Date() }
      });
    }

    // Bump tokenVersion + revoke all remaining refresh tokens. This is a
    // global logout: 7-day access tokens are otherwise irrevocable, so logout
    // must invalidate them everywhere, not just discard the local copy.
    await revokeAllSessions(req.user.id, req.prisma);

    logger.info('User logged out', { userId: req.user.id });

    res.json({ message: 'Logged out successfully' });
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
 * GET /api/auth/export-data
 * HIPAA right-of-access: export all user data as JSON
 */
router.get('/export-data', authenticate, async (req, res, next) => {
  try {
    // MED FIX: the previous include referenced non-existent `goals`/`strategies`
    // relations on User (goals live on Relationship as SharedGoal; the user
    // relation is sharedGoalsCreated) — every export 500'd. Includes below
    // match the actual schema and add the user-owned content that was missing
    // (Real Talk entries, assigned tasks, course progress, video completions,
    // consent logs, notification preferences).
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        assessments: true,
        dailyLogs: true,
        gratitudeEntries: true,
        realTalks: true,
        sharedGoalsCreated: true,
        assignedTasks: true,
        courseProgress: { include: { weeklyStrategies: true } },
        videoCompletions: true,
        consentLogs: true,
        notificationPreferences: true,
        pushSubscriptions: { select: { id: true, createdAt: true } },
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Strip sensitive/internal fields from the profile
    const {
      passwordHash, stripeCustomerId, biometricKey, biometricKeyId,
      biometricCounter, appleReceiptData, tokenVersion, failedLoginCount,
      lastFailedLoginAt, lockedUntil,
      assessments, dailyLogs, gratitudeEntries, realTalks, sharedGoalsCreated,
      assignedTasks, courseProgress, videoCompletions, consentLogs,
      notificationPreferences, pushSubscriptions,
      ...profile
    } = user;

    logger.info('Data export requested', { userId: req.user.id });

    res.setHeader('Content-Disposition', `attachment; filename="loverescue-data-export-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json({
      exportedAt: new Date().toISOString(),
      profile,
      assessments,
      dailyLogs,
      gratitudeEntries,
      realTalkEntries: realTalks,
      goalsCreated: sharedGoalsCreated,
      therapistTasks: assignedTasks,
      courseProgress,
      videoCompletions,
      consentLogs,
      notificationPreferences,
      pushSubscriptions
    });
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
      // Generate a 6-digit reset code. 6 digits stays for UX: codes are now
      // scoped to the email, capped at 5 verification attempts, expire in 1h,
      // and sit behind the per-IP authLimiter — brute force is infeasible.
      const resetCode = crypto.randomInt(100000, 999999).toString();

      // Invalidate any previous unused codes — only the latest one works
      await req.prisma.token.deleteMany({
        where: {
          email: normalizedEmail,
          type: 'password_reset',
          usedAt: null
        }
      });

      await req.prisma.token.create({
        data: {
          email: normalizedEmail,
          token: resetCode,
          type: 'password_reset',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour expiry
        }
      });

      // Send password reset email
      const emailSent = await sendPasswordResetEmail(normalizedEmail, resetCode);
      
      logger.info('Password reset token generated', {
        email: normalizedEmail,
        emailSent,
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
    const { email, token: resetToken, newPassword } = req.body;

    // SECURITY FIX: codes are looked up scoped to the submitted email (a code
    // is only valid for the account it was issued to), never globally by value.
    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ error: 'Email, reset token, and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const normalizedEmail = email.toLowerCase();
    const MAX_RESET_ATTEMPTS = 5;

    // Find the latest unused, unexpired reset code for THIS email
    const tokenRecord = await req.prisma.token.findFirst({
      where: {
        email: normalizedEmail,
        type: 'password_reset',
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!tokenRecord || (tokenRecord.attempts ?? 0) >= MAX_RESET_ATTEMPTS) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Constant-time comparison of the submitted code
    const expected = Buffer.from(tokenRecord.token);
    const provided = Buffer.from(String(resetToken));
    const codeMatches = expected.length === provided.length &&
      crypto.timingSafeEqual(expected, provided);

    if (!codeMatches) {
      // Count the failed attempt; invalidate the code after 5 wrong tries
      const attempts = (tokenRecord.attempts ?? 0) + 1;
      await req.prisma.token.update({
        where: { id: tokenRecord.id },
        data: {
          attempts,
          ...(attempts >= MAX_RESET_ATTEMPTS && { usedAt: new Date() })
        }
      });
      if (attempts >= MAX_RESET_ATTEMPTS) {
        logger.warn('Password reset code invalidated after too many attempts', { email: normalizedEmail });
      }
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Find user
    const user = await req.prisma.user.findUnique({
      where: { email: normalizedEmail }
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

    // Revoke every existing session — an attacker who had the old password
    // (or a stolen token) is locked out once the reset completes.
    await revokeAllSessions(user.id, req.prisma);

    // Mark token as used
    await req.prisma.token.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() }
    });

    // Delete any other unused reset tokens for this email
    await req.prisma.token.deleteMany({
      where: {
        email: normalizedEmail,
        type: 'password_reset',
        usedAt: null
      }
    });

    // Clear any lockout
    await clearFailedAttempts(req.prisma, normalizedEmail);

    logger.info('Password reset completed', { userId: user.id });

    res.json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/apple
 * Authenticate with Apple ID token (Sign In with Apple)
 */
router.post('/apple', async (req, res, next) => {
  try {
    const { identityToken, fullName } = req.body;

    if (!identityToken) {
      return res.status(400).json({ error: 'Apple identity token is required' });
    }

    // Decode and verify Apple ID token
    const jose = require('jose');
    const JWKS = jose.createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
    
    let payload;
    try {
      const { payload: verified } = await jose.jwtVerify(identityToken, JWKS, {
        issuer: 'https://appleid.apple.com',
        audience: 'com.gullstack.loverescue',
      });
      payload = verified;
    } catch (err) {
      console.error('Apple token verification failed:', err.message);
      return res.status(401).json({ error: 'Invalid Apple token' });
    }

    const { sub: appleId, email, email_verified } = payload;

    // Look up by appleId first
    let user = await req.prisma.user.findFirst({
      where: { googleId: `apple_${appleId}` }
    });

    if (!user && email) {
      // Check if email exists
      user = await req.prisma.user.findUnique({ where: { email } });
      if (user) {
        // Link Apple account to existing user
        await req.prisma.user.update({
          where: { id: user.id },
          data: { googleId: `apple_${appleId}` }
        });
      }
    }

    const isNewUser = !user;

    if (!user) {
      // Create new user — starts on the standard free trial
      user = await req.prisma.user.create({
        data: {
          email: email || `apple_${appleId}@privaterelay.appleid.com`,
          passwordHash: crypto.randomBytes(32).toString('hex'),
          googleId: `apple_${appleId}`,
          firstName: fullName?.firstName || 'User',
          lastName: fullName?.lastName || '',
          authProvider: 'apple',
          emailVerified: !!email_verified,
          subscriptionStatus: 'trial',
          trialEndsAt: trialStart(),
        }
      });
    }

    // Generate tokens using same function as other auth methods
    const { accessToken, refreshToken } = await generateTokenPair(user.id, req.prisma, user.tokenVersion ?? 0);

    res.json({
      token: accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
      isNewUser,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
