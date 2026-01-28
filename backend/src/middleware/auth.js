const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from database
    const user = await req.prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        subscriptionStatus: true
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await req.prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
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

module.exports = { authenticate, requireSubscription, optionalAuth };
