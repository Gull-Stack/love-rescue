const logger = require('../utils/logger');

// SECURITY FIX: query params that carry credentials (OAuth codes/state, tokens,
// API keys/secrets) must never be persisted in audit logs.
const SENSITIVE_QUERY_PARAMS = new Set(['code', 'state', 'token', 'password', 'credential']);
const SENSITIVE_QUERY_PATTERN = /secret|key|token|password|credential|auth/i;

/**
 * Return a copy of the query object with sensitive values redacted.
 * @param {Object} query - req.query
 * @returns {Object} Redacted copy
 */
function redactQuery(query) {
  const redacted = {};
  for (const [key, value] of Object.entries(query)) {
    if (SENSITIVE_QUERY_PARAMS.has(key.toLowerCase()) || SENSITIVE_QUERY_PATTERN.test(key)) {
      redacted[key] = '[REDACTED]';
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

/**
 * HIPAA-compliant audit logging middleware
 * Logs all API requests for compliance and security
 */
const auditLogger = async (req, res, next) => {
  const startTime = Date.now();

  // Capture response
  const originalSend = res.send;
  res.send = function (body) {
    res.body = body;
    return originalSend.apply(this, arguments);
  };

  res.on('finish', async () => {
    const duration = Date.now() - startTime;
    const userId = req.user?.id || null;

    // Determine resource from path
    const pathParts = req.path.split('/').filter(Boolean);
    const resource = pathParts[1] || 'unknown';
    const resourceId = pathParts[2] || null;

    const auditEntry = {
      userId,
      action: `${req.method} ${req.path}`,
      resource,
      resourceId,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent')?.substring(0, 500),
      metadata: {
        statusCode: res.statusCode,
        duration,
        query: Object.keys(req.query).length > 0 ? redactQuery(req.query) : undefined
      }
    };

    // Log to console/file
    logger.info('API Request', auditEntry);

    // Store in database (async, don't block response)
    if (req.prisma && req.path.startsWith('/api/') && !req.path.includes('/health')) {
      try {
        await req.prisma.auditLog.create({
          data: {
            userId,
            action: auditEntry.action,
            resource,
            resourceId,
            ipAddress: auditEntry.ipAddress,
            userAgent: auditEntry.userAgent,
            metadata: auditEntry.metadata
          }
        });
      } catch (error) {
        logger.error('Failed to save audit log', { error: error.message });
      }
    }
  });

  next();
};

module.exports = { auditLogger, redactQuery };
