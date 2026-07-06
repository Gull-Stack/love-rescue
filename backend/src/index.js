require('dotenv').config();

// ============================================
// REQUIRED ENV VARS - Fail fast if missing
// ============================================
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
];

const RECOMMENDED_ENV_VARS = [
  'GOOGLE_CLIENT_ID',
  'ALLOWED_ORIGINS',
  'FRONTEND_URL',
  'INTEGRATION_JWT_SECRET',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
];

const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error('❌ FATAL: Missing required environment variables:');
  missing.forEach(key => console.error(`   - ${key}`));
  console.error('\nAdd these to Railway Variables and redeploy.');
  process.exit(1);
}

const missingRecommended = RECOMMENDED_ENV_VARS.filter(key => !process.env[key]);
if (missingRecommended.length > 0) {
  console.warn('⚠️  WARNING: Missing recommended environment variables:');
  missingRecommended.forEach(key => console.warn(`   - ${key}`));
  console.warn('Some features may not work correctly.\n');
  if (missingRecommended.includes('STRIPE_SECRET_KEY') || missingRecommended.includes('STRIPE_WEBHOOK_SECRET')) {
    console.warn('⚠️  Stripe payments/webhooks will not work until STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are configured.\n');
  }
}
// ============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const assessmentRoutes = require('./routes/assessments');
const matchupRoutes = require('./routes/matchup');
const logsRoutes = require('./routes/logs');
const strategiesRoutes = require('./routes/strategies');
const reportsRoutes = require('./routes/reports');
const calendarRoutes = require('./routes/calendar');
const therapistRoutes = require('./routes/therapist');
const therapistPracticeRoutes = require('./routes/therapist-practice');
const paymentsRoutes = require('./routes/payments');
const insightsRoutes = require('./routes/insights');
const videosRoutes = require('./routes/videos');
const mediatorsRoutes = require('./routes/mediators');
const meetingsRoutes = require('./routes/meetings');
const goalsRoutes = require('./routes/goals');
const gratitudeRoutes = require('./routes/gratitude');
const pushRoutes = require('./routes/push');
const adminRoutes = require('./routes/admin');
const streaksRoutes = require('./routes/streaks');
const partnerActivityRoutes = require('./routes/partner-activity');
const courseRoutes = require('./routes/course');
const notificationsRoutes = require('./routes/notifications');
const subscriptionsRoutes = require('./routes/subscriptions');
const upgradeRoutes = require('./routes/upgrade');
const iapRoutes = require('./routes/iap');
const integrationRoutes = require('./routes/integration');
const identityHintsRoutes = require('./routes/identity-hints');
const expertInsightsRoutes = require('./routes/expert-insights');
const weeklySummaryRoutes = require('./routes/weekly-summary');
const skillTreeRoutes = require('./routes/skill-tree');
const transformationRoutes = require('./routes/transformation');
const progressRingsRoutes = require('./routes/progress-rings');
const realTalkRoutes = require('./routes/real-talk');
const clientRoutes = require('./routes/client');
const billingSsoRoutes = require('./routes/billing-sso');

const { auditLogger } = require('./middleware/auditLogger');
const { errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();
// Single shared client (one connection pool). See lib/prisma.js.
const prisma = require('./lib/prisma');
const PORT = process.env.PORT || 3001;

// Trust proxy for Railway/production reverse proxy
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware
// HIGH-NEW-03: Configure Helmet with CSP to protect against XSS
// NOTE: this API serves JSON only (no HTML/inline scripts — the SPA is deployed
// separately on Vercel with its own headers), so the CSP here is defense-in-depth.
// 'unsafe-inline' removed from scriptSrc; js.stripe.com removed (no Stripe.js is
// loaded from any page served by this backend).
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://accounts.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameSrc: ["https://accounts.google.com"],
      connectSrc: ["'self'", "https://loverescue.app", "https://www.loverescue.app", "https://accounts.google.com"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  }
}));

// MED-04: Use env-based CORS origins instead of hardcoded IPs
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [process.env.FRONTEND_URL || 'http://localhost:3000'];
// Capacitor iOS/Android apps use these origins
allowedOrigins.push('capacitor://localhost', 'http://localhost', 'ionic://localhost');
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Rate limiting (general). The SPA fires ~10 API calls per page load, and many
// mobile users share carrier-grade NAT IPs, so 100/15min blocked legit users
// mid-onboarding. Generous per-IP cap that still stops scraping/DoS; tune via env.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX) || 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  // Stripe webhooks are signature-verified and can burst well beyond per-IP
  // limits (all events come from Stripe's IPs) — exempt them from this limiter.
  skip: (req) => req.originalUrl === '/api/payments/webhook' || req.originalUrl.startsWith('/api/stripe/webhook')
});
app.use('/api/', limiter);

// HIGH-04: Stricter rate limiting for auth endpoints (brute-force protection).
// Account-level lockout handles per-account brute force separately; this is the
// coarse per-IP net, kept lenient enough for shared/NAT IPs.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
// Biometric login endpoints are unauthenticated credential probes too
app.use('/api/auth/webauthn/login/options', authLimiter);
app.use('/api/auth/webauthn/login/verify', authLimiter);

// CRIT-02: Conditionally skip JSON parsing for Stripe webhook (needs raw body)
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook' || req.originalUrl.startsWith('/api/stripe/webhook')) {
    next(); // skip json parsing for stripe webhook — route uses express.raw()
  } else {
    express.json({ limit: '100kb' })(req, res, next);
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
// Practice management (session notes + appointments). Mounted at the same
// prefix AFTER the main therapist router — its paths (/clients/:id/notes,
// /notes/*, /appointments*, /my/*) don't collide with therapist.js routes,
// so unmatched requests fall through to it.
app.use('/api/therapist', therapistPracticeRoutes);
app.use('/api/payments', paymentsRoutes);
// Alias: Stripe dashboard configured to send to /api/stripe/webhooks
app.post('/api/stripe/webhooks', express.raw({ type: 'application/json' }), (req, res, next) => {
  // Forward to the payments webhook handler
  req.url = '/webhook';
  paymentsRoutes(req, res, next);
});
app.use('/api/insights', insightsRoutes);
app.use('/api/videos', videosRoutes);
app.use('/api/mediators', mediatorsRoutes);
app.use('/api/meetings', meetingsRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/gratitude', gratitudeRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/streaks', streaksRoutes);
app.use('/api/partner', partnerActivityRoutes);
app.use('/api/course', courseRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/upgrade', upgradeRoutes);
app.use('/api/iap', iapRoutes);
app.use('/api/integration', integrationRoutes);
app.use('/api/identity-hints', identityHintsRoutes);
app.use('/api/expert-insights', expertInsightsRoutes);
app.use('/api/weekly-summary', weeklySummaryRoutes);
app.use('/api/skill-tree', skillTreeRoutes);
app.use('/api/transformation', transformationRoutes);
app.use('/api/progress-rings', progressRingsRoutes);
app.use('/api/real-talk', realTalkRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/billing', billingSsoRoutes);

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

// Daily-reminder scheduler. The whole notification send-path already exists
// (sendDailyReminders) — this is the trigger that was missing. We run it
// in-process every 15 minutes; sendDailyReminders only fires for users whose
// LOCAL hour matches their chosen reminder time and who haven't logged today,
// with same-day dedup, so frequent ticks are safe. Single Railway instance,
// so an in-process interval is simpler and more reliable than an external cron.
const REMINDER_INTERVAL_MS = 15 * 60 * 1000;
async function runDailyReminders() {
  try {
    const { sendDailyReminders, sendEmailNudges } = require('./utils/pushNotifications');
    await sendDailyReminders();
    // Evening email fallback for users without push (self-disables if email
    // isn't configured yet).
    await sendEmailNudges();
  } catch (err) {
    logger.error('Daily reminder tick failed', { error: err.message });
  }
}
function startReminderScheduler() {
  if (process.env.NODE_ENV === 'test') return;
  if (process.env.ENABLE_REMINDER_SCHEDULER === 'false') {
    logger.info('Reminder scheduler disabled via ENABLE_REMINDER_SCHEDULER=false');
    return;
  }
  setInterval(runDailyReminders, REMINDER_INTERVAL_MS);
  logger.info(`Daily reminder scheduler started (every ${REMINDER_INTERVAL_MS / 60000} min)`);
}

// Daily therapist-alert scheduler. Runs the risk + milestone alert scan
// (utils/therapistAlerts.runDailyAlertScan) once per day for every client
// linked to a therapist. Same in-process setInterval idiom as the reminder
// scheduler above: hourly ticks, an hour-of-day guard, and a same-day latch
// give once-daily semantics; startup jitter keeps it from ever running at
// boot (or in lockstep across restart loops). CRISIS alerts do NOT wait for
// this job — they fire immediately from the write path (logs/real-talk).
const ALERT_SCAN_INTERVAL_MS = 60 * 60 * 1000; // hourly tick
const ALERT_SCAN_UTC_HOUR = Number.isInteger(Number(process.env.ALERT_SCAN_UTC_HOUR))
  ? Number(process.env.ALERT_SCAN_UTC_HOUR)
  : 6; // default 06:00 UTC (overnight for US timezones)
let alertScanRunning = false;
let lastAlertScanDay = null;
async function runTherapistAlertScan() {
  if (alertScanRunning) return; // don't overlap a slow run
  const now = new Date();
  // Run on the FIRST tick of each UTC day at or after the target hour. Using
  // `< target` (not `!== target`) means a tick that drifts past the exact hour
  // — e.g. boot jitter lands ticks at :07 and :52 and the :06-hour tick is
  // missed — still triggers the scan later that same day. The same-day latch
  // (lastAlertScanDay) guarantees it runs at most once per day.
  if (now.getUTCHours() < ALERT_SCAN_UTC_HOUR) return; // not yet at target hour today
  const dayKey = now.toISOString().slice(0, 10);
  if (lastAlertScanDay === dayKey) return; // already ran today
  alertScanRunning = true;
  try {
    const therapistAlerts = require('./utils/therapistAlerts');
    therapistAlerts.init(prisma);
    const summary = await therapistAlerts.runDailyAlertScan(prisma);
    lastAlertScanDay = dayKey;
    logger.info(
      `Therapist alert scan done: ${summary.clientsScanned} clients, ` +
      `${summary.riskAlerts} risk + ${summary.milestoneAlerts} milestone alerts, ` +
      `${summary.failures} failures`
    );
  } catch (err) {
    logger.error('Therapist alert scan failed', { error: err.message });
  } finally {
    alertScanRunning = false;
  }
}
function startAlertScheduler() {
  if (process.env.NODE_ENV === 'test') return;
  if (process.env.ENABLE_ALERT_SCHEDULER === 'false') {
    logger.info('Alert scheduler disabled via ENABLE_ALERT_SCHEDULER=false');
    return;
  }
  // 5-15 min startup jitter: never scan during boot, and de-synchronize ticks
  // if the process is restart-looping.
  const startupJitterMs = 5 * 60 * 1000 + Math.floor(Math.random() * 10 * 60 * 1000);
  setTimeout(() => {
    runTherapistAlertScan();
    setInterval(runTherapistAlertScan, ALERT_SCAN_INTERVAL_MS);
  }, startupJitterMs);
  logger.info(
    `Therapist alert scheduler started (daily at ${String(ALERT_SCAN_UTC_HOUR).padStart(2, '0')}:00 UTC, ` +
    `first tick in ${Math.round(startupJitterMs / 60000)} min)`
  );
}

// Appointment-reminder scheduler. Same in-process setInterval idiom as the
// alert scheduler above: hourly tick, overlap guard, kill switch env, and
// startup jitter. Each tick emails clients whose scheduled appointment starts
// within the next 24h and hasn't been reminded (reminderSentAt null); the
// scan stamps reminderSentAt before sending so it can never double-send, and
// failures are isolated per appointment (see routes/therapist-practice.js).
const APPOINTMENT_REMINDER_INTERVAL_MS = 60 * 60 * 1000; // hourly tick
let appointmentReminderRunning = false;
async function runAppointmentReminderScan() {
  if (appointmentReminderRunning) return; // don't overlap a slow run
  appointmentReminderRunning = true;
  try {
    const { scanAndSendAppointmentReminders } = require('./routes/therapist-practice');
    const summary = await scanAndSendAppointmentReminders(prisma);
    if (summary.scanned > 0) {
      logger.info(
        `Appointment reminder scan done: ${summary.scanned} due, ` +
        `${summary.sent} sent, ${summary.failures} failures`
      );
    }
  } catch (err) {
    logger.error('Appointment reminder scan failed', { error: err.message });
  } finally {
    appointmentReminderRunning = false;
  }
}
function startAppointmentReminderScheduler() {
  if (process.env.NODE_ENV === 'test') return;
  if (process.env.ENABLE_APPOINTMENT_REMINDER_SCHEDULER === 'false') {
    logger.info('Appointment reminder scheduler disabled via ENABLE_APPOINTMENT_REMINDER_SCHEDULER=false');
    return;
  }
  // 5-15 min startup jitter: never scan during boot, and de-synchronize ticks
  // if the process is restart-looping.
  const startupJitterMs = 5 * 60 * 1000 + Math.floor(Math.random() * 10 * 60 * 1000);
  setTimeout(() => {
    runAppointmentReminderScan();
    setInterval(runAppointmentReminderScan, APPOINTMENT_REMINDER_INTERVAL_MS);
  }, startupJitterMs);
  logger.info(
    `Appointment reminder scheduler started (hourly, ` +
    `first tick in ${Math.round(startupJitterMs / 60000)} min)`
  );
}

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Crash resilience: log instead of dying silently. An unhandled rejection
// should never take the whole server down mid-traffic.
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { message: err.message, stack: err.stack });
  // Let the platform restart us cleanly rather than running in a corrupt state.
  gracefulShutdown();
});

// Database schema health check - verify critical tables exist
async function verifyDatabaseSchema() {
  logger.info('[HealthCheck] Verifying database connection...');
  // Simple connection check - don't verify schema to avoid startup failures
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('[HealthCheck] Database connected ✅');
  } catch (error) {
    logger.error('[HealthCheck] Database connection failed:', { error: error.message });
    throw new Error('Database connection failed');
  }
}

// SECURITY FIX (CRIT): platform admins are no longer hardcoded or self-healing.
// The allowlist comes from the PLATFORM_ADMIN_EMAILS env var (comma-separated,
// same var middleware/auth.js uses for its request-time check). Boot-time
// promotion is opt-in via PLATFORM_ADMIN_BOOTSTRAP=true and:
//   - never CREATES accounts (the person must sign up first),
//   - never re-promotes an account an operator explicitly demoted
//     (tracked via User.adminRevokedAt, set by PUT /api/admin/users/:id).
const { PLATFORM_ADMIN_EMAILS } = require('./middleware/auth');

async function bootstrapPlatformAdmins() {
  if (process.env.PLATFORM_ADMIN_BOOTSTRAP !== 'true') {
    logger.info('[Bootstrap] Platform admin bootstrap disabled (set PLATFORM_ADMIN_BOOTSTRAP=true to enable)');
    return;
  }

  if (PLATFORM_ADMIN_EMAILS.length === 0) {
    logger.warn('[Bootstrap] PLATFORM_ADMIN_BOOTSTRAP=true but PLATFORM_ADMIN_EMAILS is empty — nothing to promote');
    return;
  }

  logger.info('[Bootstrap] Checking platform admin accounts...');

  try {
    for (const email of PLATFORM_ADMIN_EMAILS) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (!existingUser) {
        // Do NOT auto-create accounts — the admin must sign up normally first.
        logger.warn(`[Bootstrap] Allowlisted admin has no account (skipping): ${email}`);
        continue;
      }

      if (existingUser.adminRevokedAt) {
        // An operator explicitly demoted this account — never re-promote.
        logger.warn(`[Bootstrap] Admin was explicitly revoked, not re-promoting: ${email}`);
        continue;
      }

      if (!existingUser.isPlatformAdmin) {
        logger.info(`[Bootstrap] Promoting to platform admin: ${email}`);
        await prisma.user.update({
          where: { email },
          data: { isPlatformAdmin: true },
        });
      }
    }

    logger.info('[Bootstrap] Platform admin check complete.');
  } catch (error) {
    logger.error('[Bootstrap] Error (non-fatal):', { error: error.message });
    // Don't fail startup - this is a safety net, not a requirement
  }
}
// Start server
async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Connected to database');

    // Verify critical tables exist (fail fast if schema is broken)
    await verifyDatabaseSchema();

    // Opt-in (PLATFORM_ADMIN_BOOTSTRAP=true): promote allowlisted existing accounts
    await bootstrapPlatformAdmins();

    // Clean expired tokens on startup
    cleanExpiredTokens();
    // HIGH-NEW-04: Run token cleanup periodically (every hour)
    setInterval(cleanExpiredTokens, 60 * 60 * 1000);

    // Start the daily-reminder trigger (the habit loop's missing spark).
    startReminderScheduler();

    // Start the daily therapist alert scan (risk + milestone generation).
    startAlertScheduler();

    // Start the hourly appointment reminder scan (24h-ahead client emails).
    startAppointmentReminderScheduler();

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', { error: error.message });
    process.exit(1);
  }
}

startServer();

module.exports = app;
