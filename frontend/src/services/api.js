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
  createCheckout: () => api.post('/payments/create-checkout'),
  getSubscription: () => api.get('/payments/subscription'),
  cancel: () => api.post('/payments/cancel'),
  getPortal: () => api.post('/payments/portal'),
};
