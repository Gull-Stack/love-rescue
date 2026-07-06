/**
 * Session-note content encryption at rest.
 *
 * When CONTENT_ENCRYPTION=true and a valid ENCRYPTION_KEY is set (the exact
 * switch lib/contentEncryption uses), routes/therapist-practice.js must:
 *  - write content (and the SOAP payload) encrypted (iv:tag:ciphertext),
 *  - return decrypted plaintext to the therapist on every read,
 *  - pass through pre-encryption plaintext rows untouched.
 *
 * The env vars are set BEFORE any module is required because
 * utils/encryption derives its key at module load.
 */

// 64 hex chars = 32-byte AES-256 key. Must precede all requires.
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.CONTENT_ENCRYPTION = 'true';

const express = require('express');
const request = require('supertest');
const bcrypt = require('bcryptjs');

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

jest.mock('../../utils/email', () => ({
  sendEmail: jest.fn(() => Promise.resolve(true)),
  isEmailConfigured: jest.fn(() => true)
}));

const { errorHandler } = require('../../middleware/errorHandler');
const { createMockPrisma } = require('../helpers/mockPrisma');
const { encrypt } = require('../../utils/encryption');
const practiceRoutes = require('../../routes/therapist-practice');

const THERAPIST_API_KEY = process.env.THERAPIST_API_KEY;
const THERAPIST_ID = 'therapist-1';
const CLIENT_ID = 'client-1';
const PLAINTEXT = 'Client disclosed a highly sensitive personal history.';
const ENCRYPTED_SHAPE = /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/;

function createApp(mockPrisma) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    req.prisma = mockPrisma;
    next();
  });
  app.use('/api/therapist', practiceRoutes);
  app.use(errorHandler);
  return app;
}

afterAll(() => {
  // Env leaks across test files within a Jest worker — clean up.
  delete process.env.ENCRYPTION_KEY;
  delete process.env.CONTENT_ENCRYPTION;
});

describe('Session note content encryption (CONTENT_ENCRYPTION on)', () => {
  let mockPrisma;
  let app;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();
    app = createApp(mockPrisma);

    const hashedApiKey = await bcrypt.hash(THERAPIST_API_KEY, 10);
    mockPrisma.therapist.findMany.mockResolvedValue([
      { id: THERAPIST_ID, email: 'dr@example.com', firstName: 'Dana', lastName: 'T', isActive: true, apiKeyHash: hashedApiKey }
    ]);
    mockPrisma.accessLog.create.mockResolvedValue({});
    mockPrisma.accessLog.createMany.mockResolvedValue({ count: 1 });
    mockPrisma.therapistClient.findFirst.mockResolvedValue({
      id: 'link-1', therapistId: THERAPIST_ID, clientId: CLIENT_ID,
      consentStatus: 'GRANTED', permissionLevel: 'BASIC'
    });
  });

  const asTherapist = (req) => req.set('x-therapist-api-key', THERAPIST_API_KEY);

  test('POST stores ciphertext, never plaintext, and responds with plaintext', async () => {
    mockPrisma.sessionNote.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'note-1', deletedAt: null,
        createdAt: new Date(), updatedAt: new Date(),
        relationshipId: null, appointmentId: null,
        ...data
      })
    );

    const res = await asTherapist(
      request(app).post(`/api/therapist/clients/${CLIENT_ID}/notes`)
    ).send({
      content: PLAINTEXT,
      noteFormat: 'soap',
      soap: { subjective: 'anxious affect', plan: 'weekly sessions' }
    });

    expect(res.status).toBe(201);

    const stored = mockPrisma.sessionNote.create.mock.calls[0][0].data;
    // content is encrypted at rest
    expect(stored.content).toMatch(ENCRYPTED_SHAPE);
    expect(stored.content).not.toContain('sensitive personal history');
    // SOAP payload is wrapped and encrypted too
    expect(stored.soap).toEqual({ __enc: expect.stringMatching(ENCRYPTED_SHAPE) });
    expect(JSON.stringify(stored.soap)).not.toContain('anxious affect');
    // access log rows carry no content
    for (const [args] of mockPrisma.accessLog.create.mock.calls) {
      expect(JSON.stringify(args)).not.toContain('sensitive personal history');
    }
    // the therapist gets plaintext back
    expect(res.body.note.content).toBe(PLAINTEXT);
    expect(res.body.note.soap).toEqual({ subjective: 'anxious affect', plan: 'weekly sessions' });
  });

  test('GET list decrypts stored ciphertext', async () => {
    const encryptedRow = {
      id: 'note-1', therapistId: THERAPIST_ID, clientId: CLIENT_ID,
      relationshipId: null, appointmentId: null,
      sessionDate: new Date(), deletedAt: null,
      content: encrypt(PLAINTEXT),
      noteFormat: 'freeform', soap: null,
      createdAt: new Date(), updatedAt: new Date()
    };
    mockPrisma.sessionNote.findMany.mockResolvedValue([encryptedRow]);
    mockPrisma.sessionNote.count.mockResolvedValue(1);

    const res = await asTherapist(
      request(app).get(`/api/therapist/clients/${CLIENT_ID}/notes`)
    );

    expect(res.status).toBe(200);
    expect(encryptedRow.content).toMatch(ENCRYPTED_SHAPE); // sanity: it really was ciphertext
    expect(res.body.notes[0].content).toBe(PLAINTEXT);
  });

  test('pre-encryption plaintext rows pass through untouched (backward compatibility)', async () => {
    mockPrisma.sessionNote.findFirst.mockResolvedValue({
      id: 'note-legacy', therapistId: THERAPIST_ID, clientId: CLIENT_ID,
      relationshipId: null, appointmentId: null,
      sessionDate: new Date(), deletedAt: null,
      content: 'legacy plaintext note',
      noteFormat: 'freeform', soap: { plan: 'legacy plain soap' },
      createdAt: new Date(), updatedAt: new Date()
    });

    const res = await asTherapist(request(app).get('/api/therapist/notes/note-legacy'));

    expect(res.status).toBe(200);
    expect(res.body.note.content).toBe('legacy plaintext note');
    expect(res.body.note.soap).toEqual({ plan: 'legacy plain soap' });
  });

  test('PUT re-encrypts updated content', async () => {
    mockPrisma.sessionNote.findFirst.mockResolvedValue({
      id: 'note-1', therapistId: THERAPIST_ID, clientId: CLIENT_ID,
      relationshipId: null, appointmentId: null,
      sessionDate: new Date(), deletedAt: null,
      content: encrypt(PLAINTEXT), noteFormat: 'freeform', soap: null,
      createdAt: new Date(), updatedAt: new Date()
    });
    mockPrisma.sessionNote.update.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'note-1', therapistId: THERAPIST_ID, clientId: CLIENT_ID,
        relationshipId: null, appointmentId: null,
        sessionDate: new Date(), deletedAt: null,
        noteFormat: 'freeform', soap: null,
        createdAt: new Date(), updatedAt: new Date(),
        ...data
      })
    );

    const res = await asTherapist(
      request(app).put('/api/therapist/notes/note-1')
    ).send({ content: 'updated confidential content' });

    expect(res.status).toBe(200);
    const stored = mockPrisma.sessionNote.update.mock.calls[0][0].data;
    expect(stored.content).toMatch(ENCRYPTED_SHAPE);
    expect(stored.content).not.toContain('updated confidential content');
    expect(res.body.note.content).toBe('updated confidential content');
  });
});
