/**
 * @fileoverview Integration API authentication middleware for external partners (e.g., SuperTool).
 * Handles API key validation, rate limiting, HIPAA audit logging, and IP allowlisting.
 *
 * @module middleware/integrationAuth
 */

'use strict';

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// C3 fix: require dedicated INTEGRATION_JWT_SECRET — never fall back to JWT_SECRET
if (!process.env.INTEGRATION_JWT_SECRET) {
  throw new Error(
    'FATAL: INTEGRATION_JWT_SECRET environment variable is required. ' +
    'Do NOT reuse JWT_SECRET for integration tokens.'
  );
}
const INTEGRATION_JWT_SECRET = process.env.INTEGRATION_JWT_SECRET;

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY RATE LIMITER (per API key)
// ═══════════════════════════════════════════════════════════════

const rateLimitStore = new Map(); // key: partnerId → { count, windowStart }

/**
 * Simple sliding-window rate limiter per partner.
 * @param {string} partnerId
 * @param {number} maxPerMinute
 * @returns {{ allowed: boolean, remaining: number, resetAt: Date }}
 */
function checkRateLimit(partnerId, maxPerMinute) {
  const now = Date.now();
  const windowMs = 60 * 1000;

  let entry = rateLimitStore.get(partnerId);
  if (!entry || now - entry.windowStart > windowMs) {
    entry = { count: 0, windowStart: now };
    rateLimitStore.set(partnerId, entry);
  }

  entry.count++;
  const remaining = Math.max(0, maxPerMinute - entry.count);
  const resetAt = new Date(entry.windowStart + windowMs);

  return {
    allowed: entry.count <= maxPerMinute,
    remaining,
    resetAt,
  };
}

// ═══════════════════════════════════════════════════════════════
// HIPAA AUDIT LOGGING
// ═══════════════════════════════════════════════════════════════

/**
 * Log integration API access for HIPAA compliance.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {Object} params
 */
async function logIntegrationAccess(prisma, { partnerId, endpoint, clientId, responseCode, ipAddress }) {
  try {
    await prisma.integrationAccessLog.create({
      data: {
        partnerId,
        endpoint,
        clientId: clientId || null,
        responseCode,
        ipAddress: ipAddress || null,
      },
    });
  } catch (err) {
    // Never let audit logging failures break the request
    logger.error('Failed to write integration access log', { err: err.message, partnerId, endpoint });
  }
}

// ═══════════════════════════════════════════════════════════════
// INTEGRATION TOKEN AUTH (Bearer token from /auth endpoint)
// ═══════════════════════════════════════════════════════════════

/**
 * Middleware: validates integration Bearer token (JWT issued by POST /api/integration/auth).
 * Attaches `req.integrationPartner` and `req.integrationTherapist`.
 */
function authenticateIntegration(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, INTEGRATION_JWT_SECRET, {
      algorithms: ['HS256'],
    });

    if (decoded.type !== 'integration') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    req.integrationPartner = {
      id: decoded.partnerId,
      name: decoded.partnerName,
    };
    req.integrationTherapist = {
      id: decoded.therapistId,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Integration token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid integration token' });
  }
}

// ═══════════════════════════════════════════════════════════════
// RATE LIMIT + IP ALLOWLIST MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

/**
 * Middleware: rate limiting and IP allowlisting for integration partners.
 * Must run AFTER authenticateIntegration (needs req.integrationPartner).
 */
function integrationRateLimit(req, res, next) {
  const partner = req.integrationPartner;
  if (!partner) {
    return res.status(500).json({ error: 'Integration auth must run before rate limit' });
  }

  // Rate limit — default 100/min, overridable per partner
  const limit = partner.rateLimitPerMin || 100;
  const { allowed, remaining, resetAt } = checkRateLimit(partner.id, limit);

  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', resetAt.toISOString());

  if (!allowed) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil((resetAt.getTime() - Date.now()) / 1000),
    });
  }

  next();
}

/**
 * Middleware: IP allowlist check (optional — only enforced if partner has ipAllowlist set).
 */
async function checkIpAllowlist(req, res, next) {
  const partner = req.integrationPartner;
  if (!partner) return next();

  try {
    const fullPartner = await req.prisma.integrationPartner.findUnique({
      where: { id: partner.id },
      select: { ipAllowlist: true, rateLimitPerMin: true },
    });

    if (!fullPartner) {
      return res.status(401).json({ error: 'Integration partner not found' });
    }

    // Attach rate limit from DB
    req.integrationPartner.rateLimitPerMin = fullPartner.rateLimitPerMin;

    // IP allowlist check
    if (fullPartner.ipAllowlist && fullPartner.ipAllowlist.length > 0) {
      const clientIp = req.ip || req.connection?.remoteAddress;
      if (!fullPartner.ipAllowlist.includes(clientIp)) {
        logger.warn('Integration request from non-allowlisted IP', {
          partnerId: partner.id,
          ip: clientIp,
          allowlist: fullPartner.ipAllowlist,
        });
        return res.status(403).json({ error: 'IP address not in allowlist' });
      }
    }

    next();
  } catch (err) {
    logger.error('IP allowlist check failed', { err: err.message });
    // H3 fix: fail closed — IP allowlisting is a security control
    return res.status(503).json({ error: 'Security check unavailable — request denied' });
  }
}

// ═══════════════════════════════════════════════════════════════
// AUDIT RESPONSE WRAPPER
// ═══════════════════════════════════════════════════════════════

/**
 * Middleware: wraps res.json to automatically log integration access.
 */
function auditIntegrationResponse(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    // Fire-and-forget audit log
    if (req.integrationPartner) {
      logIntegrationAccess(req.prisma, {
        partnerId: req.integrationPartner.id,
        endpoint: `${req.method} ${req.originalUrl}`,
        clientId: req.params?.id || null,
        responseCode: res.statusCode,
        ipAddress: req.ip,
      });
    }
    return originalJson(body);
  };

  next();
}

// ═══════════════════════════════════════════════════════════════
// COMBINED MIDDLEWARE STACK
// ═══════════════════════════════════════════════════════════════

/**
 * Full integration middleware stack (H2 fix — rate limit before DB-hitting IP check):
 * 1. Authenticate integration token (cheap JWT verify)
 * 2. Rate limit (in-memory, cheap)
 * 3. Check IP allowlist (DB query)
 * 4. Audit logging wrapper
 */
const integrationMiddleware = [
  authenticateIntegration,
  integrationRateLimit,
  checkIpAllowlist,
  auditIntegrationResponse,
];

module.exports = {
  authenticateIntegration,
  integrationRateLimit,
  checkIpAllowlist,
  auditIntegrationResponse,
  logIntegrationAccess,
  integrationMiddleware,
};
