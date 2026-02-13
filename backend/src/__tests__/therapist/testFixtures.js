/**
 * Shared test fixtures for LoveRescue Therapist Edition tests.
 */

'use strict';

// ═══════════════════════════════════════════════════════════════
// USER PROFILES
// ═══════════════════════════════════════════════════════════════

const mockUser1 = {
  id: 'user-1-uuid',
  firstName: 'Sarah',
  lastName: 'Chen',
  email: 'sarah@example.com',
};

const mockUser2 = {
  id: 'user-2-uuid',
  firstName: 'James',
  lastName: 'Chen',
  email: 'james@example.com',
};

const mockTherapist = {
  id: 'therapist-1-uuid',
  email: 'dr.smith@therapy.com',
  firstName: 'Emily',
  lastName: 'Smith',
  isActive: true,
  licenseNumber: 'PSY12345',
  licenseState: 'CA',
};

const mockRelationship = {
  id: 'rel-1-uuid',
  user1Id: 'user-1-uuid',
  user2Id: 'user-2-uuid',
  status: 'active',
  user1TherapistConsent: true,
  user2TherapistConsent: true,
  sharedConsent: true,
};

// ═══════════════════════════════════════════════════════════════
// ASSESSMENT DATA
// ═══════════════════════════════════════════════════════════════

function makeAssessment(userId, type, score, completedAt) {
  return {
    id: `assess-${type}-${userId}`,
    userId,
    type,
    score,
    completedAt: completedAt || new Date(),
  };
}

const attachmentAnxious = {
  style: 'anxious',
  secondary: 'secure',
  dimensions: { anxiety: 7, avoidance: 2 },
  anxietyScore: 7,
  avoidanceScore: 2,
  total: 45,
};

const attachmentAvoidant = {
  style: 'avoidant',
  secondary: 'secure',
  dimensions: { anxiety: 2, avoidance: 8 },
  anxietyScore: 2,
  avoidanceScore: 8,
  total: 40,
};

const attachmentSecure = {
  style: 'secure',
  secondary: null,
  dimensions: { anxiety: 2, avoidance: 2 },
  anxietyScore: 2,
  avoidanceScore: 2,
  total: 80,
};

const attachmentFearfulAvoidant = {
  style: 'fearful_avoidant',
  secondary: 'anxious',
  dimensions: { anxiety: 8, avoidance: 7 },
  anxietyScore: 8,
  avoidanceScore: 7,
  total: 30,
};

const loveLanguageWords = {
  primary: 'words_of_affirmation',
  secondary: 'quality_time',
  scores: { words_of_affirmation: 10, quality_time: 7, acts_of_service: 3, physical_touch: 5, gifts: 1 },
  total: 26,
};

const loveLanguageTouch = {
  primary: 'physical_touch',
  secondary: 'acts_of_service',
  scores: { words_of_affirmation: 2, quality_time: 3, acts_of_service: 7, physical_touch: 10, gifts: 4 },
  total: 26,
};

const conflictStyleVolatile = {
  style: 'volatile',
  intensity: 8,
  repairAttempts: 3,
  total: 55,
};

const conflictStyleAvoiding = {
  style: 'avoiding',
  intensity: 2,
  repairAttempts: 6,
  total: 50,
};

const conflictStyleValidating = {
  style: 'validating',
  intensity: 5,
  repairAttempts: 7,
  total: 70,
};

const gottmanCheckupHealthy = {
  friendship: 80, conflict: 70, sharedMeaning: 75,
  positiveToNegativeRatio: 6.5, horsemen: { criticism: 2, contempt: 1, defensiveness: 3, stonewalling: 1 },
  total: 75, overallScore: 75,
};

const gottmanCheckupDistressed = {
  friendship: 30, conflict: 25, sharedMeaning: 20,
  positiveToNegativeRatio: 1.5, horsemen: { criticism: 8, contempt: 6, defensiveness: 7, stonewalling: 8 },
  total: 25, overallScore: 25,
};

// ═══════════════════════════════════════════════════════════════
// PARTNER ASSESSMENT ARRAYS
// ═══════════════════════════════════════════════════════════════

const partner1Anxious = [
  makeAssessment('user-1-uuid', 'attachment', attachmentAnxious),
  makeAssessment('user-1-uuid', 'love_language', loveLanguageWords),
  makeAssessment('user-1-uuid', 'conflict_style', conflictStyleVolatile),
  makeAssessment('user-1-uuid', 'gottman_checkup', gottmanCheckupHealthy),
];

const partner2Avoidant = [
  makeAssessment('user-2-uuid', 'attachment', attachmentAvoidant),
  makeAssessment('user-2-uuid', 'love_language', loveLanguageTouch),
  makeAssessment('user-2-uuid', 'conflict_style', conflictStyleAvoiding),
  makeAssessment('user-2-uuid', 'gottman_checkup', gottmanCheckupDistressed),
];

const partner1Secure = [
  makeAssessment('user-1-uuid', 'attachment', attachmentSecure),
  makeAssessment('user-1-uuid', 'love_language', loveLanguageWords),
  makeAssessment('user-1-uuid', 'conflict_style', conflictStyleValidating),
  makeAssessment('user-1-uuid', 'gottman_checkup', gottmanCheckupHealthy),
];

const partner2Secure = [
  makeAssessment('user-2-uuid', 'attachment', attachmentSecure),
  makeAssessment('user-2-uuid', 'love_language', loveLanguageWords),
  makeAssessment('user-2-uuid', 'conflict_style', conflictStyleValidating),
  makeAssessment('user-2-uuid', 'gottman_checkup', gottmanCheckupHealthy),
];

const partner1FearfulAvoidant = [
  makeAssessment('user-1-uuid', 'attachment', attachmentFearfulAvoidant),
  makeAssessment('user-1-uuid', 'love_language', loveLanguageTouch),
  makeAssessment('user-1-uuid', 'conflict_style', conflictStyleVolatile),
];

// ═══════════════════════════════════════════════════════════════
// DAILY LOG DATA
// ═══════════════════════════════════════════════════════════════

function makeDailyLog(userId, daysAgo, overrides = {}) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(0, 0, 0, 0);
  return {
    id: `log-${userId}-${daysAgo}`,
    userId,
    date,
    createdAt: date,
    mood: overrides.mood ?? 7,
    closenessScore: overrides.closenessScore ?? 6,
    positiveCount: overrides.positiveCount ?? 5,
    negativeCount: overrides.negativeCount ?? 1,
    therapistVisible: overrides.therapistVisible ?? true,
    ...overrides,
  };
}

function makeDailyLogs(userId, count, moodTrend = 'stable') {
  return Array.from({ length: count }, (_, i) => {
    let mood = 7;
    if (moodTrend === 'declining') mood = Math.max(1, 8 - i * 0.5);
    if (moodTrend === 'improving') mood = Math.min(10, 4 + i * 0.5);
    return makeDailyLog(userId, count - i - 1, { mood: Math.round(mood) });
  });
}

// ═══════════════════════════════════════════════════════════════
// THERAPIST ALERT DATA
// ═══════════════════════════════════════════════════════════════

const mockTherapistAssignment = {
  id: 'assign-1-uuid',
  therapistId: 'therapist-1-uuid',
  relationshipId: 'rel-1-uuid',
  status: 'active',
};

const mockTherapistClient = {
  id: 'tc-1-uuid',
  therapistId: 'therapist-1-uuid',
  clientId: 'user-1-uuid',
  coupleId: 'rel-1-uuid',
  consentStatus: 'GRANTED',
  permissionLevel: 'STANDARD',
  consentGrantedAt: new Date(),
};

// ═══════════════════════════════════════════════════════════════
// INTEGRATION PARTNER DATA
// ═══════════════════════════════════════════════════════════════

const mockIntegrationPartner = {
  id: 'partner-1-uuid',
  name: 'SuperTool',
  apiKey: 'test-api-key-123',
  apiSecret: '$2a$12$hashedsecrethere', // bcrypt hash of 'test-secret'
  status: 'active',
  webhookUrl: null,
  webhookSecret: null,
  ipAllowlist: null,
  rateLimitPerMin: 100,
};

// ═══════════════════════════════════════════════════════════════
// COURSE PROGRESS DATA
// ═══════════════════════════════════════════════════════════════

const mockCourseProgress = {
  id: 'cp-1-uuid',
  userId: 'user-1-uuid',
  currentWeek: 3,
  isActive: true,
  completedAt: null,
  completedWeeks: [1, 2],
  weeklyStrategies: [
    { weekNumber: 1, theme: 'Self-Awareness', completedDays: 7, completedAt: new Date(Date.now() - 14 * 86400000), expertName: 'Levine' },
    { weekNumber: 2, theme: 'Communication', completedDays: 7, completedAt: new Date(Date.now() - 7 * 86400000), expertName: 'Gottman' },
    { weekNumber: 3, theme: 'Emotional Regulation', completedDays: 3, completedAt: null, expertName: 'Gottman' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// MOCK PRISMA CLIENT FACTORY
// ═══════════════════════════════════════════════════════════════

function createMockPrisma(overrides = {}) {
  const defaultMocks = {
    user: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
    therapist: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    relationship: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    assessment: { findMany: jest.fn().mockResolvedValue([]) },
    dailyLog: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn() },
    therapistAssignment: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    therapistClient: { findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]), create: jest.fn(), update: jest.fn() },
    therapistAlert: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), update: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    therapistTask: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), update: jest.fn() },
    token: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    consentLog: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    accessLog: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    integrationAccessLog: { create: jest.fn() },
    integrationPartner: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    gratitudeEntry: { findMany: jest.fn().mockResolvedValue([]) },
    sessionPrepReport: { create: jest.fn().mockResolvedValue({ id: 'spr-1' }) },
    courseProgress: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    matchup: { findMany: jest.fn().mockResolvedValue([]) },
    sharedGoal: { findMany: jest.fn().mockResolvedValue([]) },
    strategy: { findMany: jest.fn().mockResolvedValue([]) },
  };

  // Deep merge overrides
  for (const [model, methods] of Object.entries(overrides)) {
    if (defaultMocks[model]) {
      Object.assign(defaultMocks[model], methods);
    } else {
      defaultMocks[model] = methods;
    }
  }

  return defaultMocks;
}

module.exports = {
  // Users
  mockUser1,
  mockUser2,
  mockTherapist,
  mockRelationship,

  // Assessments
  makeAssessment,
  attachmentAnxious,
  attachmentAvoidant,
  attachmentSecure,
  attachmentFearfulAvoidant,
  loveLanguageWords,
  loveLanguageTouch,
  conflictStyleVolatile,
  conflictStyleAvoiding,
  conflictStyleValidating,
  gottmanCheckupHealthy,
  gottmanCheckupDistressed,

  // Partner assessment arrays
  partner1Anxious,
  partner2Avoidant,
  partner1Secure,
  partner2Secure,
  partner1FearfulAvoidant,

  // Daily logs
  makeDailyLog,
  makeDailyLogs,

  // Therapist data
  mockTherapistAssignment,
  mockTherapistClient,
  mockIntegrationPartner,
  mockCourseProgress,

  // Prisma mock factory
  createMockPrisma,
};
