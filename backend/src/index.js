require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./routes/auth');
const assessmentRoutes = require('./routes/assessments');
const matchupRoutes = require('./routes/matchup');
const logsRoutes = require('./routes/logs');
const strategiesRoutes = require('./routes/strategies');
const reportsRoutes = require('./routes/reports');
const calendarRoutes = require('./routes/calendar');
const therapistRoutes = require('./routes/therapist');
const paymentsRoutes = require('./routes/payments');
const insightsRoutes = require('./routes/insights');
const videosRoutes = require('./routes/videos');
const mediatorsRoutes = require('./routes/mediators');
const meetingsRoutes = require('./routes/meetings');
const goalsRoutes = require('./routes/goals');
const gratitudeRoutes = require('./routes/gratitude');
const pushRoutes = require('./routes/push');
const adminRoutes = require('./routes/admin');

const { auditLogger } = require('./middleware/auditLogger');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// Trust proxy for Railway/production reverse proxy
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware
// HIGH-NEW-03: Configure Helmet with CSP to protect against XSS
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com", "https://js.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameSrc: ["https://accounts.google.com", "https://js.stripe.com"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:3000', "https://accounts.google.com"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  }
}));

// MED-04: Use env-based CORS origins instead of hardcoded IPs
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [process.env.FRONTEND_URL || 'http://localhost:3000'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Rate limiting (general)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// HIGH-04: Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts, please try again later.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// CRIT-02: Conditionally skip JSON parsing for Stripe webhook (needs raw body)
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    next(); // skip json parsing for stripe webhook — route uses express.raw()
  } else {
    express.json({ limit: '10kb' })(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true }));

// Audit logging for HIPAA compliance
app.use(auditLogger);

// Make prisma available to routes
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/matchup', matchupRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/strategies', strategiesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/therapist', therapistRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/videos', videosRoutes);
app.use('/api/mediators', mediatorsRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/gratitude', gratitudeRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/admin', adminRoutes);

// Cron endpoint for daily reminders (called by external scheduler)
app.post('/api/cron/daily-reminders', async (req, res) => {
  // Verify cron secret to prevent unauthorized calls
  const cronSecret = req.headers['x-cron-secret'];
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const { sendDailyReminders } = require('./utils/pushNotifications');
    const result = await sendDailyReminders();
    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Daily reminder cron failed:', error);
    res.status(500).json({ error: 'Failed to send reminders' });
  }
});

// MED-15: 404 handler BEFORE error handler so unmatched routes get a proper 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling
app.use(errorHandler);

// MED-05: Clean expired tokens on startup and periodically
async function cleanExpiredTokens() {
  try {
    const result = await prisma.token.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });
    if (result.count > 0) {
      logger.info(`Cleaned ${result.count} expired tokens`);
    }
  } catch (err) {
    logger.error('Failed to clean expired tokens', { error: err.message });
  }
}

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Clean expired tokens on startup
  cleanExpiredTokens();
  // HIGH-NEW-04: Run token cleanup periodically (every hour)
  setInterval(cleanExpiredTokens, 60 * 60 * 1000);
});

module.exports = app;
