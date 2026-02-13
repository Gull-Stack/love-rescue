/**
 * Tests for integration routes + integrationAuth middleware
 */

'use strict';

// Must set env BEFORE any require that loads integrationAuth
process.env.INTEGRATION_JWT_SECRET = 'test-integration-secret-key-for-testing';

// Mock jsonwebtoken BEFORE requiring integrationAuth
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
}));

const jwt = require('jsonwebtoken');

const {
  authenticateIntegration,
  integrationRateLimit,
  checkIpAllowlist,
  logIntegrationAccess,
} = require('../../middleware/integrationAuth');

const { createMockPrisma, mockIntegrationPartner } = require('./testFixtures');

// ═══════════════════════════════════════════════════════════════
// authenticateIntegration
// ═══════════════════════════════════════════════════════════════

describe('authenticateIntegration', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it('should reject request without Authorization header', () => {
    authenticateIntegration(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Authorization') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject non-Bearer token', () => {
    req.headers.authorization = 'Basic abc123';

    authenticateIntegration(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should accept valid integration token', () => {
    req.headers.authorization = 'Bearer valid-token';
    jwt.verify.mockReturnValue({
      type: 'integration',
      partnerId: 'partner-1',
      partnerName: 'SuperTool',
      therapistId: 'therapist-1',
    });

    authenticateIntegration(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.integrationPartner).toEqual({ id: 'partner-1', name: 'SuperTool' });
    expect(req.integrationTherapist).toEqual({ id: 'therapist-1' });
  });

  it('should reject token with wrong type', () => {
    req.headers.authorization = 'Bearer valid-token';
    jwt.verify.mockReturnValue({ type: 'user', partnerId: 'p1' });

    authenticateIntegration(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid token type' })
    );
  });

  it('should return 401 for expired token', () => {
    req.headers.authorization = 'Bearer expired-token';
    jwt.verify.mockImplementation(() => {
      const err = new Error('Token expired');
      err.name = 'TokenExpiredError';
      throw err;
    });

    authenticateIntegration(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'TOKEN_EXPIRED' })
    );
  });

  it('should return 401 for invalid token', () => {
    req.headers.authorization = 'Bearer bad-token';
    jwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    authenticateIntegration(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});

// ═══════════════════════════════════════════════════════════════
// integrationRateLimit
// ═══════════════════════════════════════════════════════════════

describe('integrationRateLimit', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      integrationPartner: { id: `test-partner-${Date.now()}-${Math.random()}`, rateLimitPerMin: 5 },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };
    next = jest.fn();
  });

  it('should allow requests within limit', () => {
    integrationRateLimit(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
  });

  it('should block requests exceeding limit', () => {
    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      const n = jest.fn();
      integrationRateLimit(req, res, n);
    }

    // Next request should be blocked
    const blockedNext = jest.fn();
    integrationRateLimit(req, res, blockedNext);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(blockedNext).not.toHaveBeenCalled();
  });

  it('should return 500 if partner not set', () => {
    req.integrationPartner = null;

    integrationRateLimit(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ═══════════════════════════════════════════════════════════════
// checkIpAllowlist
// ═══════════════════════════════════════════════════════════════

describe('checkIpAllowlist', () => {
  let req, res, next, prisma;

  beforeEach(() => {
    prisma = createMockPrisma();
    req = {
      integrationPartner: { id: 'partner-1' },
      prisma,
      ip: '192.168.1.100',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it('should pass when no IP allowlist is set', async () => {
    prisma.integrationPartner.findUnique.mockResolvedValue({
      ipAllowlist: null,
      rateLimitPerMin: 100,
    });

    await checkIpAllowlist(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should pass when IP is in allowlist', async () => {
    prisma.integrationPartner.findUnique.mockResolvedValue({
      ipAllowlist: ['192.168.1.100', '10.0.0.1'],
      rateLimitPerMin: 100,
    });

    await checkIpAllowlist(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should reject when IP is not in allowlist', async () => {
    prisma.integrationPartner.findUnique.mockResolvedValue({
      ipAllowlist: ['10.0.0.1'],
      rateLimitPerMin: 100,
    });

    await checkIpAllowlist(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('should fail closed when DB query fails', async () => {
    prisma.integrationPartner.findUnique.mockRejectedValue(new Error('DB down'));

    await checkIpAllowlist(req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });

  it('should pass if no partner on request', async () => {
    req.integrationPartner = null;

    await checkIpAllowlist(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════
// logIntegrationAccess
// ═══════════════════════════════════════════════════════════════

describe('logIntegrationAccess', () => {
  it('should create access log record', async () => {
    const prisma = createMockPrisma();
    prisma.integrationAccessLog.create.mockResolvedValue({});

    await logIntegrationAccess(prisma, {
      partnerId: 'p1',
      endpoint: 'GET /api/integration/clients',
      clientId: 'c1',
      responseCode: 200,
      ipAddress: '127.0.0.1',
    });

    expect(prisma.integrationAccessLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        partnerId: 'p1',
        endpoint: 'GET /api/integration/clients',
        responseCode: 200,
      }),
    });
  });

  it('should not throw when DB write fails', async () => {
    const prisma = createMockPrisma();
    prisma.integrationAccessLog.create.mockRejectedValue(new Error('DB error'));

    // Should not throw
    await expect(
      logIntegrationAccess(prisma, {
        partnerId: 'p1',
        endpoint: 'test',
        clientId: null,
        responseCode: 500,
      })
    ).resolves.toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// therapistAccess middleware
// ═══════════════════════════════════════════════════════════════

describe('therapistAccess middleware', () => {
  const {
    hasPermission,
    filterByPermission,
    PERMISSION_HIERARCHY,
    DATA_CATEGORY_PERMISSIONS,
  } = require('../../middleware/therapistAccess');

  describe('hasPermission', () => {
    it('should allow BASIC access to assessment_scores', () => {
      expect(hasPermission('BASIC', 'assessment_scores')).toBe(true);
    });

    it('should deny BASIC access to mood_trends', () => {
      expect(hasPermission('BASIC', 'mood_trends')).toBe(false);
    });

    it('should allow STANDARD access to mood_trends', () => {
      expect(hasPermission('STANDARD', 'mood_trends')).toBe(true);
    });

    it('should deny STANDARD access to journal_entries', () => {
      expect(hasPermission('STANDARD', 'journal_entries')).toBe(false);
    });

    it('should allow FULL access to everything', () => {
      for (const category of Object.keys(DATA_CATEGORY_PERMISSIONS)) {
        expect(hasPermission('FULL', category)).toBe(true);
      }
    });

    it('should deny access for unknown category', () => {
      expect(hasPermission('FULL', 'nonexistent_category')).toBe(false);
    });
  });

  describe('filterByPermission', () => {
    const fullData = {
      assessmentScores: [{ type: 'attachment', score: 80 }],
      activityCompletion: { rate: 0.75 },
      moodTrends: [{ date: '2024-01-01', mood: 7 }],
      ratioTrends: [{ date: '2024-01-01', ratio: 5.2 }],
      crisisAlerts: [{ id: 'a1' }],
      individualResponses: [{ q: 'How do you feel?', a: 'Good' }],
      journalEntries: [{ text: 'Private thoughts' }],
    };

    it('should strip mood/ratio/crisis for BASIC', () => {
      const filtered = filterByPermission({ ...fullData }, 'BASIC');

      expect(filtered.assessmentScores).toBeDefined();
      expect(filtered.moodTrends).toBeUndefined();
      expect(filtered.ratioTrends).toBeUndefined();
      expect(filtered.crisisAlerts).toBeUndefined();
      expect(filtered.individualResponses).toBeUndefined();
      expect(filtered.journalEntries).toBeUndefined();
    });

    it('should allow mood/ratio/crisis but strip journal for STANDARD', () => {
      const filtered = filterByPermission({ ...fullData }, 'STANDARD');

      expect(filtered.moodTrends).toBeDefined();
      expect(filtered.ratioTrends).toBeDefined();
      expect(filtered.individualResponses).toBeUndefined();
      expect(filtered.journalEntries).toBeUndefined();
    });

    it('should allow everything for FULL', () => {
      const filtered = filterByPermission({ ...fullData }, 'FULL');

      expect(filtered.moodTrends).toBeDefined();
      expect(filtered.individualResponses).toBeDefined();
      expect(filtered.journalEntries).toBeDefined();
    });

    it('should filter nested partner objects', () => {
      const data = {
        partner1: { moodAvg: 7, journalEntry: 'private' },
        partner2: { moodAvg: 6, journalEntry: 'secret' },
      };

      const filtered = filterByPermission(data, 'BASIC');

      expect(filtered.partner1.moodAvg).toBeUndefined();
      expect(filtered.partner1.journalEntry).toBeUndefined();
    });
  });
});
