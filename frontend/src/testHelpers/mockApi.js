// Mock API modules — mirrors the CURRENT export surface of services/api.js.
//
// Usage from a test file:
//   jest.mock('../../../services/api', () =>
//     require('../../../testHelpers/mockApi').buildApiModuleMock()
//   );
//   import { logsApi } from '../../../services/api';
//   logsApi.getPrompt.mockResolvedValue({ data: { ... } });
//
// buildApiModuleMock() returns a full ES-module-shaped mock (default axios
// instance + every named export) so components anywhere in the render tree
// that import from services/api never hit undefined.

const fns = (...names) =>
  names.reduce((obj, name) => {
    obj[name] = jest.fn();
    return obj;
  }, {});

export function buildApiModuleMock() {
  const apiInstance = {
    get: jest.fn().mockRejectedValue(new Error('api.get not mocked')),
    post: jest.fn().mockResolvedValue({ data: {} }),
    put: jest.fn().mockResolvedValue({ data: {} }),
    patch: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    defaults: { baseURL: 'http://localhost:3001/api', headers: {} },
  };

  return {
    __esModule: true,
    default: apiInstance,

    // Token helpers
    getStorageType: jest.fn(() => window.localStorage),
    getToken: jest.fn(() => null),
    getRefreshToken: jest.fn(() => null),
    setTokens: jest.fn(),
    clearTokens: jest.fn(),

    assessmentsApi: fns(
      'getQuestions', 'submit', 'getResults', 'getResult',
      'getUnifiedProfile', 'getDetailedResult', 'compareResults'
    ),
    matchupApi: fns('getStatus', 'getCurrent', 'generate', 'getHistory'),
    logsApi: fns('getPrompt', 'submitDaily', 'getDaily', 'getDailyLogs', 'getStats'),
    strategiesApi: fns('getCurrent', 'generate', 'updateProgress', 'getHistory'),
    reportsApi: fns('getWeekly', 'getMonthly', 'getProgress'),
    calendarApi: fns('getAuthUrl', 'getStatus', 'sync', 'disconnect'),
    therapistApi: fns('getTasks', 'completeTask', 'getConsent', 'setConsent'),
    paymentsApi: fns(
      'getPlans', 'createCheckout', 'openBillingPortal', 'cancelSubscription',
      'getSubscription', 'getSubscriptionStatus', 'verifyAppleReceipt',
      'cancel', 'getPortal'
    ),
    insightsApi: fns('getDaily'),
    videosApi: fns('getDaily', 'markComplete', 'getStreak'),
    mediatorsApi: fns('getAvailable'),
    gratitudeApi: fns(
      'submitEntry', 'getToday', 'getHistory', 'getStreak', 'getStats',
      'getShared', 'toggleShare', 'getLoveNote'
    ),
    meetingsApi: fns('checkAvailability', 'schedule', 'getUpcoming', 'cancel', 'consent'),
    streaksApi: fns('getStreak', 'getBadges'),
    adminApi: fns(
      'getStats', 'getUsers', 'getUser', 'updateUser', 'getUsage',
      'getRecentSignups', 'getSubscriptions', 'sendPush', 'getPushStats',
      'getCommandCenter'
    ),
    biometricApi: fns(
      'getStatus', 'getRegisterOptions', 'verifyRegistration',
      'getLoginOptions', 'verifyLogin'
    ),
    upgradeApi: fns('sendLink', 'checkout'),
    identityHintsApi: fns('check', 'markShown'),
    expertInsightsApi: fns('check', 'markShown'),
    weeklySummaryApi: fns('get'),
    skillTreeApi: fns('getTree', 'practice'),
    transformationApi: fns('get'),
    progressRingsApi: fns('get'),
    realTalkApi: fns('create', 'list', 'get', 'rateEffectiveness', 'delete'),
    courseApi: fns(
      'getCurriculum', 'getWeek', 'getProgress', 'startCourse', 'advanceWeek',
      'getStrategy', 'logPractice', 'saveReflection'
    ),
  };
}
