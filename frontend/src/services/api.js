import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token storage helpers - respect "Remember Me" preference
export const getStorageType = () => {
  // Check if user opted for persistent storage (Remember Me)
  return localStorage.getItem('rememberMe') === 'true' ? localStorage : sessionStorage;
};

export const getToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

export const getRefreshToken = () => {
  return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
};

export const setTokens = (token, refreshToken, remember = true) => {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem('token', token);
  if (refreshToken) {
    storage.setItem('refreshToken', refreshToken);
  }
  if (remember) {
    localStorage.setItem('rememberMe', 'true');
  } else {
    localStorage.removeItem('rememberMe');
    // Clear from the other storage if switching
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }
};

export const clearTokens = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('refreshToken');
};

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors with token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't try to refresh on login/signup/refresh endpoints
      if (originalRequest.url?.includes('/auth/login') ||
          originalRequest.url?.includes('/auth/signup') ||
          originalRequest.url?.includes('/auth/refresh') ||
          originalRequest.url?.includes('/auth/webauthn/login')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request while we're refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      
      if (!refreshToken) {
        clearTokens();
        if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { token, refreshToken: newRefreshToken } = response.data;
        
        const remember = localStorage.getItem('rememberMe') === 'true';
        setTokens(token, newRefreshToken, remember);
        
        processQueue(null, token);
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// API helper functions
export const assessmentsApi = {
  getQuestions: (type) => api.get(`/assessments/questions/${type}`),
  submit: (type, responses) => api.post('/assessments/submit', { type, responses }),
  getResults: () => api.get('/assessments/results'),
  getResult: (type) => api.get(`/assessments/results/${type}`),
  // Unified profile: aggregated view of all completed assessments
  getUnifiedProfile: () => api.get('/assessments/profile'),
  // Get detailed result with interpretation, action steps, strengths, growth edges
  getDetailedResult: (type) => api.get(`/assessments/results/${type}/detailed`),
  // Compare two users' assessment results (for matchup detail)
  compareResults: (type) => api.get(`/assessments/compare/${type}`),
};

export const matchupApi = {
  getStatus: () => api.get('/matchup/status'),
  getCurrent: () => api.get('/matchup/current'),
  generate: () => api.post('/matchup/generate'),
  getHistory: () => api.get('/matchup/history'),
};

export const logsApi = {
  getPrompt: () => api.get('/logs/prompt'),
  submitDaily: (data) => api.post('/logs/daily', data),
  getDaily: (date) => api.get(`/logs/daily/${date}`),
  getDailyLogs: (params) => api.get('/logs/daily', { params }),
  getStats: (period) => api.get('/logs/stats', { params: { period } }),
};

export const strategiesApi = {
  getCurrent: () => api.get('/strategies/current'),
  generate: () => api.post('/strategies/generate'),
  updateProgress: (strategyId, data) => api.post('/strategies/update-progress', { strategyId, ...data }),
  getHistory: () => api.get('/strategies/history'),
};

export const reportsApi = {
  getWeekly: (weekOffset = 0) => api.get('/reports/weekly', { params: { weekOffset } }),
  getMonthly: (monthOffset = 0) => api.get('/reports/monthly', { params: { monthOffset } }),
  getProgress: () => api.get('/reports/progress'),
};

export const calendarApi = {
  getAuthUrl: () => api.get('/calendar/auth-url'),
  getStatus: () => api.get('/calendar/status'),
  sync: () => api.post('/calendar/sync'),
  disconnect: () => api.delete('/calendar/disconnect'),
};

export const therapistApi = {
  getTasks: (status) => api.get('/therapist/tasks', { params: { status } }),
  completeTask: (taskId) => api.patch(`/therapist/tasks/${taskId}/complete`),
  getConsent: () => api.get('/therapist/consent'),
  setConsent: (consent) => api.post('/therapist/consent', { consent }),
};

export const paymentsApi = {
  createCheckout: (tier) => api.post('/payments/create-checkout', { tier }),
  getSubscription: () => api.get('/payments/subscription'),
  cancel: () => api.post('/payments/cancel'),
  getPortal: () => api.post('/payments/portal'),
};

export const insightsApi = {
  getDaily: () => api.get('/insights/daily'),
};

export const videosApi = {
  getDaily: () => api.get('/videos/daily'),
  markComplete: (videoId) => api.post('/videos/complete', { videoId }),
  getStreak: () => api.get('/videos/streak'),
};

export const mediatorsApi = {
  getAvailable: () => api.get('/mediators/available'),
};

export const gratitudeApi = {
  submitEntry: (data) => api.post('/gratitude', data),
  getToday: () => api.get('/gratitude/today'),
  getHistory: (params) => api.get('/gratitude/history', { params }),
  getStreak: () => api.get('/gratitude/streak'),
  getStats: () => api.get('/gratitude/stats'),
  getShared: () => api.get('/gratitude/shared'),
  toggleShare: (id) => api.patch(`/gratitude/${id}/share`),
  getLoveNote: () => api.get('/gratitude/love-note'),
};

export const meetingsApi = {
  checkAvailability: (mediatorId, date) => api.post('/meetings/check-availability', { mediatorId, date }),
  schedule: (mediatorId, startTime) => api.post('/meetings/schedule', { mediatorId, startTime }),
  getUpcoming: () => api.get('/meetings/upcoming'),
  cancel: (id) => api.post(`/meetings/${id}/cancel`),
  consent: (id) => api.post(`/meetings/${id}/consent`),
};

// Streaks/Gamification API
export const streaksApi = {
  getStreak: () => api.get('/streaks'),
  getBadges: () => api.get('/streaks/badges'),
};

// Admin API
export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  getUsage: () => api.get('/admin/usage'),
  getRecentSignups: (limit = 10) => api.get('/admin/recent-signups', { params: { limit } }),
  // Subscription management
  getSubscriptions: () => api.get('/admin/subscriptions'),
  // Push notifications
  sendPush: (data) => api.post('/admin/push/send', data),
  getPushStats: () => api.get('/admin/push/stats'),
};

// Biometric/WebAuthn API
export const biometricApi = {
  // Check if biometrics are registered
  getStatus: () => api.get('/auth/biometric-status'),
  // Registration flow
  getRegisterOptions: () => api.post('/auth/webauthn/register/options'),
  verifyRegistration: (credential) => api.post('/auth/webauthn/register/verify', { credential }),
  // Login flow (no auth required)
  getLoginOptions: (email) => api.post('/auth/webauthn/login/options', { email }),
  verifyLogin: (email, credential) => api.post('/auth/webauthn/login/verify', { email, credential }),
};

// 16-Week Course API
export const courseApi = {
  // Get full curriculum overview
  getCurriculum: () => api.get('/course/curriculum'),
  // Get specific week details
  getWeek: (weekNumber) => api.get(`/course/week/${weekNumber}`),
  // Get user's progress
  getProgress: () => api.get('/course/progress'),
  // Start the course
  startCourse: () => api.post('/course/start'),
  // Advance to next week
  advanceWeek: () => api.post('/course/advance'),
  // Get current week's strategy
  getStrategy: () => api.get('/course/strategy'),
  // Log daily practice
  logPractice: (completed, notes) => api.post('/course/practice', { completed, notes }),
  // Save weekly reflection
  saveReflection: (reflection) => api.post('/course/reflection', { reflection }),
};
