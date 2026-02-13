/**
 * @fileoverview Consent-aware data access layer for therapist dashboard.
 * Checks consent status and permission level before returning any client data.
 * Logs every data access for HIPAA audit trail.
 *
 * Permission Levels:
 *   BASIC:    assessment scores + activity completion only
 *   STANDARD: + mood trends + crisis alerts + session prep
 *   FULL:     + individual responses + journal entries + messaging
 */

const logger = require('../utils/logger');

/**
 * Permission level hierarchy — each level includes all lower level permissions
 */
const PERMISSION_HIERARCHY = {
  BASIC: 1,
  STANDARD: 2,
  FULL: 3,
};

/**
 * Data categories mapped to minimum required permission level
 */
const DATA_CATEGORY_PERMISSIONS = {
  assessment_scores: 'BASIC',
  activity_completion: 'BASIC',
  mood_trends: 'STANDARD',
  crisis_alerts: 'STANDARD',
  session_prep: 'STANDARD',
  individual_responses: 'FULL',
  journal_entries: 'FULL',
  messaging: 'FULL',
};

/**
 * Check if a permission level grants access to a data category
 * @param {string} permissionLevel - The therapist's permission level (BASIC|STANDARD|FULL)
 * @param {string} dataCategory - The data category being accessed
 * @returns {boolean}
 */
function hasPermission(permissionLevel, dataCategory) {
  const requiredLevel = DATA_CATEGORY_PERMISSIONS[dataCategory];
  if (!requiredLevel) return false;
  return (PERMISSION_HIERARCHY[permissionLevel] || 0) >= (PERMISSION_HIERARCHY[requiredLevel] || 999);
}

/**
 * Log a data access event for HIPAA audit trail
 * @param {object} prisma - Prisma client instance
 * @param {object} params - Access log parameters
 * @param {string} params.accessorId - Therapist ID
 * @param {string} params.resourceType - Type of resource accessed
 * @param {string} [params.resourceId] - Specific resource ID
 * @param {string} [params.resourceOwnerId] - Client/owner ID
 * @param {string} params.action - Action performed (read|write)
 * @param {boolean} params.accessGranted - Whether access was granted
 * @param {string} [params.reason] - Reason for denial if applicable
 * @param {string} [params.ipAddress] - Request IP
 */
async function logAccess(prisma, params) {
  try {
    await prisma.accessLog.create({
      data: {
        accessorId: params.accessorId,
        accessorRole: 'therapist',
        resourceType: params.resourceType,
        resourceId: params.resourceId || null,
        resourceOwnerId: params.resourceOwnerId || null,
        action: params.action || 'read',
        accessGranted: params.accessGranted,
        reason: params.reason || null,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    // Never let audit logging failure block the request, but always log it
    logger.error('Failed to write access log', { error: error.message, params });
  }
}

/**
 * Middleware factory: require active consent and minimum permission level for a client.
 * Attaches `req.therapistClient` with the link record if authorized.
 *
 * @param {string} [requiredCategory] - Data category that must be permitted (e.g. 'mood_trends').
 *   If omitted, only checks that consent is GRANTED (any level).
 * @returns {Function} Express middleware
 */
function requireClientAccess(requiredCategory) {
  return async (req, res, next) => {
    try {
      const therapistId = req.therapist?.id;
      // Client ID can come from params, query, or body
      const clientId = req.params.id || req.params.clientId || req.query.clientId || req.body.clientId;

      if (!therapistId) {
        return res.status(401).json({ error: 'Therapist authentication required' });
      }

      if (!clientId) {
        return res.status(400).json({ error: 'Client ID is required' });
      }

      // Find the therapist-client link
      const link = await req.prisma.therapistClient.findFirst({
        where: {
          therapistId,
          clientId,
          consentStatus: 'GRANTED',
        },
      });

      if (!link) {
        await logAccess(req.prisma, {
          accessorId: therapistId,
          resourceType: requiredCategory || 'client_data',
          resourceOwnerId: clientId,
          action: 'read',
          accessGranted: false,
          reason: 'No active consent link found',
          ipAddress: req.ip,
        });

        return res.status(403).json({
          error: 'No active consent from this client',
          code: 'CONSENT_REQUIRED',
        });
      }

      // Check permission level if a specific category is required
      if (requiredCategory && !hasPermission(link.permissionLevel, requiredCategory)) {
        await logAccess(req.prisma, {
          accessorId: therapistId,
          resourceType: requiredCategory,
          resourceId: clientId,
          resourceOwnerId: clientId,
          action: 'read',
          accessGranted: false,
          reason: `Permission level ${link.permissionLevel} insufficient for ${requiredCategory}`,
          ipAddress: req.ip,
        });

        return res.status(403).json({
          error: `Your permission level (${link.permissionLevel}) does not include access to ${requiredCategory}`,
          code: 'INSUFFICIENT_PERMISSION',
          currentLevel: link.permissionLevel,
          requiredCategory,
        });
      }

      // Log successful access
      await logAccess(req.prisma, {
        accessorId: therapistId,
        resourceType: requiredCategory || 'client_data',
        resourceId: clientId,
        resourceOwnerId: clientId,
        action: 'read',
        accessGranted: true,
        ipAddress: req.ip,
      });

      // Attach link to request for downstream use
      req.therapistClient = link;
      next();
    } catch (error) {
      logger.error('therapistAccess middleware error', { error: error.message });
      next(error);
    }
  };
}

/**
 * Middleware factory: require access to a couple (via coupleId param).
 * Checks that the therapist has a consented link to at least one partner.
 *
 * @param {string} [requiredCategory] - Data category that must be permitted
 * @returns {Function} Express middleware
 */
function requireCoupleAccess(requiredCategory) {
  return async (req, res, next) => {
    try {
      const therapistId = req.therapist?.id;
      const coupleId = req.params.id || req.params.coupleId || req.query.coupleId;

      if (!therapistId) {
        return res.status(401).json({ error: 'Therapist authentication required' });
      }

      if (!coupleId) {
        return res.status(400).json({ error: 'Couple/relationship ID is required' });
      }

      // Find all links for this couple
      const links = await req.prisma.therapistClient.findMany({
        where: {
          therapistId,
          coupleId,
          consentStatus: 'GRANTED',
        },
      });

      if (links.length === 0) {
        await logAccess(req.prisma, {
          accessorId: therapistId,
          resourceType: requiredCategory || 'couple_data',
          resourceId: coupleId,
          action: 'read',
          accessGranted: false,
          reason: 'No active consent links for couple',
          ipAddress: req.ip,
        });

        return res.status(403).json({
          error: 'No active consent from partners in this couple',
          code: 'CONSENT_REQUIRED',
        });
      }

      // Use the lowest permission level among linked partners
      const lowestLevel = links.reduce((min, link) => {
        return (PERMISSION_HIERARCHY[link.permissionLevel] || 0) < (PERMISSION_HIERARCHY[min] || 0)
          ? link.permissionLevel
          : min;
      }, links[0].permissionLevel);

      if (requiredCategory && !hasPermission(lowestLevel, requiredCategory)) {
        await logAccess(req.prisma, {
          accessorId: therapistId,
          resourceType: requiredCategory,
          resourceId: coupleId,
          action: 'read',
          accessGranted: false,
          reason: `Lowest permission level ${lowestLevel} insufficient for ${requiredCategory}`,
          ipAddress: req.ip,
        });

        return res.status(403).json({
          error: `Permission level insufficient for ${requiredCategory}`,
          code: 'INSUFFICIENT_PERMISSION',
          currentLevel: lowestLevel,
          requiredCategory,
        });
      }

      await logAccess(req.prisma, {
        accessorId: therapistId,
        resourceType: requiredCategory || 'couple_data',
        resourceId: coupleId,
        action: 'read',
        accessGranted: true,
        ipAddress: req.ip,
      });

      req.therapistClientLinks = links;
      req.effectivePermissionLevel = lowestLevel;
      next();
    } catch (error) {
      logger.error('therapistAccess couple middleware error', { error: error.message });
      next(error);
    }
  };
}

/**
 * Filter response data based on permission level.
 * Call this in route handlers to strip fields the therapist shouldn't see.
 *
 * @param {object} data - The full data object
 * @param {string} permissionLevel - BASIC|STANDARD|FULL
 * @returns {object} Filtered data
 */
function filterByPermission(data, permissionLevel) {
  const level = PERMISSION_HIERARCHY[permissionLevel] || 0;
  const filtered = { ...data };

  // Always include BASIC fields
  // assessment_scores and activity_completion are always present

  // Fields to strip at each level
  const standardFields = ['moodTrends', 'mood', 'moodAvg', 'ratioTrends', 'ratioAvg',
    'crisisAlerts', 'crisisFlags', 'sessionPrep', 'alerts'];
  const fullFields = ['individualResponses', 'responses', 'journalEntries', 'journalEntry',
    'messages', 'messaging'];

  // Strip STANDARD-level fields if below STANDARD
  if (level < PERMISSION_HIERARCHY.STANDARD) {
    for (const key of standardFields) {
      delete filtered[key];
    }
  }

  // Strip FULL-level fields if below FULL
  if (level < PERMISSION_HIERARCHY.FULL) {
    for (const key of fullFields) {
      delete filtered[key];
    }
  }

  // Deep filter: strip sensitive fields from nested partner objects
  const nestedKeys = ['partner1', 'partner2', 'user1', 'user2'];
  for (const nk of nestedKeys) {
    if (filtered[nk] && typeof filtered[nk] === 'object') {
      if (level < PERMISSION_HIERARCHY.STANDARD) {
        for (const key of standardFields) {
          delete filtered[nk][key];
        }
      }
      if (level < PERMISSION_HIERARCHY.FULL) {
        for (const key of fullFields) {
          delete filtered[nk][key];
        }
      }
    }
  }

  return filtered;
}

module.exports = {
  requireClientAccess,
  requireCoupleAccess,
  filterByPermission,
  hasPermission,
  logAccess,
  PERMISSION_HIERARCHY,
  DATA_CATEGORY_PERMISSIONS,
};
