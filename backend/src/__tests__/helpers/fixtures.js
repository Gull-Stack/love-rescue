/**
 * Test fixture factory functions.
 * Each factory returns a realistic data object with sensible defaults
 * that can be overridden via the `overrides` parameter.
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// Pre-compute a bcrypt hash of 'password123' to avoid async overhead in sync factories.
// bcryptjs supports synchronous hashing.
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync('password123', 10);

/**
 * Create a mock User object.
 *
 * @param {Object} [overrides] - Fields to override
 * @returns {Object} User fixture
 */
function createUser(overrides = {}) {
  const now = new Date();
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  return {
    id: uuidv4(),
    email: `testuser-${uuidv4().substring(0, 8)}@example.com`,
    passwordHash: DEFAULT_PASSWORD_HASH,
    googleId: null,
    authProvider: 'email',
    firstName: 'Test',
    lastName: 'User',
    subscriptionStatus: 'trial',
    trialEndsAt,
    createdAt: now,
    updatedAt: now,
    stripeCustomerId: null,
    biometricKey: null,
    biometricKeyId: null,
    ...overrides
  };
}

/**
 * Create a mock Relationship object.
 *
 * @param {Object} [overrides] - Fields to override
 * @returns {Object} Relationship fixture
 */
function createRelationship(overrides = {}) {
  const now = new Date();

  return {
    id: uuidv4(),
    user1Id: uuidv4(),
    user2Id: null,
    inviteCode: 'TESTCODE',
    inviteEmail: null,
    sharedConsent: false,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

/**
 * Create a mock Assessment object.
 *
 * @param {Object} [overrides] - Fields to override
 * @returns {Object} Assessment fixture
 */
function createAssessment(overrides = {}) {
  return {
    id: uuidv4(),
    userId: uuidv4(),
    type: 'attachment',
    responses: {},
    score: {
      style: 'secure',
      anxietyScore: 20,
      avoidanceScore: 20,
      secureScore: 80
    },
    completedAt: new Date(),
    ...overrides
  };
}

/**
 * Create a mock Matchup object.
 *
 * @param {Object} [overrides] - Fields to override
 * @returns {Object} Matchup fixture
 */
function createMatchup(overrides = {}) {
  return {
    id: uuidv4(),
    relationshipId: uuidv4(),
    score: 75,
    alignments: {
      compatible: [],
      misses: []
    },
    details: {},
    generatedAt: new Date(),
    ...overrides
  };
}

/**
 * Create a mock DailyLog object.
 *
 * @param {Object} [overrides] - Fields to override
 * @returns {Object} DailyLog fixture
 */
function createDailyLog(overrides = {}) {
  const now = new Date();

  return {
    id: uuidv4(),
    userId: uuidv4(),
    date: now,
    positiveCount: 5,
    negativeCount: 1,
    ratio: 5.0,
    journalEntry: '',
    bidsTurned: 3,
    closenessScore: 7,
    mood: 7,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

/**
 * Create a mock Strategy object.
 *
 * @param {Object} [overrides] - Fields to override
 * @returns {Object} Strategy fixture
 */
function createStrategy(overrides = {}) {
  const now = new Date();
  const startDate = new Date(now);
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 7);

  return {
    id: uuidv4(),
    relationshipId: uuidv4(),
    cycleNumber: 1,
    week: 1,
    dailyActivities: {
      monday: ['Express gratitude to your partner'],
      tuesday: ['Plan a small surprise'],
      wednesday: ['Have a 10-minute check-in conversation'],
      thursday: ['Practice active listening'],
      friday: ['Share a positive memory together'],
      saturday: ['Do an activity together'],
      sunday: ['Reflect on the week together']
    },
    weeklyGoals: [
      'Have at least 3 meaningful conversations',
      'Express appreciation daily',
      'Spend quality time together without screens'
    ],
    progress: 0,
    isActive: true,
    startDate,
    endDate,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

/**
 * Create a mock Meeting object.
 *
 * @param {Object} [overrides] - Fields to override
 * @returns {Object} Meeting fixture
 */
function createMeeting(overrides = {}) {
  const now = new Date();
  const scheduledAt = new Date(now);
  scheduledAt.setDate(scheduledAt.getDate() + 1);

  return {
    id: uuidv4(),
    relationshipId: uuidv4(),
    mediatorId: uuidv4(),
    scheduledAt,
    duration: 30,
    meetLink: 'https://meet.google.com/test-meeting',
    calendarEventId: 'evt_test_123',
    status: 'scheduled',
    week: 1,
    createdBy: uuidv4(),
    partnerConsent: false,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

/**
 * Create a mock Mediator object.
 *
 * @param {Object} [overrides] - Fields to override
 * @returns {Object} Mediator fixture
 */
function createMediator(overrides = {}) {
  const now = new Date();

  return {
    id: uuidv4(),
    name: 'Dr. Test Mediator',
    bio: 'Experienced relationship mediator specializing in communication.',
    googleCalendarId: 'mediator-test@group.calendar.google.com',
    status: 'active',
    rate: 75.00,
    availabilityRules: {
      monday: [{ start: '09:00', end: '17:00' }],
      tuesday: [{ start: '09:00', end: '17:00' }],
      wednesday: [{ start: '09:00', end: '17:00' }],
      thursday: [{ start: '09:00', end: '17:00' }],
      friday: [{ start: '09:00', end: '15:00' }],
      saturday: [],
      sunday: []
    },
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

/**
 * Create a mock TherapistTask object.
 *
 * @param {Object} [overrides] - Fields to override
 * @returns {Object} TherapistTask fixture
 */
function createTherapistTask(overrides = {}) {
  const now = new Date();
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + 7);

  return {
    id: uuidv4(),
    relationshipId: uuidv4(),
    therapistEmail: 'therapist@example.com',
    taskDescription: 'Practice the Gottman Dreams Within Conflict exercise',
    notes: 'Focus on understanding underlying needs',
    dueDate,
    completed: false,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

module.exports = {
  createUser,
  createRelationship,
  createAssessment,
  createMatchup,
  createDailyLog,
  createStrategy,
  createMeeting,
  createMediator,
  createTherapistTask,
  DEFAULT_PASSWORD_HASH
};
