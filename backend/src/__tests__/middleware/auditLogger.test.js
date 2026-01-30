const EventEmitter = require('events');

// Mock the logger to suppress output during tests
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

const logger = require('../../utils/logger');
const { auditLogger } = require('../../middleware/auditLogger');

/**
 * Helper: create a mock Express request object.
 */
function createMockReq(overrides = {}) {
  return {
    method: 'GET',
    path: '/api/exercises',
    ip: '127.0.0.1',
    query: {},
    user: undefined,
    get: jest.fn((header) => {
      if (header === 'User-Agent') return 'jest-test-agent';
      return undefined;
    }),
    prisma: {
      auditLog: {
        create: jest.fn().mockResolvedValue({})
      }
    },
    connection: { remoteAddress: '127.0.0.1' },
    ...overrides
  };
}

/**
 * Helper: create a mock Express response object backed by EventEmitter.
 * This allows us to emit 'finish' to simulate the response completing.
 */
function createMockRes() {
  const emitter = new EventEmitter();
  const res = Object.assign(emitter, {
    statusCode: 200,
    body: undefined,
    send: jest.fn(function (body) {
      res.body = body;
      return res;
    })
  });
  return res;
}

describe('auditLogger', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = createMockReq();
    res = createMockRes();
    next = jest.fn();
  });

  test('calls next() immediately', async () => {
    await auditLogger(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test('logs API request on response finish', async () => {
    req.user = { id: 'user-789' };

    await auditLogger(req, res, next);

    // Emit finish to simulate the response completing
    res.emit('finish');

    // Allow any pending microtasks (async finish handler) to flush
    await new Promise((resolve) => setImmediate(resolve));

    expect(logger.info).toHaveBeenCalledWith(
      'API Request',
      expect.objectContaining({
        userId: 'user-789',
        action: 'GET /api/exercises',
        resource: 'exercises',
        ipAddress: '127.0.0.1',
        userAgent: 'jest-test-agent',
        metadata: expect.objectContaining({
          statusCode: 200
        })
      })
    );
  });

  test('creates audit log in database for /api/ paths', async () => {
    req.path = '/api/sessions';
    req.user = { id: 'user-100' };

    await auditLogger(req, res, next);

    // Emit finish to trigger audit logging
    res.emit('finish');

    // Allow async finish handler to run
    await new Promise((resolve) => setImmediate(resolve));

    expect(req.prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-100',
        action: 'GET /api/sessions',
        resource: 'sessions',
        ipAddress: '127.0.0.1',
        userAgent: 'jest-test-agent',
        metadata: expect.objectContaining({
          statusCode: 200
        })
      })
    });
  });

  test('does not create audit log for non-API paths', async () => {
    req.path = '/health';

    await auditLogger(req, res, next);

    // Emit finish
    res.emit('finish');

    // Allow async finish handler to run
    await new Promise((resolve) => setImmediate(resolve));

    // logger.info should still be called (logging always happens)
    expect(logger.info).toHaveBeenCalled();

    // But the database create should NOT have been called
    expect(req.prisma.auditLog.create).not.toHaveBeenCalled();
  });

  test('handles errors in audit log creation gracefully', async () => {
    req.path = '/api/exercises';
    req.prisma.auditLog.create.mockRejectedValue(new Error('DB connection lost'));

    await auditLogger(req, res, next);

    // Emit finish to trigger audit logging
    res.emit('finish');

    // Allow async finish handler (including the caught error path) to run
    await new Promise((resolve) => setImmediate(resolve));

    // The error should be logged, not thrown
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to save audit log',
      expect.objectContaining({ error: 'DB connection lost' })
    );

    // next() should have been called (the middleware does not block on errors)
    expect(next).toHaveBeenCalledTimes(1);
  });
});
