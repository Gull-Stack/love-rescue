/**
 * Integration API tests — partner ↔ therapist binding enforcement.
 * POST /api/integration/auth must only mint tokens for therapists the
 * authenticated partner is explicitly bound to (fail closed).
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$12$hashedsecret'),
  compare: jest.fn()
}));

const bcrypt = require('bcryptjs');
const { createMockPrisma } = require('../helpers/mockPrisma');
const { errorHandler } = require('../../middleware/errorHandler');

const INTEGRATION_JWT_SECRET = 'test-integration-jwt-secret';
// Must be set before routes/integration.js is first required (module-load read)
process.env.INTEGRATION_JWT_SECRET = INTEGRATION_JWT_SECRET;

function createApp(mockPrisma) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.prisma = mockPrisma;
    next();
  });
  app.use('/api/integration', require('../../routes/integration'));
  app.use(errorHandler);
  return app;
}

describe('POST /api/integration/auth — binding enforcement', () => {
  let mockPrisma;
  let app;

  const mockPartner = {
    id: 'partner-1',
    name: 'SuperTool',
    apiKey: 'pk_test_key',
    apiSecret: '$2a$12$hashedsecret',
    status: 'active'
  };

  const mockTherapist = {
    id: 'therapist-1',
    isActive: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();
    app = createApp(mockPrisma);
  });

  function sendAuth(body = {}) {
    return request(app)
      .post('/api/integration/auth')
      .send({
        apiKey: 'pk_test_key',
        apiSecret: 'raw-secret',
        therapistId: 'therapist-1',
        ...body
      });
  }

  it('issues a token when the partner is bound to the requested therapist', async () => {
    mockPrisma.integrationPartner.findFirst.mockResolvedValue(mockPartner);
    bcrypt.compare.mockResolvedValue(true);
    mockPrisma.therapist.findUnique.mockResolvedValue(mockTherapist);
    mockPrisma.integrationPartnerTherapist.findFirst.mockResolvedValue({
      id: 'binding-1',
      partnerId: 'partner-1',
      therapistId: 'therapist-1'
    });
    mockPrisma.integrationAccessLog.create.mockResolvedValue({});

    const res = await sendAuth();

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    const decoded = jwt.verify(res.body.token, INTEGRATION_JWT_SECRET);
    expect(decoded.type).toBe('integration');
    expect(decoded.partnerId).toBe('partner-1');
    expect(decoded.therapistId).toBe('therapist-1');

    // Binding was actually checked for THIS partner/therapist pair
    expect(mockPrisma.integrationPartnerTherapist.findFirst).toHaveBeenCalledWith({
      where: { partnerId: 'partner-1', therapistId: 'therapist-1' },
      select: { id: true }
    });
  });

  it('returns 403 when the partner is not bound to the requested therapist', async () => {
    mockPrisma.integrationPartner.findFirst.mockResolvedValue(mockPartner);
    bcrypt.compare.mockResolvedValue(true);
    mockPrisma.therapist.findUnique.mockResolvedValue(mockTherapist);
    // No binding row → fail closed
    mockPrisma.integrationPartnerTherapist.findFirst.mockResolvedValue(null);
    mockPrisma.integrationAccessLog.create.mockResolvedValue({});

    const res = await sendAuth();

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Partner is not authorized for this therapist');
    expect(res.body.token).toBeUndefined();

    // Denial is audit-logged with the 403
    expect(mockPrisma.integrationAccessLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        partnerId: 'partner-1',
        endpoint: 'POST /api/integration/auth',
        responseCode: 403
      })
    });
  });

  it('mints no tokens for a partner with zero bindings (fail closed)', async () => {
    mockPrisma.integrationPartner.findFirst.mockResolvedValue(mockPartner);
    bcrypt.compare.mockResolvedValue(true);
    mockPrisma.therapist.findUnique.mockResolvedValue(mockTherapist);
    mockPrisma.integrationPartnerTherapist.findFirst.mockResolvedValue(null);
    mockPrisma.integrationAccessLog.create.mockResolvedValue({});

    const res = await sendAuth({ therapistId: 'therapist-1' });

    expect(res.status).toBe(403);
  });

  it('still rejects bad API secrets before the binding check', async () => {
    mockPrisma.integrationPartner.findFirst.mockResolvedValue(mockPartner);
    bcrypt.compare.mockResolvedValue(false);
    mockPrisma.integrationAccessLog.create.mockResolvedValue({});

    const res = await sendAuth();

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid API secret');
    expect(mockPrisma.integrationPartnerTherapist.findFirst).not.toHaveBeenCalled();
  });

  it('still returns 404 for an unknown or inactive therapist', async () => {
    mockPrisma.integrationPartner.findFirst.mockResolvedValue(mockPartner);
    bcrypt.compare.mockResolvedValue(true);
    mockPrisma.therapist.findUnique.mockResolvedValue({ id: 'therapist-1', isActive: false });

    const res = await sendAuth();

    expect(res.status).toBe(404);
    expect(mockPrisma.integrationPartnerTherapist.findFirst).not.toHaveBeenCalled();
  });

  it('requires therapistId', async () => {
    const res = await sendAuth({ therapistId: undefined });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('therapistId is required');
  });
});
