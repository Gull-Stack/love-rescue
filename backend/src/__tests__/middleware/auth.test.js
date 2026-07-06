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
        trialEndsAt: true,
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

  test('sets req.user with the REAL subscription status (no force-premium)', async () => {
    const futureTrial = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      subscriptionStatus: 'trial',
      trialEndsAt: futureTrial,
      stripeCustomerId: 'cus_test',
      isPlatformAdmin: true,
      createdAt: new Date('2025-01-01')
    };

    const token = createToken({ userId: 'user-123' });
    req.headers.authorization = `Bearer ${token}`;
    req.prisma.user.findUnique.mockResolvedValue(mockUser);

    await authenticate(req, res, next);

    // The real DB status is preserved — no premium override.
    expect(req.user).toEqual(mockUser);
    expect(req.user.subscriptionStatus).toBe('trial');
    // Entitlement is resolved and attached (self trial → entitled, no partner query).
    expect(req.entitlement).toEqual(expect.objectContaining({
      isEntitled: true,
      isTrial: true,
      source: 'self'
    }));
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
  const futureTrial = () => new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  const pastTrial = () => new Date(Date.now() - 24 * 60 * 60 * 1000);

  beforeEach(() => {
    req = createMockReq();
    // Default: no active relationship (solo) so partner lookups resolve to null.
    req.prisma.relationship = { findFirst: jest.fn().mockResolvedValue(null) };
    res = createMockRes();
    next = jest.fn();
  });

  test('401 when no authenticated user', async () => {
    await requireSubscription(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('402 SUBSCRIPTION_REQUIRED when not entitled (expired, no trial, no partner)', async () => {
    req.user = { id: 'user-1', subscriptionStatus: 'expired', trialEndsAt: pastTrial() };
    await requireSubscription(req, res, next);
    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'SUBSCRIPTION_REQUIRED' }));
    expect(next).not.toHaveBeenCalled();
  });

  test('passes on a live trial', async () => {
    req.user = { id: 'user-2', subscriptionStatus: 'trial', trialEndsAt: futureTrial() };
    await requireSubscription(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('passes on a paid subscription', async () => {
    req.user = { id: 'user-3', subscriptionStatus: 'paid' };
    await requireSubscription(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('passes when covered by an entitled partner', async () => {
    req.user = { id: 'user-4', subscriptionStatus: 'expired', trialEndsAt: pastTrial() };
    req.prisma.relationship.findFirst.mockResolvedValue({
      user1Id: 'user-4',
      user2Id: 'partner-1',
      user1: { subscriptionStatus: 'expired', trialEndsAt: null },
      user2: { subscriptionStatus: 'premium', trialEndsAt: null }
    });
    await requireSubscription(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.entitlement.coveredByPartner).toBe(true);
  });

  test('reuses a pre-resolved req.entitlement without querying', async () => {
    req.user = { id: 'user-5', subscriptionStatus: 'expired' };
    req.entitlement = { isEntitled: true, tier: 'paid' };
    await requireSubscription(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.prisma.relationship.findFirst).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// requirePremium
// ---------------------------------------------------------------------------
describe('requirePremium', () => {
  let req, res, next;

  beforeEach(() => {
    req = createMockReq();
    req.prisma.relationship = { findFirst: jest.fn().mockResolvedValue(null) };
    res = createMockRes();
    next = jest.fn();
  });

  test('401 when no authenticated user', async () => {
    await requirePremium(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('402 SUBSCRIPTION_REQUIRED when not entitled at all', async () => {
    req.user = { id: 'user-1', subscriptionStatus: 'expired', trialEndsAt: null };
    await requirePremium(req, res, next);
    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'SUBSCRIPTION_REQUIRED' }));
    expect(next).not.toHaveBeenCalled();
  });

  test('402 PREMIUM_REQUIRED when entitled only at paid tier', async () => {
    req.user = { id: 'user-2', subscriptionStatus: 'paid' };
    await requirePremium(req, res, next);
    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'PREMIUM_REQUIRED' }));
    expect(next).not.toHaveBeenCalled();
  });

  test('passes on a premium subscription', async () => {
    req.user = { id: 'user-3', subscriptionStatus: 'premium' };
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
