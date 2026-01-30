// Mock API modules
// Usage: import at the top of test files, call setupApiMocks() in beforeEach

export const mockApi = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
};

export const mockAssessmentsApi = {
  getQuestions: jest.fn(),
  submit: jest.fn(),
  getResults: jest.fn(),
  getResult: jest.fn(),
};

export const mockMatchupApi = {
  getStatus: jest.fn(),
  getCurrent: jest.fn(),
  generate: jest.fn(),
  getHistory: jest.fn(),
};

export const mockLogsApi = {
  getPrompt: jest.fn(),
  submitDaily: jest.fn(),
  getDaily: jest.fn(),
  getDailyLogs: jest.fn(),
  getStats: jest.fn(),
};

export const mockStrategiesApi = {
  getCurrent: jest.fn(),
  generate: jest.fn(),
  updateProgress: jest.fn(),
  getHistory: jest.fn(),
};

export const mockReportsApi = {
  getWeekly: jest.fn(),
  getMonthly: jest.fn(),
  getProgress: jest.fn(),
};

export const mockCalendarApi = {
  getAuthUrl: jest.fn(),
  getStatus: jest.fn(),
  sync: jest.fn(),
  disconnect: jest.fn(),
};

export const mockTherapistApi = {
  getTasks: jest.fn(),
  completeTask: jest.fn(),
  getConsent: jest.fn(),
  setConsent: jest.fn(),
};

export const mockPaymentsApi = {
  createCheckout: jest.fn(),
  getSubscription: jest.fn(),
  cancel: jest.fn(),
  getPortal: jest.fn(),
};

export const mockInsightsApi = {
  getDaily: jest.fn(),
};

export const mockVideosApi = {
  getDaily: jest.fn(),
  markComplete: jest.fn(),
  getStreak: jest.fn(),
};

export const mockMediatorsApi = {
  getAvailable: jest.fn(),
};

export const mockMeetingsApi = {
  checkAvailability: jest.fn(),
  schedule: jest.fn(),
  getUpcoming: jest.fn(),
  cancel: jest.fn(),
  consent: jest.fn(),
};

export function resetAllMocks() {
  Object.values(mockAssessmentsApi).forEach(fn => fn.mockReset());
  Object.values(mockMatchupApi).forEach(fn => fn.mockReset());
  Object.values(mockLogsApi).forEach(fn => fn.mockReset());
  Object.values(mockStrategiesApi).forEach(fn => fn.mockReset());
  Object.values(mockReportsApi).forEach(fn => fn.mockReset());
  Object.values(mockCalendarApi).forEach(fn => fn.mockReset());
  Object.values(mockTherapistApi).forEach(fn => fn.mockReset());
  Object.values(mockPaymentsApi).forEach(fn => fn.mockReset());
  Object.values(mockInsightsApi).forEach(fn => fn.mockReset());
  Object.values(mockVideosApi).forEach(fn => fn.mockReset());
  Object.values(mockMediatorsApi).forEach(fn => fn.mockReset());
  Object.values(mockMeetingsApi).forEach(fn => fn.mockReset());
}
