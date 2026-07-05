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
        isPlatformAdmin: true,
        tokenVersion: true,
        createdAt: true
      }
    });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    expect(next).not.toHaveBeenCalled();
  });

  test('rejects token whose tokenVersion no longer matches the DB (revoked session)', async () => {
    // Token minted before a password change/reset or logout (version 0),
    // but the user's tokenVersion has since been bumped to 1.
    const token = createToken({ userId: 'user-123', tokenVersion: 0 });
    req.headers.authorization = `Bearer ${token}`;
    req.prisma.user.findUnique.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      tokenVersion: 1
    });

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token revoked', code: 'TOKEN_REVOKED' });
    expect(next).not.toHaveBeenCalled();
  });

  test('treats legacy token without tokenVersion claim as version 0 (grace period)', async () => {
    // Legacy tokens (issued before this change) carry no claim → version 0.
    // They stay valid while the user is still at version 0...
    const legacyToken = createToken({ userId: 'user-123' });
    req.headers.authorization = `Bearer ${legacyToken}`;
    req.prisma.user.findUnique.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      tokenVersion: 0
    });

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('rejects legacy token once the user tokenVersion has been bumped', async () => {
    // ...and die as soon as the version is bumped for the first time.
    const legacyToken = createToken({ userId: 'user-123' });
    req.headers.authorization = `Bearer ${legacyToken}`;
    req.prisma.user.findUnique.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      tokenVersion: 2
    });

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token revoked', code: 'TOKEN_REVOKED' });
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts token whose tokenVersion matches the DB value', async () => {
    const token = createToken({ userId: 'user-123', tokenVersion: 3 });
    req.headers.authorization = `Bearer ${token}`;
    req.prisma.user.findUnique.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      tokenVersion: 3
    });

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    // tokenVersion is an internal field — it must not leak onto req.user
    expect(req.user.tokenVersion).toBeUndefined();
  });

  test('sets req.user and calls next on valid token', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      subscriptionStatus: 'trial',
    isPlatformAdmin: false,
      stripeCustomerId: 'cus_test',
      isPlatformAdmin: true,
      createdAt: new Date('2025-01-01')
    };

    const token = createToken({ userId: 'user-123' });
    req.headers.authorization = `Bearer ${token}`;
    req.prisma.user.findUnique.mockResolvedValue(mockUser);

    await authenticate(req, res, next);

    // App is free — all users get upgraded to premium regardless of DB status
    expect(req.user).toEqual({ ...mockUser, subscriptionStatus: 'premium' });
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

  test('always calls next — app is fully free (no subscription enforcement)', async () => {
    // No user, expired, trial, paid — all should pass through
    await requireSubscription(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();

    next.mockClear();
    req.user = { id: 'user-1', subscriptionStatus: 'expired' };
    await requireSubscription(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();

    next.mockClear();
    req.user = { id: 'user-2', subscriptionStatus: 'trial' };
    await requireSubscription(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();

    next.mockClear();
    req.user = { id: 'user-3', subscriptionStatus: 'premium' };
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

  test('always calls next — app is fully free (no premium enforcement)', async () => {
    // No user, trial, premium — all should pass through
    await requirePremium(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();

    next.mockClear();
    req.user = { id: 'user-1', subscriptionStatus: 'trial' };
    await requirePremium(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();

    next.mockClear();
    req.user = { id: 'user-2', subscriptionStatus: 'premium' };
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
