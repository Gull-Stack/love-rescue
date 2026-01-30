const jwt = require('jsonwebtoken');

// Mock the logger to suppress output during tests
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

const { authenticate, requireSubscription, requirePremium, optionalAuth } = require('../../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET; // Set by setup.js: 'test-jwt-secret-key-for-testing'

/**
 * Helper: create a mock Express request object.
 */
function createMockReq(overrides = {}) {
  return {
    headers: {},
    prisma: {
      user: {
        findUnique: jest.fn()
      }
    },
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

/**
 * Helper: generate a valid JWT for testing.
 */
function createToken(payload, options = {}) {
  return jwt.sign(payload, JWT_SECRET, options);
}

// ---------------------------------------------------------------------------
// authenticate
// ---------------------------------------------------------------------------
describe('authenticate', () => {
  let req, res, next;

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    next = jest.fn();
  });

  test('returns 401 with no authorization header', async () => {
    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 with malformed header (no Bearer prefix)', async () => {
    req.headers.authorization = 'Token some-token-value';

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 for expired token', async () => {
    // Create a token that already expired
    const token = createToken({ userId: 'user-123' }, { expiresIn: '-1s' });
    req.headers.authorization = `Bearer ${token}`;

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token expired' });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 for invalid token', async () => {
    req.headers.authorization = 'Bearer this.is.not.a.valid.jwt';

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when user not found in database', async () => {
    const token = createToken({ userId: 'nonexistent-user' });
    req.headers.authorization = `Bearer ${token}`;
    req.prisma.user.findUnique.mockResolvedValue(null);

    await authenticate(req, res, next);

    expect(req.prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'nonexistent-user' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        subscriptionStatus: true,
        stripeCustomerId: true,
        createdAt: true
      }
    });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    expect(next).not.toHaveBeenCalled();
  });

  test('sets req.user and calls next on valid token', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      subscriptionStatus: 'trial',
      stripeCustomerId: 'cus_test',
      createdAt: new Date('2025-01-01')
    };

    const token = createToken({ userId: 'user-123' });
    req.headers.authorization = `Bearer ${token}`;
    req.prisma.user.findUnique.mockResolvedValue(mockUser);

    await authenticate(req, res, next);

    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// requireSubscription
// ---------------------------------------------------------------------------
describe('requireSubscription', () => {
  let req, res, next;

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    next = jest.fn();
  });

  test('returns 401 when no user on request', async () => {
    // req.user is undefined by default
    await requireSubscription(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 403 when subscription is expired', async () => {
    req.user = { id: 'user-1', subscriptionStatus: 'expired' };

    await requireSubscription(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Subscription expired',
      code: 'SUBSCRIPTION_EXPIRED'
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next for trial subscription status', async () => {
    req.user = { id: 'user-1', subscriptionStatus: 'trial' };

    await requireSubscription(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('calls next for paid subscription status', async () => {
    req.user = { id: 'user-1', subscriptionStatus: 'paid' };

    await requireSubscription(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// requirePremium
// ---------------------------------------------------------------------------
describe('requirePremium', () => {
  let req, res, next;

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    next = jest.fn();
  });

  test('returns 401 when no user on request', async () => {
    await requirePremium(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 403 for non-premium user (trial)', async () => {
    req.user = { id: 'user-1', subscriptionStatus: 'trial' };

    await requirePremium(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Premium subscription required',
      code: 'PREMIUM_REQUIRED'
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next for premium user', async () => {
    req.user = { id: 'user-1', subscriptionStatus: 'premium' };

    await requirePremium(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// optionalAuth
// ---------------------------------------------------------------------------
describe('optionalAuth', () => {
  let req, res, next;

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    next = jest.fn();
  });

  test('sets user when valid token provided', async () => {
    const mockUser = {
      id: 'user-456',
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      subscriptionStatus: 'premium'
    };

    const token = createToken({ userId: 'user-456' });
    req.headers.authorization = `Bearer ${token}`;
    req.prisma.user.findUnique.mockResolvedValue(mockUser);

    await optionalAuth(req, res, next);

    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('calls next without user when no token provided', async () => {
    // No authorization header set
    await optionalAuth(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.prisma.user.findUnique).not.toHaveBeenCalled();
  });

  test('calls next without user when invalid token provided', async () => {
    req.headers.authorization = 'Bearer invalid.jwt.token';

    await optionalAuth(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
