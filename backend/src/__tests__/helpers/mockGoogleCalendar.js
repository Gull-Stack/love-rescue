/**
 * Mock Google Calendar utilities and googleapis module for testing.
 * Provides jest.fn() mocks for getFreeBusy, createCalendarEventWithMeet,
 * cancelCalendarEvent, and the googleapis OAuth2 client.
 */

const mockGetFreeBusy = jest.fn().mockResolvedValue([]);

const mockCreateCalendarEventWithMeet = jest.fn().mockResolvedValue({
  eventId: 'evt_test_123',
  meetLink: 'https://meet.google.com/test-meeting',
  htmlLink: 'https://calendar.google.com/event?eid=test123'
});

const mockCancelCalendarEvent = jest.fn().mockResolvedValue(undefined);

/**
 * Mock OAuth2 client instance with methods used in the calendar routes.
 */
const mockOAuth2Client = {
  generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/auth?test=1'),
  getToken: jest.fn().mockResolvedValue({
    tokens: {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expiry_date: Date.now() + 3600000
    }
  }),
  setCredentials: jest.fn()
};

/**
 * Mock OAuth2 constructor.
 */
const MockOAuth2 = jest.fn(() => mockOAuth2Client);

/**
 * Mock calendar API used by googleapis.
 */
const mockCalendarEvents = {
  insert: jest.fn().mockResolvedValue({
    data: {
      id: 'evt_test_123',
      htmlLink: 'https://calendar.google.com/event?eid=test123',
      hangoutLink: 'https://meet.google.com/test-meeting'
    }
  }),
  delete: jest.fn().mockResolvedValue({}),
  list: jest.fn().mockResolvedValue({ data: { items: [] } })
};

const mockCalendarFreebusy = {
  query: jest.fn().mockResolvedValue({
    data: {
      calendars: {}
    }
  })
};

const mockCalendarApi = {
  events: mockCalendarEvents,
  freebusy: mockCalendarFreebusy
};

/**
 * Mock googleapis module structure.
 */
const mockGoogle = {
  auth: {
    OAuth2: MockOAuth2,
    JWT: jest.fn(() => ({}))
  },
  calendar: jest.fn(() => mockCalendarApi)
};

const mockGoogleapis = {
  google: mockGoogle
};

module.exports = {
  mockGetFreeBusy,
  mockCreateCalendarEventWithMeet,
  mockCancelCalendarEvent,
  mockOAuth2Client,
  MockOAuth2,
  mockCalendarEvents,
  mockCalendarFreebusy,
  mockCalendarApi,
  mockGoogle,
  mockGoogleapis
};
