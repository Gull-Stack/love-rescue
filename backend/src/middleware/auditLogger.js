const logger = require('../utils/logger');

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
        query: Object.keys(req.query).length > 0 ? req.query : undefined
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

module.exports = { auditLogger };
