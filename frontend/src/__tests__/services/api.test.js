import api, {
  assessmentsApi,
  matchupApi,
  logsApi,
  strategiesApi,
  reportsApi,
  calendarApi,
  therapistApi,
  paymentsApi,
  insightsApi,
  videosApi,
  mediatorsApi,
  meetingsApi,
} from '../../services/api';

describe('api service', () => {
  test('default export is an axios instance with expected properties', () => {
    expect(api).toBeDefined();
    expect(api.defaults).toBeDefined();
    expect(api.defaults.baseURL).toBeDefined();
    expect(api.defaults.headers['Content-Type']).toBe('application/json');
    expect(api.interceptors).toBeDefined();
    expect(api.interceptors.request).toBeDefined();
    expect(api.interceptors.response).toBeDefined();
  });

  test('assessmentsApi has getQuestions, submit, getResults, and getResult methods', () => {
    expect(assessmentsApi).toBeDefined();
    expect(typeof assessmentsApi.getQuestions).toBe('function');
    expect(typeof assessmentsApi.submit).toBe('function');
    expect(typeof assessmentsApi.getResults).toBe('function');
    expect(typeof assessmentsApi.getResult).toBe('function');
  });

  test('matchupApi has getStatus, getCurrent, generate, and getHistory methods', () => {
    expect(matchupApi).toBeDefined();
    expect(typeof matchupApi.getStatus).toBe('function');
    expect(typeof matchupApi.getCurrent).toBe('function');
    expect(typeof matchupApi.generate).toBe('function');
    expect(typeof matchupApi.getHistory).toBe('function');
  });

  test('all API modules are defined with expected methods', () => {
    // logsApi
    expect(logsApi).toBeDefined();
    expect(typeof logsApi.getPrompt).toBe('function');
    expect(typeof logsApi.submitDaily).toBe('function');
    expect(typeof logsApi.getDaily).toBe('function');
    expect(typeof logsApi.getDailyLogs).toBe('function');
    expect(typeof logsApi.getStats).toBe('function');

    // strategiesApi
    expect(strategiesApi).toBeDefined();
    expect(typeof strategiesApi.getCurrent).toBe('function');
    expect(typeof strategiesApi.generate).toBe('function');
    expect(typeof strategiesApi.updateProgress).toBe('function');
    expect(typeof strategiesApi.getHistory).toBe('function');

    // reportsApi
    expect(reportsApi).toBeDefined();
    expect(typeof reportsApi.getWeekly).toBe('function');
    expect(typeof reportsApi.getMonthly).toBe('function');
    expect(typeof reportsApi.getProgress).toBe('function');

    // calendarApi
    expect(calendarApi).toBeDefined();
    expect(typeof calendarApi.getAuthUrl).toBe('function');
    expect(typeof calendarApi.getStatus).toBe('function');
    expect(typeof calendarApi.sync).toBe('function');
    expect(typeof calendarApi.disconnect).toBe('function');

    // therapistApi
    expect(therapistApi).toBeDefined();
    expect(typeof therapistApi.getTasks).toBe('function');
    expect(typeof therapistApi.completeTask).toBe('function');
    expect(typeof therapistApi.getConsent).toBe('function');
    expect(typeof therapistApi.setConsent).toBe('function');

    // paymentsApi
    expect(paymentsApi).toBeDefined();
    expect(typeof paymentsApi.createCheckout).toBe('function');
    expect(typeof paymentsApi.getSubscription).toBe('function');
    expect(typeof paymentsApi.cancel).toBe('function');
    expect(typeof paymentsApi.getPortal).toBe('function');

    // insightsApi
    expect(insightsApi).toBeDefined();
    expect(typeof insightsApi.getDaily).toBe('function');

    // videosApi
    expect(videosApi).toBeDefined();
    expect(typeof videosApi.getDaily).toBe('function');
    expect(typeof videosApi.markComplete).toBe('function');
    expect(typeof videosApi.getStreak).toBe('function');

    // mediatorsApi
    expect(mediatorsApi).toBeDefined();
    expect(typeof mediatorsApi.getAvailable).toBe('function');

    // meetingsApi
    expect(meetingsApi).toBeDefined();
    expect(typeof meetingsApi.checkAvailability).toBe('function');
    expect(typeof meetingsApi.schedule).toBe('function');
    expect(typeof meetingsApi.getUpcoming).toBe('function');
    expect(typeof meetingsApi.cancel).toBe('function');
    expect(typeof meetingsApi.consent).toBe('function');
  });
});
