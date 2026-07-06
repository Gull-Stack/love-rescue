const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const { resolveEntitlement } = require('../lib/entitlement');

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
        subscriptionSource: true,
        appleExpiresAt: true,
        trialEndsAt: true,
        stripeCustomerId: true,
        isPlatformAdmin: true,
        tokenVersion: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Session revocation: reject tokens issued before the last password
    // change/reset or logout. Legacy tokens without the claim are treated as
    // version 0 (grace period) — they die as soon as the user's tokenVersion
    // is bumped for the first time.
    const tokenVersion = decoded.tokenVersion ?? 0;
    if (tokenVersion !== (user.tokenVersion ?? 0)) {
      return res.status(401).json({ error: 'Token revoked', code: 'TOKEN_REVOKED' });
    }

    // Expose the REAL subscription status from the DB (no force-premium
    // override). Resolve couple-aware entitlement once and hang it off req so
    // downstream gates/routes reuse it without re-querying. The partner lookup
    // inside resolveEntitlement only runs when the user is not already
    // self-entitled, so the common path adds no query.
    const { tokenVersion: _tv, ...safeUser } = user;
    req.user = safeUser;
    req.entitlement = await resolveEntitlement(req.prisma, safeUser);
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
 * requireSubscription — real gate. Allows through any user who is entitled
 * under the couple-aware model (own active subscription, own live trial, or a
 * partner who is entitled). Otherwise 402 Payment Required.
 *
 * Reuses req.entitlement computed by authenticate; falls back to resolving it
 * if the middleware is used standalone.
 */
const requireSubscription = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const entitlement = req.entitlement || await resolveEntitlement(req.prisma, req.user);
    req.entitlement = entitlement;

    if (!entitlement.isEntitled) {
      return res.status(402).json({
        error: 'An active subscription is required to access this feature',
        code: 'SUBSCRIPTION_REQUIRED'
      });
    }

    next();
  } catch (error) {
    logger.error('requireSubscription error', { error: error.message });
    return res.status(500).json({ error: 'Subscription check failed' });
  }
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
          subscriptionStatus: true,
          subscriptionSource: true,
          appleExpiresAt: true,
          trialEndsAt: true,
          tokenVersion: true
        }
      });

      // Same revocation check as authenticate (missing claim = legacy version 0)
      if (user && (decoded.tokenVersion ?? 0) === (user.tokenVersion ?? 0)) {
        const { tokenVersion: _tv, ...safeUser } = user;
        req.user = safeUser;
      }
    }
  } catch (error) {
    // Silently ignore auth errors for optional auth
  }

  next();
};

/**
 * requirePremium — real gate. Requires an entitled user whose effective tier
 * is 'premium' (own premium subscription, or a partner on premium), OR an
 * active trial — the UI and marketing promise a trial full access, so trial
 * users must never hit the premium wall. A user who is entitled only at the
 * 'paid' tier is rejected with 402 PREMIUM_REQUIRED.
 */
const requirePremium = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const entitlement = req.entitlement || await resolveEntitlement(req.prisma, req.user);
    req.entitlement = entitlement;

    if (!entitlement.isEntitled) {
      return res.status(402).json({
        error: 'An active subscription is required to access this feature',
        code: 'SUBSCRIPTION_REQUIRED'
      });
    }

    // Active trials (own or partner's) get full access; only entitled
    // paid-tier users are asked to upgrade.
    if (entitlement.tier !== 'premium' && !entitlement.isTrial) {
      return res.status(402).json({
        error: 'A premium subscription is required to access this feature',
        code: 'PREMIUM_REQUIRED'
      });
    }

    next();
  } catch (error) {
    logger.error('requirePremium error', { error: error.message });
    return res.status(500).json({ error: 'Subscription check failed' });
  }
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
 * Authenticate therapist.
 * Accepts two auth paths (tried in order):
 *   1. Authorization: Bearer <jwt>  — regular user JWT with role === 'therapist'.
 *      Auto-provisions a Therapist record from the User if none exists.
 *   2. x-therapist-api-key header   — legacy hashed API key.
 *
 * Sets req.therapist with the matched Therapist record.
 */
const authenticateTherapist = async (req, res, next) => {
  try {
    // ── Path 1: Bearer JWT (regular user with therapist role) ─────────────
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      let payload;
      try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
      } catch {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const user = await req.prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user || user.role !== 'therapist') {
        return res.status(403).json({ error: 'Therapist access required' });
      }

      // Find or auto-provision the Therapist record keyed by email.
      let therapist = await req.prisma.therapist.findUnique({ where: { email: user.email } });
      if (!therapist) {
        therapist = await req.prisma.therapist.create({
          data: {
            email: user.email,
            firstName: user.firstName || user.email.split('@')[0],
            lastName: user.lastName || '',
            // Placeholder hash — this record is authenticated via User JWT, not its own password.
            passwordHash: await bcrypt.hash(require('crypto').randomBytes(32).toString('hex'), 10),
            isActive: true,
          },
        });
      }

      if (!therapist.isActive) {
        return res.status(403).json({ error: 'Therapist account is inactive' });
      }

      req.therapist = therapist;
      return next();
    }

    // ── Path 2: x-therapist-api-key header ────────────────────────────────
    const apiKey = req.headers['x-therapist-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'Therapist authentication required' });
    }

    const therapists = await req.prisma.therapist.findMany({
      where: { isActive: true, apiKeyHash: { not: null } },
    });

    let matchedTherapist = null;
    for (const t of therapists) {
      if (await bcrypt.compare(apiKey, t.apiKeyHash)) {
        matchedTherapist = t;
        break;
      }
    }

    if (!matchedTherapist) {
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
