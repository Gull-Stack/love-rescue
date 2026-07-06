/**
 * Template tests for the therapist-invite emails in utils/email.js.
 * nodemailer is mocked at the transport level so the real templates run and
 * we can assert on subject/text/html content.
 */

'use strict';

const mockSendMail = jest.fn().mockResolvedValue({});

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Configure SMTP before the module builds its transporter (lazy, first send).
process.env.SMTP_HOST = 'smtp.test.local';
process.env.SMTP_USER = 'test-user';
process.env.SMTP_PASS = 'test-pass';

// process.env is shared across test files in the same worker — clean up so
// other files still see email as unconfigured.
afterAll(() => {
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
});

const {
  sendTherapistClientInviteEmail,
  sendTherapistInviteAcceptedEmail,
  sendTherapistInviteDeclinedEmail,
} = require('../../utils/email');

const INVITE_LINK = 'http://localhost:3000/therapist/join/tok-abc123';

beforeEach(() => {
  jest.clearAllMocks();
  mockSendMail.mockResolvedValue({});
});

describe('sendTherapistClientInviteEmail', () => {
  it('sends a warm invite with therapist/practice attribution, CTA link, and plain-text fallback', async () => {
    const ok = await sendTherapistClientInviteEmail('client@example.com', {
      therapistName: 'Emily Smith',
      practiceName: 'Harbor Counseling',
      inviteLink: INVITE_LINK,
    });

    expect(ok).toBe(true);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const mail = mockSendMail.mock.calls[0][0];

    expect(mail.to).toBe('client@example.com');
    expect(mail.subject).toBe('Emily Smith invited you to share your Love Rescue progress');
    expect(mail.text).toContain('Emily Smith from Harbor Counseling has invited you to share your Love Rescue progress');
    // The invite link appears as a plain-text URL fallback in both bodies
    expect(mail.text).toContain(INVITE_LINK);
    expect(mail.html).toContain(`href="${INVITE_LINK}"`);
    expect(mail.html).toContain(`>${INVITE_LINK}</a>`);
    // Consent framing: client chooses the level and can revoke anytime
    expect(mail.text.toLowerCase()).toContain('you choose');
    expect(mail.text.toLowerCase()).toContain('revoke');
    expect(mail.text).toContain('expires in 7 days');
  });

  it('omits the practice clause when practiceName is missing', async () => {
    await sendTherapistClientInviteEmail('client@example.com', {
      therapistName: 'Emily Smith',
      practiceName: null,
      inviteLink: INVITE_LINK,
    });

    const mail = mockSendMail.mock.calls[0][0];
    expect(mail.text).toContain('Emily Smith has invited you');
    expect(mail.text).not.toContain('from null');
    expect(mail.html).not.toContain('null');
  });
});

describe('sendTherapistInviteAcceptedEmail', () => {
  it('tells the therapist who accepted, at what level, with a dashboard link — and no clinical data', async () => {
    await sendTherapistInviteAcceptedEmail('dr.smith@therapy.com', {
      clientFirstName: 'Sarah',
      permissionLevel: 'STANDARD',
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const mail = mockSendMail.mock.calls[0][0];

    expect(mail.to).toBe('dr.smith@therapy.com');
    expect(mail.subject).toBe('Sarah accepted your Love Rescue invite');
    expect(mail.text).toContain('STANDARD');
    // FRONTEND_URL from test setup
    expect(mail.text).toContain('http://localhost:3000/therapist');
    expect(mail.html).toContain('href="http://localhost:3000/therapist"');
  });

  it('falls back gracefully when the client has no first name', async () => {
    await sendTherapistInviteAcceptedEmail('dr.smith@therapy.com', {
      clientFirstName: null,
      permissionLevel: 'BASIC',
    });

    const mail = mockSendMail.mock.calls[0][0];
    expect(mail.subject).toBe('A client accepted your Love Rescue invite');
    expect(mail.text).not.toContain('null');
  });
});

describe('sendTherapistInviteDeclinedEmail', () => {
  it('sends a neutral, anonymous notice by default', async () => {
    await sendTherapistInviteDeclinedEmail('dr.smith@therapy.com');

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const mail = mockSendMail.mock.calls[0][0];

    expect(mail.to).toBe('dr.smith@therapy.com');
    expect(mail.subject).toBe('A Love Rescue invite was declined');
    expect(mail.text).toContain('An invited client has declined');
    expect(mail.text).toContain('No action is needed');
    // No identifying information of any kind — not even an email address
    expect(mail.text).not.toContain('@');
  });

  it('can include the invited email when the caller already knows it', async () => {
    await sendTherapistInviteDeclinedEmail('dr.smith@therapy.com', {
      invitedEmail: 'invited@example.com',
    });

    const mail = mockSendMail.mock.calls[0][0];
    expect(mail.text).toContain('An invited client (invited@example.com) has declined');
  });
});
