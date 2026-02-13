/**
 * @module therapistAlerts
 * @description Therapist Alert System for LoveRescue — detects risk patterns,
 * milestones, and crises in client data and routes notifications to linked therapists.
 *
 * Alert types:
 * - CRISIS: Triggered by crisisPathway detection for linked clients (immediate)
 * - RISK: Declining scores, missed activities, disengagement patterns
 * - MILESTONE: Phase completion, score breakthroughs, streaks
 * - STAGNATION: No activity, flat scores, prolonged disengagement
 *
 * Integrates with:
 * - crisisPathway.js (crisis detection → alert trigger)
 * - pursueWithdrawDetector.js (couple dynamics → risk alerts)
 * - Notification infrastructure (push, email, SMS)
 *
 * @author SteveRogers / LoveRescue
 */

'use strict';

const logger = require('./logger');

/**
 * Module-level prisma reference, set via init().
 * All exported functions also accept prisma as first parameter for testability.
 * @private
 */
let _prisma = null;

/**
 * Initialize the alert module with a shared Prisma client instance.
 * Must be called once at app startup (e.g., from server.js).
 * @param {import('@prisma/client').PrismaClient} prismaInstance
 */
function init(prismaInstance) {
  _prisma = prismaInstance;
}

/**
 * Returns the active prisma instance (parameter override or module-level).
 * @private
 */
function _getPrisma(prismaParam) {
  const p = prismaParam || _prisma;
  if (!p) throw new Error('therapistAlerts: prisma not initialized. Call init(prisma) or pass prisma as parameter.');
  return p;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** @enum {string} Alert types */
const ALERT_TYPE = Object.freeze({
  CRISIS: 'CRISIS',
  RISK: 'RISK',
  MILESTONE: 'MILESTONE',
  STAGNATION: 'STAGNATION',
});

/** @enum {string} Alert severity levels */
const ALERT_SEVERITY = Object.freeze({
  LOW: 'LOW',           // Informational — included in daily digest
  MEDIUM: 'MEDIUM',     // Noteworthy — in-app badge + daily digest
  HIGH: 'HIGH',         // Urgent — push notification within 1 hour
  CRITICAL: 'CRITICAL', // Immediate — push + SMS + email, requires acknowledgment
});

/** @enum {string} Notification delivery channels */
const NOTIFICATION_CHANNEL = Object.freeze({
  IN_APP: 'IN_APP',
  PUSH: 'PUSH',
  EMAIL: 'EMAIL',
  SMS: 'SMS',
});

/** @enum {string} Alert status */
const ALERT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  DELIVERED: 'DELIVERED',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  DISMISSED: 'DISMISSED',
});

/**
 * Maps severity to notification channels.
 * Higher severity triggers more aggressive delivery.
 * @private
 */
const SEVERITY_CHANNELS = {
  [ALERT_SEVERITY.LOW]: [NOTIFICATION_CHANNEL.IN_APP],
  [ALERT_SEVERITY.MEDIUM]: [NOTIFICATION_CHANNEL.IN_APP, NOTIFICATION_CHANNEL.EMAIL],
  [ALERT_SEVERITY.HIGH]: [NOTIFICATION_CHANNEL.IN_APP, NOTIFICATION_CHANNEL.PUSH, NOTIFICATION_CHANNEL.EMAIL],
  [ALERT_SEVERITY.CRITICAL]: [NOTIFICATION_CHANNEL.IN_APP, NOTIFICATION_CHANNEL.PUSH, NOTIFICATION_CHANNEL.EMAIL, NOTIFICATION_CHANNEL.SMS],
};

/**
 * Thresholds for risk detection. Can be overridden per-client by therapist.
 * @private
 */
const DEFAULT_THRESHOLDS = Object.freeze({
  /** Score drop percentage that triggers a RISK alert */
  scoreDropPercent: 15,
  /** Score improvement percentage that triggers a MILESTONE alert */
  scoreImprovementPercent: 20,
  /** Minimum activity completion rate (below this = RISK) */
  minActivityCompletionRate: 0.30,
  /** Days of low activity before RISK alert */
  lowActivityWindowDays: 7,
  /** Days of no app opens before STAGNATION alert */
  noActivityDays: 5,
  /** Days of flat scores before STAGNATION alert */
  flatScoreDays: 21,
  /** Streak length that triggers MILESTONE */
  streakMilestoneDays: 30,
  /** Hours within which CRITICAL alerts must be acknowledged */
  criticalAckWindowHours: 4,
});

// ═══════════════════════════════════════════════════════════════════════════════
// CORE ALERT FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} TherapistAlert
 * @property {string} id - Unique alert ID
 * @property {string} therapistId - Linked therapist UUID
 * @property {string} clientId - Client (user) UUID
 * @property {string} relationshipId - Relationship UUID (if applicable)
 * @property {string} alertType - One of ALERT_TYPE
 * @property {string} severity - One of ALERT_SEVERITY
 * @property {string} title - Human-readable alert title
 * @property {string} summary - Brief description of what triggered the alert
 * @property {Object} data - Structured alert payload (type-specific)
 * @property {string} status - One of ALERT_STATUS
 * @property {string[]} channels - Notification channels used
 * @property {Date} createdAt - When the alert was created
 * @property {Date|null} acknowledgedAt - When therapist acknowledged (if applicable)
 */

/**
 * Creates a therapist alert and queues notifications to all linked therapists
 * for the given client. This is the primary entry point for the alert system.
 *
 * @param {string} clientId - UUID of the client triggering the alert
 * @param {string} alertType - One of ALERT_TYPE enum values
 * @param {string} severity - One of ALERT_SEVERITY enum values
 * @param {Object} data - Alert-specific payload
 * @param {string} data.title - Human-readable alert title
 * @param {string} data.summary - Brief description
 * @param {Object} [data.details] - Additional structured data
 * @returns {Promise<TherapistAlert[]>} Array of created alerts (one per linked therapist)
 *
 * @example
 * await triggerTherapistAlert('user-uuid', ALERT_TYPE.CRISIS, ALERT_SEVERITY.CRITICAL, {
 *   title: 'Crisis Detected — Suicidal Ideation',
 *   summary: 'Client triggered Level 3 crisis detection with safety risk indicators.',
 *   details: { crisisLevel: 3, crisisType: 'EMOTIONAL_FLOODING', safetyRisk: true }
 * });
 */
async function triggerTherapistAlert(clientId, alertType, severity, data, prisma) {
  if (!clientId || !alertType || !severity || !data) {
    throw new Error('triggerTherapistAlert: clientId, alertType, severity, and data are required');
  }

  if (!ALERT_TYPE[alertType]) {
    throw new Error(`triggerTherapistAlert: invalid alertType "${alertType}"`);
  }

  if (!ALERT_SEVERITY[severity]) {
    throw new Error(`triggerTherapistAlert: invalid severity "${severity}"`);
  }

  const db = _getPrisma(prisma);

  try {
    // 1. Find all therapists linked to this client with active assignments
    const linkedTherapists = await _findLinkedTherapists(clientId, db);

    if (linkedTherapists.length === 0) {
      // No linked therapists — log but don't error
      logger.info('No linked therapists for client, alert not delivered', { clientId });
      return [];
    }

    // 2. Create alerts for each linked therapist
    const alerts = [];
    const channels = SEVERITY_CHANNELS[severity] || SEVERITY_CHANNELS[ALERT_SEVERITY.LOW];

    for (const assignment of linkedTherapists) {
      const alert = {
        id: _generateUUID(),
        therapistId: assignment.therapistId,
        clientId,
        relationshipId: assignment.relationshipId,
        alertType,
        severity,
        title: data.title || `${alertType} Alert`,
        summary: data.summary || '',
        data: data.details || {},
        status: ALERT_STATUS.PENDING,
        channels,
        createdAt: new Date(),
        acknowledgedAt: null,
      };

      alerts.push(alert);

      // 3. Persist alert to TherapistAlert table (+ audit log for HIPAA)
      await _persistAlert(alert, db);

      // 4. Queue notifications based on severity
      await _queueNotifications(alert, assignment);
    }

    logger.info('Therapist alerts created', {
      count: alerts.length, alertType, severity, clientId,
    });

    return alerts;
  } catch (error) {
    logger.error('Error creating alert for client', { clientId, error: error.message });
    // Don't throw — alert failure should not break the client-facing flow
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RISK ALERT GENERATION (Daily Job)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generates risk alerts for a given client. Designed to run daily as a scheduled job.
 * Checks for:
 * - Assessment score drops >15% in any category
 * - Activity completion rate below 30% for 7+ days
 * - No app opens for 5+ days
 * - Pursue-withdraw pattern intensifying (if couple)
 *
 * @param {string} clientId - UUID of the client to evaluate
 * @param {Object} [thresholds] - Optional custom thresholds (overrides defaults)
 * @returns {Promise<TherapistAlert[]>} Array of generated alerts (may be empty)
 *
 * @example
 * const alerts = await generateRiskAlerts('user-uuid');
 * // Returns [] if no risk detected, or array of alerts
 */
async function generateRiskAlerts(clientId, thresholds = {}, prisma) {
  const db = _getPrisma(prisma);
  const config = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const alerts = [];

  try {
    // 1. Check assessment score drops
    const scoreAlerts = await _checkScoreDrops(clientId, config.scoreDropPercent, db);
    alerts.push(...scoreAlerts);

    // 2. Check activity completion rate
    const activityAlerts = await _checkActivityCompletion(
      clientId,
      config.minActivityCompletionRate,
      config.lowActivityWindowDays,
      db
    );
    alerts.push(...activityAlerts);

    // 3. Check for app disengagement
    const engagementAlerts = await _checkAppEngagement(clientId, config.noActivityDays, db);
    alerts.push(...engagementAlerts);

    // 4. Check pursue-withdraw pattern (if couple)
    const pwAlerts = await _checkPursueWithdrawEscalation(clientId, db);
    alerts.push(...pwAlerts);

    return alerts;
  } catch (error) {
    logger.error('Error generating risk alerts', { clientId, error: error.message });
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MILESTONE ALERT GENERATION (Daily Job)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generates milestone alerts for a given client. Designed to run daily.
 * Checks for:
 * - Completed a curriculum phase (week/module)
 * - Assessment score improvement >20%
 * - 30-day activity streak
 * - First time scoring "secure" on attachment assessment
 *
 * @param {string} clientId - UUID of the client to evaluate
 * @param {Object} [thresholds] - Optional custom thresholds
 * @returns {Promise<TherapistAlert[]>} Array of generated milestone alerts
 *
 * @example
 * const milestones = await generateMilestoneAlerts('user-uuid');
 */
async function generateMilestoneAlerts(clientId, thresholds = {}, prisma) {
  const db = _getPrisma(prisma);
  const config = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const alerts = [];

  try {
    // 1. Check phase completion
    const phaseAlerts = await _checkPhaseCompletion(clientId, db);
    alerts.push(...phaseAlerts);

    // 2. Check score improvements
    const improvementAlerts = await _checkScoreImprovements(clientId, config.scoreImprovementPercent, db);
    alerts.push(...improvementAlerts);

    // 3. Check activity streaks
    const streakAlerts = await _checkActivityStreaks(clientId, config.streakMilestoneDays, db);
    alerts.push(...streakAlerts);

    // 4. Check attachment security milestone
    const attachmentAlerts = await _checkAttachmentSecurity(clientId, db);
    alerts.push(...attachmentAlerts);

    return alerts;
  } catch (error) {
    logger.error('Error generating milestone alerts', { clientId, error: error.message });
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALERT DIGEST (Therapist Dashboard)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} AlertDigest
 * @property {string} therapistId - Therapist UUID
 * @property {Date} since - Start of digest window
 * @property {Date} until - End of digest window (now)
 * @property {Object} summary - Counts by type and severity
 * @property {Object} byClient - Alerts grouped by client
 * @property {TherapistAlert[]} unacknowledged - Alerts requiring acknowledgment
 * @property {number} totalAlerts - Total alerts in window
 */

/**
 * Returns a grouped alert digest for a therapist's dashboard.
 * Groups alerts by client and type, highlights unacknowledged critical alerts.
 *
 * @param {string} therapistId - UUID of the therapist
 * @param {Date|string} since - Start date for the digest window
 * @returns {Promise<AlertDigest>} Grouped alert digest
 *
 * @example
 * const digest = await getAlertDigest('therapist-uuid', new Date(Date.now() - 86400000));
 * // Returns last 24 hours of alerts, grouped by client
 */
async function getAlertDigest(therapistId, since, prisma) {
  if (!therapistId) {
    throw new Error('getAlertDigest: therapistId is required');
  }

  const sinceDate = since instanceof Date ? since : new Date(since);

  if (isNaN(sinceDate.getTime())) {
    throw new Error('getAlertDigest: invalid "since" date');
  }

  const db = _getPrisma(prisma);
  const now = new Date();

  try {
    // Fetch all alerts for this therapist since the given date
    const alerts = await _fetchAlerts(therapistId, sinceDate, now, db);

    // Group by client
    const byClient = {};
    for (const alert of alerts) {
      const key = alert.clientId;
      if (!byClient[key]) {
        byClient[key] = {
          clientId: key,
          clientName: alert.clientName || 'Unknown',
          relationshipId: alert.relationshipId,
          alerts: [],
          highestSeverity: ALERT_SEVERITY.LOW,
        };
      }
      byClient[key].alerts.push(alert);

      // Track highest severity per client
      if (_severityRank(alert.severity) > _severityRank(byClient[key].highestSeverity)) {
        byClient[key].highestSeverity = alert.severity;
      }
    }

    // Summary counts
    const summary = {
      byType: {},
      bySeverity: {},
    };
    for (const alert of alerts) {
      summary.byType[alert.alertType] = (summary.byType[alert.alertType] || 0) + 1;
      summary.bySeverity[alert.severity] = (summary.bySeverity[alert.severity] || 0) + 1;
    }

    // Unacknowledged critical/high alerts
    const unacknowledged = alerts.filter(
      (a) =>
        [ALERT_SEVERITY.CRITICAL, ALERT_SEVERITY.HIGH].includes(a.severity) &&
        a.status !== ALERT_STATUS.ACKNOWLEDGED
    );

    return {
      therapistId,
      since: sinceDate,
      until: now,
      summary,
      byClient,
      unacknowledged,
      totalAlerts: alerts.length,
    };
  } catch (error) {
    logger.error('Error fetching alert digest', { therapistId, error: error.message });
    return {
      therapistId,
      since: sinceDate,
      until: now,
      summary: { byType: {}, bySeverity: {} },
      byClient: {},
      unacknowledged: [],
      totalAlerts: 0,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CRISIS → THERAPIST ALERT BRIDGE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Bridge function called by crisisPathway when a crisis is detected for a client.
 * Maps crisis detection results to therapist alert severity and triggers notification.
 *
 * Crisis Level 1 (Elevated) → ALERT_SEVERITY.MEDIUM
 * Crisis Level 2 (Acute)    → ALERT_SEVERITY.HIGH (push notification)
 * Crisis Level 3 (Emergency)→ ALERT_SEVERITY.CRITICAL (push + SMS + email)
 *
 * @param {string} clientId - UUID of the client in crisis
 * @param {import('./crisisPathway').CrisisDetectionResult} crisisResult - Result from detectCrisisLevel()
 * @returns {Promise<TherapistAlert[]>} Created alerts
 */
async function handleCrisisDetection(clientId, crisisResult, prisma) {
  if (!crisisResult || !crisisResult.isCrisis) {
    return [];
  }

  const levelToSeverity = {
    1: ALERT_SEVERITY.MEDIUM,
    2: ALERT_SEVERITY.HIGH,
    3: ALERT_SEVERITY.CRITICAL,
  };

  const severity = levelToSeverity[crisisResult.level] || ALERT_SEVERITY.HIGH;

  const levelLabels = {
    1: 'Elevated',
    2: 'Acute',
    3: 'Emergency',
  };

  const title = crisisResult.safetyRisk
    ? `⚠️ SAFETY RISK — Level ${crisisResult.level} Crisis Detected`
    : `Crisis Detected — ${levelLabels[crisisResult.level] || 'Unknown'} (${_formatCrisisType(crisisResult.primaryType)})`;

  const summary = _buildCrisisSummary(crisisResult);

  return triggerTherapistAlert(clientId, ALERT_TYPE.CRISIS, severity, {
    title,
    summary,
    details: {
      crisisLevel: crisisResult.level,
      crisisType: crisisResult.primaryType,
      allTypes: crisisResult.allTypes,
      safetyRisk: crisisResult.safetyRisk,
      safetyResources: crisisResult.safetyResources,
      confidence: crisisResult.confidence,
      detectedAt: new Date().toISOString(),
    },
  }, prisma);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVATE: DATA ACCESS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Finds all therapists linked to a client via active TherapistAssignment.
 * @private
 * @param {string} clientId - User UUID
 * @returns {Promise<Array<{therapistId: string, relationshipId: string}>>}
 */
async function _findLinkedTherapists(clientId, db) {
  try {
    // Find relationships where this user is either user1 or user2
    const relationships = await db.relationship.findMany({
      where: {
        OR: [{ user1Id: clientId }, { user2Id: clientId }],
        status: 'active',
      },
      select: { id: true },
    });

    if (relationships.length === 0) return [];

    const relationshipIds = relationships.map((r) => r.id);

    // Find active therapist assignments for those relationships
    const assignments = await db.therapistAssignment.findMany({
      where: {
        relationshipId: { in: relationshipIds },
        status: 'active',
      },
      select: {
        therapistId: true,
        relationshipId: true,
      },
    });

    return assignments;
  } catch (error) {
    logger.error('Error finding linked therapists', { clientId, error: error.message });
    return [];
  }
}

/**
 * Persists an alert to the audit log system.
 * @private
 * @param {TherapistAlert} alert
 */
async function _persistAlert(alert, db) {
  try {
    // Primary write: TherapistAlert table (read by dashboard GET /alerts)
    await db.therapistAlert.create({
      data: {
        therapistId: alert.therapistId,
        clientId: alert.clientId,
        alertType: alert.alertType,
        severity: alert.severity,
        message: alert.summary,
        metadata: {
          title: alert.title,
          data: alert.data,
          status: alert.status,
          channels: alert.channels,
          relationshipId: alert.relationshipId,
        },
      },
    });

    // Secondary write: audit log for HIPAA compliance
    await db.auditLog.create({
      data: {
        userId: alert.clientId,
        action: 'THERAPIST_ALERT',
        resource: 'therapist_alert',
        resourceId: alert.id,
        metadata: {
          therapistId: alert.therapistId,
          alertType: alert.alertType,
          severity: alert.severity,
          title: alert.title,
          summary: alert.summary,
          data: alert.data,
          status: alert.status,
          channels: alert.channels,
        },
      },
    });
  } catch (error) {
    logger.error('Error persisting alert', { alertId: alert.id, error: error.message });
  }
}

/**
 * Queues notifications for an alert based on severity and therapist preferences.
 * @private
 * @param {TherapistAlert} alert
 * @param {Object} assignment - Therapist assignment data
 */
async function _queueNotifications(alert, assignment) {
  try {
    for (const channel of alert.channels) {
      switch (channel) {
        case NOTIFICATION_CHANNEL.PUSH:
          await _sendPushNotification(alert, assignment);
          break;
        case NOTIFICATION_CHANNEL.EMAIL:
          await _sendEmailNotification(alert, assignment);
          break;
        case NOTIFICATION_CHANNEL.SMS:
          await _sendSmsNotification(alert, assignment);
          break;
        case NOTIFICATION_CHANNEL.IN_APP:
          // In-app notifications are read from the alert store directly
          break;
        default:
          logger.warn('Unknown notification channel', { channel });
      }
    }
  } catch (error) {
    logger.error('Error queueing notifications', { alertId: alert.id, error: error.message });
  }
}

/**
 * Sends a push notification to the therapist.
 * @private
 * @param {TherapistAlert} alert
 * @param {Object} assignment
 */
async function _sendPushNotification(alert, assignment) {
  // TODO: Integrate with push notification service (Firebase/APNs/web-push)
  logger.info('PUSH notification stub', { therapistId: alert.therapistId, title: alert.title });
}

/**
 * Sends an email notification to the therapist.
 * @private
 * @param {TherapistAlert} alert
 * @param {Object} assignment
 */
async function _sendEmailNotification(alert, assignment) {
  // TODO: Integrate with email service (SendGrid/SES)
  logger.info('EMAIL notification stub', { therapistId: alert.therapistId, title: alert.title });
}

/**
 * Sends an SMS notification to the therapist (CRITICAL only).
 * @private
 * @param {TherapistAlert} alert
 * @param {Object} assignment
 */
async function _sendSmsNotification(alert, assignment) {
  // TODO: Integrate with SMS service (Twilio)
  logger.info('SMS notification stub', { therapistId: alert.therapistId, title: alert.title });
}

/**
 * Fetches alerts for a therapist within a date range.
 * @private
 * @param {string} therapistId
 * @param {Date} since
 * @param {Date} until
 * @returns {Promise<TherapistAlert[]>}
 */
async function _fetchAlerts(therapistId, since, until, db) {
  try {
    const alertRecords = await db.therapistAlert.findMany({
      where: {
        therapistId,
        createdAt: {
          gte: since,
          lte: until,
        },
      },
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return alertRecords.map((entry) => {
      const meta = entry.metadata || {};
      return {
        id: entry.id,
        therapistId: entry.therapistId,
        clientId: entry.clientId,
        clientName: entry.client ? `${entry.client.firstName || ''} ${entry.client.lastName || ''}`.trim() : 'Unknown',
        relationshipId: meta.relationshipId || null,
        alertType: entry.alertType,
        severity: entry.severity,
        title: meta.title || entry.message,
        summary: entry.message,
        data: meta.data || {},
        status: entry.readAt ? ALERT_STATUS.ACKNOWLEDGED : ALERT_STATUS.PENDING,
        channels: meta.channels || [],
        createdAt: entry.createdAt,
        acknowledgedAt: entry.readAt || null,
      };
    });
  } catch (error) {
    logger.error('Error fetching alerts', { therapistId, error: error.message });
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVATE: RISK DETECTION CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Checks for assessment score drops exceeding the threshold.
 * Compares the two most recent assessments of each type.
 * @private
 * @param {string} clientId
 * @param {number} dropPercent - Threshold (e.g. 15 for 15%)
 * @returns {Promise<TherapistAlert[]>}
 */
async function _checkScoreDrops(clientId, dropPercent, db) {
  const alerts = [];

  try {
    // Get all assessment types this client has taken
    const assessments = await db.assessment.findMany({
      where: { userId: clientId },
      orderBy: { completedAt: 'desc' },
    });

    // Group by type
    const byType = {};
    for (const a of assessments) {
      if (!byType[a.type]) byType[a.type] = [];
      byType[a.type].push(a);
    }

    // Compare two most recent of each type
    for (const [type, records] of Object.entries(byType)) {
      if (records.length < 2) continue;

      const latest = records[0];
      const previous = records[1];

      const latestTotal = _extractTotalScore(latest.score);
      const previousTotal = _extractTotalScore(previous.score);

      if (previousTotal <= 0) continue;

      const dropPct = ((previousTotal - latestTotal) / previousTotal) * 100;

      if (dropPct >= dropPercent) {
        const generated = await triggerTherapistAlert(clientId, ALERT_TYPE.RISK, ALERT_SEVERITY.MEDIUM, {
          title: `Score Decline — ${_formatAssessmentType(type)}`,
          summary: `${_formatAssessmentType(type)} score dropped ${Math.round(dropPct)}% (from ${previousTotal} to ${latestTotal}).`,
          details: {
            assessmentType: type,
            previousScore: previousTotal,
            latestScore: latestTotal,
            dropPercent: Math.round(dropPct * 10) / 10,
            previousDate: previous.completedAt,
            latestDate: latest.completedAt,
          },
        }, db);
        alerts.push(...generated);
      }
    }
  } catch (error) {
    logger.error('Error checking score drops', { clientId, error: error.message });
  }

  return alerts;
}

/**
 * Checks if activity completion rate has fallen below threshold for the window.
 * @private
 * @param {string} clientId
 * @param {number} minRate - Minimum acceptable rate (0-1)
 * @param {number} windowDays - Window to check
 * @returns {Promise<TherapistAlert[]>}
 */
async function _checkActivityCompletion(clientId, minRate, windowDays, db) {
  const alerts = [];

  try {
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - windowDays);

    // Find the user's relationship and active strategies
    const relationships = await db.relationship.findMany({
      where: {
        OR: [{ user1Id: clientId }, { user2Id: clientId }],
        status: 'active',
      },
      select: { id: true },
    });

    if (relationships.length === 0) return alerts;

    const relIds = relationships.map((r) => r.id);

    // Check strategies for activity completion
    const strategies = await db.strategy.findMany({
      where: {
        relationshipId: { in: relIds },
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: windowStart },
      },
    });

    for (const strategy of strategies) {
      const progress = strategy.progress || 0;
      const completionRate = progress / 100;

      if (completionRate < minRate) {
        const generated = await triggerTherapistAlert(clientId, ALERT_TYPE.RISK, ALERT_SEVERITY.MEDIUM, {
          title: 'Low Activity Completion',
          summary: `Activity completion rate is ${Math.round(completionRate * 100)}% over the past ${windowDays} days (threshold: ${Math.round(minRate * 100)}%).`,
          details: {
            completionRate: Math.round(completionRate * 100) / 100,
            threshold: minRate,
            windowDays,
            strategyId: strategy.id,
            week: strategy.week,
          },
        }, db);
        alerts.push(...generated);
      }
    }
  } catch (error) {
    logger.error('Error checking activity completion', { clientId, error: error.message });
  }

  return alerts;
}

/**
 * Checks for app disengagement (no daily logs for X days).
 * @private
 * @param {string} clientId
 * @param {number} noActivityDays
 * @returns {Promise<TherapistAlert[]>}
 */
async function _checkAppEngagement(clientId, noActivityDays, db) {
  const alerts = [];

  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - noActivityDays);

    const recentLog = await db.dailyLog.findFirst({
      where: {
        userId: clientId,
        createdAt: { gte: cutoff },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!recentLog) {
      // Find the LAST activity to report how long it's been
      const lastLog = await db.dailyLog.findFirst({
        where: { userId: clientId },
        orderBy: { createdAt: 'desc' },
      });

      const daysSince = lastLog
        ? Math.floor((Date.now() - lastLog.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const generated = await triggerTherapistAlert(
        clientId,
        ALERT_TYPE.STAGNATION,
        daysSince && daysSince > noActivityDays * 2 ? ALERT_SEVERITY.HIGH : ALERT_SEVERITY.MEDIUM,
        {
          title: 'Client Disengagement',
          summary: daysSince
            ? `No app activity for ${daysSince} days (last active: ${lastLog.date.toISOString().split('T')[0]}).`
            : `No app activity recorded. Client may not have started using the app.`,
          details: {
            daysSinceLastActivity: daysSince,
            lastActivityDate: lastLog ? lastLog.date : null,
            threshold: noActivityDays,
          },
        }, db
      );
      alerts.push(...generated);
    }
  } catch (error) {
    logger.error('Error checking engagement', { clientId, error: error.message });
  }

  return alerts;
}

/**
 * Checks for pursue-withdraw pattern escalation in couple relationships.
 * @private
 * @param {string} clientId
 * @returns {Promise<TherapistAlert[]>}
 */
async function _checkPursueWithdrawEscalation(clientId, db) {
  const alerts = [];

  try {
    // Find couple relationships
    const relationships = await db.relationship.findMany({
      where: {
        OR: [{ user1Id: clientId }, { user2Id: clientId }],
        status: 'active',
        user2Id: { not: null }, // Must be a couple
      },
      select: { id: true, user1Id: true, user2Id: true },
    });

    if (relationships.length === 0) return alerts;

    // Lazy-load the detector to avoid circular deps
    let detectPursueWithdrawPattern;
    try {
      ({ detectPursueWithdrawPattern } = require('./pursueWithdrawDetector'));
    } catch {
      // Detector not available yet — skip
      return alerts;
    }

    for (const rel of relationships) {
      const result = await detectPursueWithdrawPattern(rel.id, 14, db);

      if (result && result.patternDetected && result.trend === 'intensifying') {
        const severity = result.intensity === 'severe'
          ? ALERT_SEVERITY.HIGH
          : ALERT_SEVERITY.MEDIUM;

        const generated = await triggerTherapistAlert(clientId, ALERT_TYPE.RISK, severity, {
          title: 'Pursue-Withdraw Pattern Intensifying',
          summary: `${result.intensity} pursue-withdraw cycle detected and worsening. ${result.pursuer?.label || 'One partner'} is pursuing while ${result.withdrawer?.label || 'the other'} is withdrawing.`,
          details: {
            relationshipId: rel.id,
            intensity: result.intensity,
            trend: result.trend,
            pursuer: result.pursuer,
            withdrawer: result.withdrawer,
            windowDays: 14,
          },
        }, db);
        alerts.push(...generated);
      }
    }
  } catch (error) {
    logger.error('Error checking pursue-withdraw', { clientId, error: error.message });
  }

  return alerts;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVATE: MILESTONE DETECTION CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Checks if client completed a curriculum phase (week).
 * @private
 * @param {string} clientId
 * @returns {Promise<TherapistAlert[]>}
 */
async function _checkPhaseCompletion(clientId, db) {
  const alerts = [];

  try {
    const progress = await db.courseProgress.findUnique({
      where: { userId: clientId },
      include: { weeklyStrategies: { orderBy: { completedAt: 'desc' }, take: 1 } },
    });

    if (!progress) return alerts;

    // Check if a week was completed in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentCompletion = progress.weeklyStrategies.find(
      (ws) => ws.completedAt && ws.completedAt >= oneDayAgo
    );

    if (recentCompletion) {
      const generated = await triggerTherapistAlert(clientId, ALERT_TYPE.MILESTONE, ALERT_SEVERITY.LOW, {
        title: `Phase Completed — Week ${recentCompletion.weekNumber}`,
        summary: `Client completed Week ${recentCompletion.weekNumber} (${recentCompletion.theme}). Now on Week ${progress.currentWeek}.`,
        details: {
          completedWeek: recentCompletion.weekNumber,
          theme: recentCompletion.theme,
          expertName: recentCompletion.expertName,
          currentWeek: progress.currentWeek,
          totalCompletedWeeks: progress.completedWeeks.length,
        },
      }, db);
      alerts.push(...generated);
    }
  } catch (error) {
    logger.error('Error checking phase completion', { clientId, error: error.message });
  }

  return alerts;
}

/**
 * Checks for significant assessment score improvements.
 * @private
 * @param {string} clientId
 * @param {number} improvementPercent
 * @returns {Promise<TherapistAlert[]>}
 */
async function _checkScoreImprovements(clientId, improvementPercent, db) {
  const alerts = [];

  try {
    const assessments = await db.assessment.findMany({
      where: { userId: clientId },
      orderBy: { completedAt: 'desc' },
    });

    const byType = {};
    for (const a of assessments) {
      if (!byType[a.type]) byType[a.type] = [];
      byType[a.type].push(a);
    }

    for (const [type, records] of Object.entries(byType)) {
      if (records.length < 2) continue;

      const latest = records[0];
      const previous = records[1];

      const latestTotal = _extractTotalScore(latest.score);
      const previousTotal = _extractTotalScore(previous.score);

      if (previousTotal <= 0) continue;

      const improvePct = ((latestTotal - previousTotal) / previousTotal) * 100;

      if (improvePct >= improvementPercent) {
        const generated = await triggerTherapistAlert(clientId, ALERT_TYPE.MILESTONE, ALERT_SEVERITY.LOW, {
          title: `Breakthrough — ${_formatAssessmentType(type)}`,
          summary: `${_formatAssessmentType(type)} score improved ${Math.round(improvePct)}% (from ${previousTotal} to ${latestTotal}). Significant progress.`,
          details: {
            assessmentType: type,
            previousScore: previousTotal,
            latestScore: latestTotal,
            improvementPercent: Math.round(improvePct * 10) / 10,
          },
        }, db);
        alerts.push(...generated);
      }
    }
  } catch (error) {
    logger.error('Error checking score improvements', { clientId, error: error.message });
  }

  return alerts;
}

/**
 * Checks for activity streak milestones.
 * @private
 * @param {string} clientId
 * @param {number} milestoneDays
 * @returns {Promise<TherapistAlert[]>}
 */
async function _checkActivityStreaks(clientId, milestoneDays, db) {
  const alerts = [];

  try {
    // Count consecutive daily logs ending today
    const logs = await db.dailyLog.findMany({
      where: { userId: clientId },
      orderBy: { date: 'desc' },
      take: milestoneDays + 5, // slight buffer
    });

    if (logs.length < milestoneDays) return alerts;

    // Check for consecutive days
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < logs.length; i++) {
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      const logDate = new Date(logs[i].date);
      logDate.setHours(0, 0, 0, 0);

      if (logDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    // Fire alert only on the exact milestone day
    if (streak === milestoneDays) {
      const generated = await triggerTherapistAlert(clientId, ALERT_TYPE.MILESTONE, ALERT_SEVERITY.LOW, {
        title: `🔥 ${milestoneDays}-Day Activity Streak`,
        summary: `Client has maintained a ${milestoneDays}-day consecutive activity streak. Outstanding commitment.`,
        details: { streakDays: milestoneDays },
      }, db);
      alerts.push(...generated);
    }
  } catch (error) {
    logger.error('Error checking streaks', { clientId, error: error.message });
  }

  return alerts;
}

/**
 * Checks if client scored "secure" on attachment assessment for the first time.
 * @private
 * @param {string} clientId
 * @returns {Promise<TherapistAlert[]>}
 */
async function _checkAttachmentSecurity(clientId, db) {
  const alerts = [];

  try {
    const attachmentAssessments = await db.assessment.findMany({
      where: { userId: clientId, type: 'attachment' },
      orderBy: { completedAt: 'asc' },
    });

    if (attachmentAssessments.length === 0) return alerts;

    const latest = attachmentAssessments[attachmentAssessments.length - 1];
    const latestStyle = _extractAttachmentStyle(latest.score);

    if (latestStyle !== 'secure') return alerts;

    // Check if this is the FIRST time scoring secure
    const previousSecure = attachmentAssessments.slice(0, -1).some((a) => {
      return _extractAttachmentStyle(a.score) === 'secure';
    });

    if (!previousSecure) {
      // Check if this was completed in the last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (latest.completedAt >= oneDayAgo) {
        const generated = await triggerTherapistAlert(clientId, ALERT_TYPE.MILESTONE, ALERT_SEVERITY.LOW, {
          title: '🎉 Attachment Milestone — First Secure Score',
          summary: 'Client scored "secure" on attachment assessment for the first time. This is a major breakthrough in attachment development.',
          details: {
            currentStyle: 'secure',
            previousStyles: attachmentAssessments.slice(0, -1).map((a) => _extractAttachmentStyle(a.score)),
            assessmentCount: attachmentAssessments.length,
          },
        }, db);
        alerts.push(...generated);
      }
    }
  } catch (error) {
    logger.error('Error checking attachment security', { clientId, error: error.message });
  }

  return alerts;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIVATE: UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generates a UUID v4.
 * @private
 * @returns {string}
 */
function _generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Extracts a total numeric score from an assessment score object.
 * Handles various score formats in the JSONB field.
 * @private
 * @param {Object} score - Assessment score JSONB
 * @returns {number}
 */
function _extractTotalScore(score) {
  if (!score) return 0;
  if (typeof score === 'number') return score;
  if (typeof score.total === 'number') return score.total;
  if (typeof score.overallScore === 'number') return score.overallScore;
  if (typeof score.score === 'number') return score.score;

  // Sum all numeric values as fallback
  const values = Object.values(score).filter((v) => typeof v === 'number');
  return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
}

/**
 * Extracts attachment style string from assessment score.
 * @private
 * @param {Object} score
 * @returns {string|null}
 */
function _extractAttachmentStyle(score) {
  if (!score) return null;
  if (typeof score.style === 'string') return score.style.toLowerCase();
  if (typeof score.attachmentStyle === 'string') return score.attachmentStyle.toLowerCase();
  if (typeof score.primaryStyle === 'string') return score.primaryStyle.toLowerCase();
  return null;
}

/**
 * Returns numeric rank for severity comparison.
 * @private
 * @param {string} severity
 * @returns {number}
 */
function _severityRank(severity) {
  const ranks = {
    [ALERT_SEVERITY.LOW]: 1,
    [ALERT_SEVERITY.MEDIUM]: 2,
    [ALERT_SEVERITY.HIGH]: 3,
    [ALERT_SEVERITY.CRITICAL]: 4,
  };
  return ranks[severity] || 0;
}

/**
 * Formats a crisis type enum into human-readable text.
 * @private
 * @param {string} crisisType
 * @returns {string}
 */
function _formatCrisisType(crisisType) {
  const labels = {
    AFFAIR_DISCOVERY: 'Affair Discovery',
    SEPARATION_THREAT: 'Separation Threat',
    ESCALATED_CONFLICT: 'Escalated Conflict',
    EMOTIONAL_FLOODING: 'Emotional Flooding',
    BETRAYAL_TRAUMA: 'Betrayal Trauma',
  };
  return labels[crisisType] || crisisType;
}

/**
 * Formats an assessment type enum into human-readable text.
 * @private
 * @param {string} type
 * @returns {string}
 */
function _formatAssessmentType(type) {
  const labels = {
    attachment: 'Attachment Style',
    personality: 'Personality',
    wellness_behavior: 'Wellness & Behavior',
    negative_patterns_closeness: 'Negative Patterns & Closeness',
    love_language: 'Love Language',
    human_needs: 'Human Needs',
    gottman_checkup: 'Gottman Checkup',
    emotional_intelligence: 'Emotional Intelligence',
    conflict_style: 'Conflict Style',
    differentiation: 'Differentiation',
    hormonal_health: 'Hormonal Health',
    physical_vitality: 'Physical Vitality',
  };
  return labels[type] || type;
}

/**
 * Builds a human-readable summary of a crisis detection result.
 * @private
 * @param {Object} crisisResult
 * @returns {string}
 */
function _buildCrisisSummary(crisisResult) {
  const parts = [];

  parts.push(`Level ${crisisResult.level} crisis detected.`);
  parts.push(`Primary type: ${_formatCrisisType(crisisResult.primaryType)}.`);

  if (crisisResult.safetyRisk) {
    parts.push('⚠️ SAFETY RISK INDICATORS PRESENT — self-harm or violence language detected.');
  }

  if (crisisResult.allTypes.length > 1) {
    parts.push(
      `Additional indicators: ${crisisResult.allTypes
        .filter((t) => t !== crisisResult.primaryType)
        .map(_formatCrisisType)
        .join(', ')}.`
    );
  }

  parts.push(`Detection confidence: ${Math.round(crisisResult.confidence * 100)}%.`);

  if (crisisResult.safetyResources.length > 0) {
    parts.push('Safety resources have been shown to the client.');
  }

  return parts.join(' ');
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  // Initialization
  init,

  // Core functions
  triggerTherapistAlert,
  generateRiskAlerts,
  generateMilestoneAlerts,
  getAlertDigest,

  // Crisis bridge
  handleCrisisDetection,

  // Constants
  ALERT_TYPE,
  ALERT_SEVERITY,
  ALERT_STATUS,
  NOTIFICATION_CHANNEL,
  DEFAULT_THRESHOLDS,
};
