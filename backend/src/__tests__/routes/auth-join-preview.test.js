/**
 * QA remediation P1-A: GET /api/auth/join/:code/preview.
 * The invitee is deciding whether to permanently link accounts — they get
 * the inviter's first name and nothing else. These tests FAIL on any PII
 * leak (email/lastName) or on wrong status codes.
 */
const express = require('express');
const request = require('supertest');

jest.mock('../../utils/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn()
}));
jest.mock('bcryptjs', () => ({ hash: jest.fn(), compare: jest.fn() }));
jest.mock('uuid', () => ({ v4: jest.fn().mockReturnValue('test-uuid') }));
jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: jest.fn(),
  verifyRegistrationResponse: jest.fn(),
  generateAuthenticationOptions: jest.fn(),
  verifyAuthenticationResponse: jest.fn()
}));
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: jest.fn() }))
}));

const { errorHandler } = require('../../middleware/errorHandler');

function createApp(mockPrisma) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.prisma = mockPrisma;
    next();
  });
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
  app.use('/api/auth', require('../../routes/auth'));
  app.use(errorHandler);
  return app;
}

describe('GET /api/auth/join/:code/preview', () => {
  let mockPrisma;
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = {
      relationship: { findUnique: jest.fn() }
    };
    app = createApp(mockPrisma);
  });

  test('valid code → inviter first name ONLY (no email, no lastName, no ids)', async () => {
    mockPrisma.relationship.findUnique.mockResolvedValue({
      id: 'rel-1',
      user1Id: 'user-1',
      user2Id: null,
      inviteCode: 'ABCD1234',
      user1: { firstName: 'Jamie' }
    });

    const res = await request(app).get('/api/auth/join/abcd1234/preview');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ valid: true, inviterFirstName: 'Jamie' });
    // Uppercased before lookup, matching how codes are stored
    expect(mockPrisma.relationship.findUnique.mock.calls[0][0].where.inviteCode).toBe('ABCD1234');
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toMatch(/email|lastName|user1Id|rel-1/);
  });

  test('unknown code → 404 valid:false INVALID_CODE', async () => {
    mockPrisma.relationship.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/api/auth/join/NOPE1234/preview');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ valid: false, reason: 'INVALID_CODE' });
  });

  test('already-used code → 400 valid:false ALREADY_USED', async () => {
    mockPrisma.relationship.findUnique.mockResolvedValue({
      id: 'rel-1', user1Id: 'user-1', user2Id: 'user-2',
      inviteCode: 'ABCD1234', user1: { firstName: 'Jamie' }
    });
    const res = await request(app).get('/api/auth/join/ABCD1234/preview');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ valid: false, reason: 'ALREADY_USED' });
  });
});
