/**
 * Mock Prisma client for testing.
 * Provides jest.fn() mocks for all 14 Prisma models and their standard operations.
 */

const PRISMA_METHODS = [
  'findUnique',
  'findFirst',
  'findMany',
  'create',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'upsert',
  'count'
];

const PRISMA_MODELS = [
  'user',
  'relationship',
  'assessment',
  'matchup',
  'dailyLog',
  'strategy',
  'therapistTask',
  'auditLog',
  'token',
  'dailyInsight',
  'dailyVideo',
  'videoCompletion',
  'mediator',
  'meeting'
];

/**
 * Create a fresh mock model with jest.fn() for each standard Prisma method.
 * @returns {Object} Mock model object
 */
function createMockModel() {
  const model = {};
  for (const method of PRISMA_METHODS) {
    model[method] = jest.fn();
  }
  return model;
}

/**
 * Create a complete mock Prisma client with all 14 models.
 * Each model has mocked findUnique, findFirst, findMany, create, update,
 * updateMany, delete, deleteMany, upsert, and count methods.
 *
 * @returns {Object} Mock Prisma client
 */
function createMockPrisma() {
  const mockPrisma = {};
  for (const model of PRISMA_MODELS) {
    mockPrisma[model] = createMockModel();
  }

  // Add Prisma client utility methods
  mockPrisma.$connect = jest.fn().mockResolvedValue(undefined);
  mockPrisma.$disconnect = jest.fn().mockResolvedValue(undefined);
  mockPrisma.$transaction = jest.fn(async (fn) => {
    if (typeof fn === 'function') {
      return fn(mockPrisma);
    }
    return Promise.all(fn);
  });

  return mockPrisma;
}

// Export both the factory function and a default instance
const mockPrisma = createMockPrisma();

module.exports = {
  createMockPrisma,
  mockPrisma
};
