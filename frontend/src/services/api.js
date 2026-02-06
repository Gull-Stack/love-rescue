import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login';
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
