const logger = require('../utils/logger');

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'A record with this value already exists'
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'Record not found'
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: err.message
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Authentication failed'
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  
  // In production, hide internal errors but show Prisma migration issues
  const isPrismaSchemaError = err.code === 'P2022' || err.code === 'P2021' || err.code === 'P2025';
  const message = (process.env.NODE_ENV === 'production' && !isPrismaSchemaError)
    ? 'An unexpected error occurred'
    : err.message;

  res.status(statusCode).json({
    error: message,
    ...(isPrismaSchemaError && { hint: 'Database schema mismatch - migrations may need to run' })
  });
};

module.exports = { errorHandler };
