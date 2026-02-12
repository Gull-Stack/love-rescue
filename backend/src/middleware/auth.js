const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

// Validate JWT_SECRET is configured
if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set. Server cannot start securely.');
}

/**
 * JWT authentication middleware
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

    // Fetch user from database
    const user = await req.prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        subscriptionStatus: true,
        stripeCustomerId: true,
        isPlatformAdmin: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    logger.error('Auth middleware error', { error: error.message });
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Check subscription status middleware
 */
const requireSubscription = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.subscriptionStatus === 'expired') {
    return res.status(403).json({
      error: 'Subscription expired',
      code: 'SUBSCRIPTION_EXPIRED'
    });
  }

  next();
};

/**
 * Optional authentication - sets req.user if token present, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

      const user = await req.prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          subscriptionStatus: true
        }
      });

      if (user) {
        req.user = user;
      }
    }
  } catch (error) {
    // Silently ignore auth errors for optional auth
  }

  next();
};

/**
 * Check premium subscription status middleware
 */
const requirePremium = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.subscriptionStatus !== 'premium') {
    return res.status(403).json({
      error: 'Premium subscription required',
      code: 'PREMIUM_REQUIRED'
    });
  }

  next();
};

/**
 * Role-based access control middleware
 * @param {...string} roles - Allowed roles
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'ROLE_REQUIRED'
      });
    }

    next();
  };
};

/**
 * Platform admin middleware
 * Checks if user is a platform admin by isPlatformAdmin flag or email allowlist
 */
// SECURITY FIX: No hardcoded admin emails — must be configured via PLATFORM_ADMIN_EMAILS env var
// If empty, admin access is restricted to users with isPlatformAdmin flag in the database only
const PLATFORM_ADMIN_EMAILS = (process.env.PLATFORM_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
if (PLATFORM_ADMIN_EMAILS.length === 0) {
  logger.warn('PLATFORM_ADMIN_EMAILS env var is empty — admin access limited to isPlatformAdmin flag only');
}

const requirePlatformAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const isAdmin = req.user.isPlatformAdmin || PLATFORM_ADMIN_EMAILS.includes(req.user.email.toLowerCase());
  
  if (!isAdmin) {
    logger.warn('Unauthorized admin access attempt', { userId: req.user.id, email: req.user.email });
    return res.status(403).json({
      error: 'Platform admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }

  next();
};

/**
 * Authenticate therapist via API key (hashed, DB-backed)
 * Sets req.therapist with the therapist record
 */
const authenticateTherapist = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-therapist-api-key'];

    if (!apiKey) {
      return res.status(401).json({ error: 'Therapist API key required' });
    }

    // Find all active therapists and check key against hashes
    const therapists = await req.prisma.therapist.findMany({
      where: { isActive: true, apiKeyHash: { not: null } }
    });

    let matchedTherapist = null;
    for (const therapist of therapists) {
      const isMatch = await bcrypt.compare(apiKey, therapist.apiKeyHash);
      if (isMatch) {
        matchedTherapist = therapist;
        break;
      }
    }

    if (!matchedTherapist) {
      // Legacy plain-text API key fallback removed for security (was THERAPIST_API_KEY env var)
      return res.status(403).json({ error: 'Invalid API key' });
    }

    req.therapist = matchedTherapist;
    next();
  } catch (error) {
    logger.error('Therapist auth error', { error: error.message });
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Verify therapist is assigned to the requested couple
 * Must be used after authenticateTherapist
 * Expects req.params.relationshipId
 */
const requireTherapistAssignment = async (req, res, next) => {
  try {
    const relationshipId = req.params.relationshipId || req.body.relationshipId;

    if (!relationshipId) {
      return res.status(400).json({ error: 'Relationship ID required' });
    }

    if (req.therapist.id === 'legacy') {
      // Legacy key has global access (backward compatible)
      return next();
    }

    const assignment = await req.prisma.therapistAssignment.findFirst({
      where: {
        therapistId: req.therapist.id,
        relationshipId,
        status: 'active'
      }
    });

    if (!assignment) {
      // Log denied access
      await req.prisma.accessLog.create({
        data: {
          accessorId: req.therapist.id,
          accessorRole: 'therapist',
          resourceType: 'couple_data',
          resourceId: relationshipId,
          action: 'read',
          accessGranted: false,
          reason: 'Not assigned to couple',
          ipAddress: req.ip
        }
      });
      return res.status(403).json({ error: 'Not assigned to this couple' });
    }

    req.assignment = assignment;
    next();
  } catch (error) {
    logger.error('Assignment check error', { error: error.message });
    return res.status(500).json({ error: 'Authorization check failed' });
  }
};

/**
 * Verify both partners have consented to therapist access
 * Must be used after authenticate or authenticateTherapist
 * Loads relationship into req.relationship
 */
const requireBothConsent = async (req, res, next) => {
  try {
    const relationshipId = req.params.relationshipId || req.body.relationshipId;

    const relationship = await req.prisma.relationship.findUnique({
      where: { id: relationshipId }
    });

    if (!relationship) {
      return res.status(404).json({ error: 'Relationship not found' });
    }

    if (!relationship.user1TherapistConsent || !relationship.user2TherapistConsent) {
      return res.status(403).json({
        error: 'Both partners must consent to therapist access',
        code: 'CONSENT_REQUIRED',
        user1Consented: relationship.user1TherapistConsent,
        user2Consented: relationship.user2TherapistConsent
      });
    }

    req.relationship = relationship;
    next();
  } catch (error) {
    logger.error('Consent check error', { error: error.message });
    return res.status(500).json({ error: 'Consent verification failed' });
  }
};

/**
 * Load user's relationship into req.relationship
 * Returns 404 if no relationship found
 */
const loadRelationship = async (req, res, next) => {
  try {
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
      return res.status(404).json({ error: 'No active relationship found' });
    }

    req.relationship = relationship;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticate,
  requireSubscription,
  requirePremium,
  optionalAuth,
  requireRole,
  requirePlatformAdmin,
  authenticateTherapist,
  requireTherapistAssignment,
  requireBothConsent,
  loadRelationship,
  PLATFORM_ADMIN_EMAILS
};
