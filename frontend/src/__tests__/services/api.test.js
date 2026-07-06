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
  gratitudeApi,
  streaksApi,
  realTalkApi,
  courseApi,
  biometricApi,
  progressRingsApi,
  setTokens,
  getToken,
  getRefreshToken,
  clearTokens,
} from '../../services/api';

describe('api service', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  test('default export is an axios instance with expected properties', () => {
    expect(api).toBeDefined();
    expect(api.defaults).toBeDefined();
    expect(api.defaults.baseURL).toBeDefined();
    expect(api.defaults.headers['Content-Type']).toBe('application/json');
    expect(api.interceptors).toBeDefined();
    expect(api.interceptors.request).toBeDefined();
    expect(api.interceptors.response).toBeDefined();
  });

  test('requests fail fast instead of hanging forever (timeout configured)', () => {
    expect(api.defaults.timeout).toBeGreaterThan(0);
  });

  test('assessmentsApi exposes the full current surface', () => {
    expect(typeof assessmentsApi.getQuestions).toBe('function');
    expect(typeof assessmentsApi.submit).toBe('function');
    expect(typeof assessmentsApi.getResults).toBe('function');
    expect(typeof assessmentsApi.getResult).toBe('function');
    expect(typeof assessmentsApi.getUnifiedProfile).toBe('function');
    expect(typeof assessmentsApi.getDetailedResult).toBe('function');
    expect(typeof assessmentsApi.compareResults).toBe('function');
  });

  test('all core API modules are defined with expected methods', () => {
    expect(typeof matchupApi.getStatus).toBe('function');
    expect(typeof matchupApi.getCurrent).toBe('function');
    expect(typeof matchupApi.generate).toBe('function');
    expect(typeof matchupApi.getHistory).toBe('function');

    expect(typeof logsApi.getPrompt).toBe('function');
    expect(typeof logsApi.submitDaily).toBe('function');
    expect(typeof logsApi.getDaily).toBe('function');
    expect(typeof logsApi.getDailyLogs).toBe('function');
    expect(typeof logsApi.getStats).toBe('function');

    expect(typeof strategiesApi.getCurrent).toBe('function');
    expect(typeof strategiesApi.generate).toBe('function');
    expect(typeof strategiesApi.updateProgress).toBe('function');
    expect(typeof strategiesApi.getHistory).toBe('function');

    expect(typeof reportsApi.getWeekly).toBe('function');
    expect(typeof reportsApi.getMonthly).toBe('function');
    expect(typeof reportsApi.getProgress).toBe('function');

    expect(typeof calendarApi.getAuthUrl).toBe('function');
    expect(typeof calendarApi.getStatus).toBe('function');
    expect(typeof calendarApi.sync).toBe('function');
    expect(typeof calendarApi.disconnect).toBe('function');

    expect(typeof therapistApi.getTasks).toBe('function');
    expect(typeof therapistApi.completeTask).toBe('function');
    expect(typeof therapistApi.getConsent).toBe('function');
    expect(typeof therapistApi.setConsent).toBe('function');

    expect(typeof insightsApi.getDaily).toBe('function');
    expect(typeof videosApi.getDaily).toBe('function');
    expect(typeof videosApi.markComplete).toBe('function');
    expect(typeof videosApi.getStreak).toBe('function');
    expect(typeof mediatorsApi.getAvailable).toBe('function');

    expect(typeof meetingsApi.checkAvailability).toBe('function');
    expect(typeof meetingsApi.schedule).toBe('function');
    expect(typeof meetingsApi.getUpcoming).toBe('function');
    expect(typeof meetingsApi.cancel).toBe('function');
    expect(typeof meetingsApi.consent).toBe('function');
  });

  test('newer feature modules exist (gratitude, streaks, real talk, course, biometric, rings)', () => {
    expect(typeof gratitudeApi.submitEntry).toBe('function');
    expect(typeof gratitudeApi.getToday).toBe('function');
    expect(typeof gratitudeApi.getStreak).toBe('function');
    expect(typeof gratitudeApi.getLoveNote).toBe('function');

    expect(typeof streaksApi.getStreak).toBe('function');
    expect(typeof streaksApi.getBadges).toBe('function');

    expect(typeof realTalkApi.create).toBe('function');
    expect(typeof realTalkApi.list).toBe('function');
    expect(typeof realTalkApi.rateEffectiveness).toBe('function');

    expect(typeof courseApi.getCurriculum).toBe('function');
    expect(typeof courseApi.getProgress).toBe('function');

    expect(typeof biometricApi.getStatus).toBe('function');
    expect(typeof biometricApi.getLoginOptions).toBe('function');
    expect(typeof biometricApi.verifyLogin).toBe('function');

    expect(typeof progressRingsApi.get).toBe('function');
  });

  test('paymentsApi matches the current billing surface (with back-compat aliases)', () => {
    expect(typeof paymentsApi.getPlans).toBe('function');
    expect(typeof paymentsApi.createCheckout).toBe('function');
    expect(typeof paymentsApi.openBillingPortal).toBe('function');
    expect(typeof paymentsApi.cancelSubscription).toBe('function');
    expect(typeof paymentsApi.getSubscription).toBe('function');
    expect(typeof paymentsApi.getSubscriptionStatus).toBe('function');
    expect(typeof paymentsApi.verifyAppleReceipt).toBe('function');
    // Back-compat aliases
    expect(typeof paymentsApi.cancel).toBe('function');
    expect(typeof paymentsApi.getPortal).toBe('function');
  });

  describe('token storage helpers ("Remember Me" semantics)', () => {
    test('setTokens with remember=true persists to localStorage', () => {
      setTokens('tok', 'refresh-tok', true);

      expect(localStorage.getItem('token')).toBe('tok');
      expect(localStorage.getItem('refreshToken')).toBe('refresh-tok');
      expect(localStorage.getItem('rememberMe')).toBe('true');
      expect(getToken()).toBe('tok');
      expect(getRefreshToken()).toBe('refresh-tok');
    });

    test('setTokens with remember=false uses sessionStorage and clears persistent copies', () => {
      localStorage.setItem('token', 'stale');
      localStorage.setItem('refreshToken', 'stale-refresh');
      localStorage.setItem('rememberMe', 'true');

      setTokens('sess-tok', 'sess-refresh', false);

      expect(sessionStorage.getItem('token')).toBe('sess-tok');
      expect(sessionStorage.getItem('refreshToken')).toBe('sess-refresh');
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('rememberMe')).toBeNull();
      expect(getToken()).toBe('sess-tok');
    });

    test('clearTokens wipes both storages', () => {
      localStorage.setItem('token', 'a');
      localStorage.setItem('refreshToken', 'b');
      sessionStorage.setItem('token', 'c');
      sessionStorage.setItem('refreshToken', 'd');

      clearTokens();

      expect(getToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
    });
  });

  describe('interceptors', () => {
    let originalLocation;

    const getRequestHandler = () => api.interceptors.request.handlers[0].fulfilled;
    const getResponseErrorHandler = () => api.interceptors.response.handlers[0].rejected;

    beforeEach(() => {
      originalLocation = window.location;
      delete window.location;
      window.location = { pathname: '/dashboard', href: 'http://localhost/dashboard' };
    });

    afterEach(() => {
      window.location = originalLocation;
    });

    test('request interceptor attaches the bearer token when present', () => {
      localStorage.setItem('token', 'my-token');
      const config = getRequestHandler()({ headers: {} });
      expect(config.headers.Authorization).toBe('Bearer my-token');
    });

    test('request interceptor leaves anonymous requests untouched', () => {
      const config = getRequestHandler()({ headers: {} });
      expect(config.headers.Authorization).toBeUndefined();
    });

    test('TOKEN_REVOKED (server-side session kill) clears tokens and bounces to /login immediately', async () => {
      localStorage.setItem('token', 'revoked-token');
      localStorage.setItem('refreshToken', 'revoked-refresh');

      const error = {
        config: { url: '/logs/daily', headers: {} },
        response: { status: 401, data: { code: 'TOKEN_REVOKED' } },
      };

      await expect(getResponseErrorHandler()(error)).rejects.toBe(error);

      // Never spins on refresh: tokens are dead, session over.
      expect(getToken()).toBeNull();
      expect(getRefreshToken()).toBeNull();
      expect(window.location.href).toBe('/login');
    });

    test('TOKEN_REVOKED on the login page does not redirect-loop', async () => {
      window.location = { pathname: '/login', href: 'http://localhost/login' };
      localStorage.setItem('token', 'revoked-token');

      const error = {
        config: { url: '/logs/daily', headers: {} },
        response: { status: 401, data: { code: 'TOKEN_REVOKED' } },
      };

      await expect(getResponseErrorHandler()(error)).rejects.toBe(error);
      expect(window.location.href).toBe('http://localhost/login');
    });

    test('401 on auth endpoints is passed through without refresh/redirect', async () => {
      localStorage.setItem('token', 'tok');
      localStorage.setItem('refreshToken', 'refresh');

      const error = {
        config: { url: '/auth/login', headers: {} },
        response: { status: 401, data: { error: 'Invalid credentials' } },
      };

      await expect(getResponseErrorHandler()(error)).rejects.toBe(error);
      // Credentials error on login must not nuke stored tokens or navigate.
      expect(getToken()).toBe('tok');
      expect(window.location.href).toBe('http://localhost/dashboard');
    });

    test('non-401 errors pass straight through', async () => {
      const error = {
        config: { url: '/logs/daily', headers: {} },
        response: { status: 500, data: {} },
      };
      await expect(getResponseErrorHandler()(error)).rejects.toBe(error);
      expect(window.location.href).toBe('http://localhost/dashboard');
    });

    // NOTE: intentionally last — the missing-refresh-token path flips the
    // module-level isRefreshing latch and (bug, documented) never resets it,
    // which would contaminate any 401 test that runs after this one.
    test('401 with no refresh token clears session and redirects to /login', async () => {
      localStorage.setItem('token', 'expired-token');
      // no refreshToken stored

      const error = {
        config: { url: '/logs/daily', headers: {} },
        response: { status: 401, data: {} },
      };

      await expect(getResponseErrorHandler()(error)).rejects.toBe(error);
      expect(getToken()).toBeNull();
      expect(window.location.href).toBe('/login');
    });
  });
});
