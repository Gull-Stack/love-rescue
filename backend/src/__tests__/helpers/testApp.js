/**
 * Test Express application factory.
 * Creates a fully wired Express app with mock Prisma injected,
 * mounting all 13 route files at their correct paths.
 */

const express = require('express');
const { errorHandler } = require('../../middleware/errorHandler');

/**
 * Create a test Express application with mockPrisma injected into every request.
 *
 * @param {Object} mockPrisma - Mock Prisma client (from mockPrisma.js)
 * @returns {import('express').Application} Configured Express app for testing
 */
function createTestApp(mockPrisma) {
  const app = express();

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Inject mock Prisma into every request
  app.use((req, res, next) => {
    req.prisma = mockPrisma;
    next();
  });

  // Health check (mirrors production app)
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Mount all 13 route files at their correct paths
  const authRoutes = require('../../routes/auth');
  const assessmentRoutes = require('../../routes/assessments');
  const matchupRoutes = require('../../routes/matchup');
  const logsRoutes = require('../../routes/logs');
  const strategiesRoutes = require('../../routes/strategies');
  const reportsRoutes = require('../../routes/reports');
  const calendarRoutes = require('../../routes/calendar');
  const therapistRoutes = require('../../routes/therapist');
  const paymentsRoutes = require('../../routes/payments');
  const insightsRoutes = require('../../routes/insights');
  const videosRoutes = require('../../routes/videos');
  const mediatorsRoutes = require('../../routes/mediators');
  const meetingsRoutes = require('../../routes/meetings');

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

  // Error handler middleware (mirrors production app)
  app.use(errorHandler);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  return app;
}

module.exports = { createTestApp };
