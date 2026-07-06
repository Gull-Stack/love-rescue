/**
 * Tests for therapist invite email delivery wiring in routes/therapist.js:
 * - POST /clients/invite sends the client an invite email (with the link) and
 *   reports emailSent without breaking the existing response contract
 * - POST /clients/invite/:token/accept notifies the therapist (JWT accept)
 * - POST /clients/link (legacy code accept) notifies the therapist
 * - POST /clients/invite/:token/decline sends a neutral, anonymous notice
 * - all sends are fire-and-forget: email/notification failure never fails the endpoint
 */

'use strict';

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../utils/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  isEmailConfigured: jest.fn(() => true),
  sendTherapistClientInviteEmail: jest.fn().mockResolvedValue(true),
  sendTherapistInviteAcceptedEmail: jest.fn().mockResolvedValue(true),
  sendTherapistInviteDeclinedEmail: jest.fn().mockResolvedValue(true),
}));

const { errorHandler } = require('../../middleware/errorHandler');
const {
  sendTherapistClientInviteEmail,
  sendTherapistInviteAcceptedEmail,
  sendTherapistInviteDeclinedEmail,
  isEmailConfigured,
} = require('../../utils/email');

const JWT_SECRET = process.env.JWT_SECRET; // from setup.js
const THERAPIST_API_KEY = process.env.THERAPIST_API_KEY; // from setup.js

const CLIENT_ID = 'user-client-1';
const CLIENT_USER = {
  id: CLIENT_ID,
  email: 'client@example.com',
  firstName: 'Sarah',
  lastName: 'Chen',
  role: 'user',
  subscriptionStatus: 'paid',
  stripeCustomerId: null,
  isPlatformAdmin: false,
  tokenVersion: 0,
  createdAt: new Date(),
};

const THERAPIST = {
  id: 'therapist-1',
  email: 'dr.smith@therapy.com',
  firstName: 'Emily',
  lastName: 'Smith',
  practiceName: 'Harbor Counseling',
  isActive: true,
};

let hashedApiKey;
beforeAll(async () => {
  hashedApiKey = await bcrypt.hash(THERAPIST_API_KEY, 10);
});

/** Drain the fire-and-forget email pipeline (all mocks resolve on microtasks). */
async function flushAsync(times = 25) {
  for (let i = 0; i < times; i++) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}

function createMockPrisma() {
  return {
    user: { findUnique: jest.fn().mockResolvedValue(CLIENT_USER) },
    therapist: {
      findMany: jest.fn(async () => [{ ...THERAPIST, apiKeyHash: hashedApiKey }]),
      findUnique: jest.fn().mockResolvedValue({ email: THERAPIST.email }),
    },
    therapistClient: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'link-1', therapistId: THERAPIST.id }),
      update: jest.fn().mockResolvedValue({ id: 'link-1', therapistId: THERAPIST.id }),
    },
    relationship: { findFirst: jest.fn().mockResolvedValue(null) },
  };
}

function createApp(mockPrisma) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.prisma = mockPrisma;
    next();
  });
  app.use('/api/therapist', require('../../routes/therapist'));
  app.use(errorHandler);
  return app;
}

function clientToken() {
  return jwt.sign({ userId: CLIENT_ID }, JWT_SECRET, { expiresIn: '1h' });
}

function inviteToken(permissionLevel = 'STANDARD') {
  return jwt.sign(
    {
      therapistId: THERAPIST.id,
      therapistName: `${THERAPIST.firstName} ${THERAPIST.lastName}`,
      practiceName: THERAPIST.practiceName,
      permissionLevel,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

let prisma;
let app;

beforeEach(() => {
  jest.clearAllMocks();
  isEmailConfigured.mockReturnValue(true);
  prisma = createMockPrisma();
  app = createApp(prisma);
});

// ═══════════════════════════════════════════════════════════════
// POST /api/therapist/clients/invite — invite delivery
// ═══════════════════════════════════════════════════════════════

describe('POST /api/therapist/clients/invite email delivery', () => {
  it('sends the client an invite email containing the generated invite link', async () => {
    const res = await request(app)
      .post('/api/therapist/clients/invite')
      .set('x-therapist-api-key', THERAPIST_API_KEY)
      .send({ clientEmail: 'Client@Example.com', permissionLevel: 'STANDARD' });

    expect(res.status).toBe(200);
    // Existing response contract is unchanged
    expect(res.body.inviteLink).toContain('/therapist/join/');
    expect(res.body.permissionLevel).toBe('STANDARD');
    expect(res.body.expiresIn).toBe('7 days');
    expect(res.body.emailSent).toBe(true);

    await flushAsync();
    expect(sendTherapistClientInviteEmail).toHaveBeenCalledTimes(1);
    const [to, options] = sendTherapistClientInviteEmail.mock.calls[0];
    expect(to).toBe('client@example.com');
    // The exact link returned to the therapist is the one emailed to the client
    expect(options.inviteLink).toBe(res.body.inviteLink);
    expect(options.therapistName).toBe('Emily Smith');
    expect(options.practiceName).toBe('Harbor Counseling');
  });

  it('does not send and reports emailSent=false when no clientEmail is given', async () => {
    const res = await request(app)
      .post('/api/therapist/clients/invite')
      .set('x-therapist-api-key', THERAPIST_API_KEY)
      .send({ permissionLevel: 'BASIC' });

    expect(res.status).toBe(200);
    expect(res.body.inviteLink).toBeDefined();
    expect(res.body.emailSent).toBe(false);

    await flushAsync();
    expect(sendTherapistClientInviteEmail).not.toHaveBeenCalled();
  });

  it('reports emailSent=false when no email transport is configured', async () => {
    isEmailConfigured.mockReturnValue(false);

    const res = await request(app)
      .post('/api/therapist/clients/invite')
      .set('x-therapist-api-key', THERAPIST_API_KEY)
      .send({ clientEmail: 'client@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.inviteLink).toBeDefined();
    expect(res.body.emailSent).toBe(false);
  });

  it('still generates the invite when the email send fails (fire-and-forget)', async () => {
    sendTherapistClientInviteEmail.mockRejectedValue(new Error('SMTP down'));

    const res = await request(app)
      .post('/api/therapist/clients/invite')
      .set('x-therapist-api-key', THERAPIST_API_KEY)
      .send({ clientEmail: 'client@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.inviteLink).toContain('/therapist/join/');
    await flushAsync(); // rejection is caught and logged, never thrown
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /clients/invite/:token/accept — therapist notification
// ═══════════════════════════════════════════════════════════════

describe('POST /api/therapist/clients/invite/:token/accept notification', () => {
  it('notifies the therapist with the client first name and granted level', async () => {
    const res = await request(app)
      .post(`/api/therapist/clients/invite/${inviteToken('STANDARD')}/accept`)
      .set('Authorization', `Bearer ${clientToken()}`)
      .send({ permissionLevel: 'BASIC' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Connected successfully');

    await flushAsync();
    expect(sendTherapistInviteAcceptedEmail).toHaveBeenCalledTimes(1);
    const [to, options] = sendTherapistInviteAcceptedEmail.mock.calls[0];
    expect(to).toBe(THERAPIST.email);
    expect(options.clientFirstName).toBe('Sarah');
    expect(options.permissionLevel).toBe('BASIC');
    // No clinical data is passed to the email
    expect(JSON.stringify(sendTherapistInviteAcceptedEmail.mock.calls[0])).not.toContain('journal');
  });

  it('does not notify when the client was already connected', async () => {
    prisma.therapistClient.findFirst.mockResolvedValue({
      id: 'link-1',
      consentStatus: 'GRANTED',
      permissionLevel: 'STANDARD',
    });

    const res = await request(app)
      .post(`/api/therapist/clients/invite/${inviteToken()}/accept`)
      .set('Authorization', `Bearer ${clientToken()}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Already connected');
    await flushAsync();
    expect(sendTherapistInviteAcceptedEmail).not.toHaveBeenCalled();
  });

  it('still accepts when the therapist lookup fails (fire-and-forget)', async () => {
    prisma.therapist.findUnique.mockRejectedValue(new Error('DB down'));

    const res = await request(app)
      .post(`/api/therapist/clients/invite/${inviteToken()}/accept`)
      .set('Authorization', `Bearer ${clientToken()}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Connected successfully');
    await flushAsync();
    expect(sendTherapistInviteAcceptedEmail).not.toHaveBeenCalled();
  });

  it('still accepts when the notification email fails (fire-and-forget)', async () => {
    sendTherapistInviteAcceptedEmail.mockRejectedValue(new Error('SMTP down'));

    const res = await request(app)
      .post(`/api/therapist/clients/invite/${inviteToken()}/accept`)
      .set('Authorization', `Bearer ${clientToken()}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Connected successfully');
    await flushAsync();
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /clients/link — legacy invite-code accept notification
// ═══════════════════════════════════════════════════════════════

describe('POST /api/therapist/clients/link (code accept) notification', () => {
  it('notifies the therapist when a client accepts via invite code', async () => {
    prisma.therapistClient.findFirst.mockResolvedValue({
      id: 'link-1',
      therapistId: THERAPIST.id,
      clientId: CLIENT_ID,
      consentStatus: 'PENDING',
    });
    prisma.therapistClient.update.mockResolvedValue({
      id: 'link-1',
      therapistId: THERAPIST.id,
      permissionLevel: 'FULL',
      consentStatus: 'GRANTED',
    });

    const res = await request(app)
      .post('/api/therapist/clients/link')
      .set('Authorization', `Bearer ${clientToken()}`)
      .send({ inviteCode: 'tc_abcdef123456', permissionLevel: 'FULL' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Therapist link accepted');

    await flushAsync();
    expect(sendTherapistInviteAcceptedEmail).toHaveBeenCalledTimes(1);
    const [to, options] = sendTherapistInviteAcceptedEmail.mock.calls[0];
    expect(to).toBe(THERAPIST.email);
    expect(options.clientFirstName).toBe('Sarah');
    expect(options.permissionLevel).toBe('FULL');
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /clients/invite/:token/decline — neutral notification
// ═══════════════════════════════════════════════════════════════

describe('POST /api/therapist/clients/invite/:token/decline notification', () => {
  it('sends the therapist a neutral decline notice without identifying the client', async () => {
    const res = await request(app)
      .post(`/api/therapist/clients/invite/${inviteToken()}/decline`)
      .set('Authorization', `Bearer ${clientToken()}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Invite declined');

    await flushAsync();
    expect(sendTherapistInviteDeclinedEmail).toHaveBeenCalledTimes(1);
    expect(sendTherapistInviteDeclinedEmail.mock.calls[0][0]).toBe(THERAPIST.email);
    // Privacy: the decliner is never identified in the notification call
    const serialized = JSON.stringify(sendTherapistInviteDeclinedEmail.mock.calls);
    expect(serialized).not.toContain(CLIENT_USER.firstName);
    expect(serialized).not.toContain(CLIENT_USER.lastName);
    expect(serialized).not.toContain(CLIENT_USER.email);
    expect(serialized).not.toContain(CLIENT_ID);
  });

  it('still declines when the notification fails (fire-and-forget)', async () => {
    sendTherapistInviteDeclinedEmail.mockRejectedValue(new Error('SMTP down'));

    const res = await request(app)
      .post(`/api/therapist/clients/invite/${inviteToken()}/decline`)
      .set('Authorization', `Bearer ${clientToken()}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Invite declined');
    await flushAsync();
  });
});
