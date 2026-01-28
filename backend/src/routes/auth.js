const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} = require('@simplewebauthn/server');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

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
    const { email, password, firstName, lastName } = req.body;

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
        subscriptionStatus: 'trial',
        trialEndsAt
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
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

    const user = await req.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

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
        subscriptionStatus: user.subscriptionStatus
      },
      token
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

    // Find user's relationship
    const relationship = await req.prisma.relationship.findFirst({
      where: {
        OR: [
          { user1Id: req.user.id },
          { user2Id: req.user.id }
        ]
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
        subscriptionStatus: true,
        trialEndsAt: true,
        createdAt: true
      }
    });

    const relationship = await req.prisma.relationship.findFirst({
      where: {
        OR: [
          { user1Id: req.user.id },
          { user2Id: req.user.id }
        ]
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

module.exports = router;
