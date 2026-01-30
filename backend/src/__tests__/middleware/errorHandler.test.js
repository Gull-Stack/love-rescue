// Mock the logger to suppress output during tests
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

const { errorHandler } = require('../../middleware/errorHandler');

/**
 * Helper: create a mock Express request object.
 */
function createMockReq(overrides = {}) {
  return {
    path: '/api/test',
    method: 'GET',
    user: undefined,
    ...overrides
  };
}

/**
 * Helper: create a mock Express response object with chaining support.
 */
function createMockRes() {
  const res = {
    statusCode: null,
    _json: null,
    status: jest.fn(function (code) {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn(function (data) {
      res._json = data;
      return res;
    })
  };
  return res;
}

describe('errorHandler', () => {
  let req, res, next;

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    next = jest.fn();
  });

  test('returns 409 for Prisma P2002 unique constraint error', () => {
    const err = new Error('Unique constraint failed');
    err.code = 'P2002';

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: 'A record with this value already exists'
    });
  });

  test('returns 404 for Prisma P2025 not found error', () => {
    const err = new Error('Record to update not found');
    err.code = 'P2025';

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Record not found'
    });
  });

  test('returns 400 for ValidationError', () => {
    const err = new Error('Email is required');
    err.name = 'ValidationError';

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Email is required'
    });
  });

  test('returns 401 for JsonWebTokenError', () => {
    const err = new Error('jwt malformed');
    err.name = 'JsonWebTokenError';

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Authentication failed'
    });
  });

  test('returns 401 for TokenExpiredError', () => {
    const err = new Error('jwt expired');
    err.name = 'TokenExpiredError';

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Authentication failed'
    });
  });

  test('returns 500 with generic message in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const err = new Error('Something sensitive broke internally');

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'An unexpected error occurred'
    });
    // The actual error message should NOT leak in production
    expect(res._json.error).not.toContain('sensitive');

    process.env.NODE_ENV = originalEnv;
  });

  test('returns custom statusCode when set on error', () => {
    const err = new Error('Rate limit exceeded');
    err.statusCode = 429;

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    // In test env (non-production), the real message is returned
    expect(res.json).toHaveBeenCalledWith({
      error: 'Rate limit exceeded'
    });
  });
});
