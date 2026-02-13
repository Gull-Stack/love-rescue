import api from './api';

const therapistService = {
  // Dashboard
  getDashboard: () => api.get('/therapist/dashboard'),
  getClients: (params) => api.get('/therapist/clients', { params }),
  
  // Client progress
  getClient: (id) => api.get(`/therapist/clients/${id}`),
  getClientProgress: (id) => api.get(`/therapist/clients/${id}/progress`),
  getClientAssessments: (id) => api.get(`/therapist/clients/${id}/assessments`),
  
  // Session prep
  getSessionPrep: (id) => api.get(`/therapist/clients/${id}/session-prep`),
  
  // Couple view
  getCouple: (id) => api.get(`/therapist/couples/${id}`),
  getCoupleComparison: (id) => api.get(`/therapist/couples/${id}/comparison`),
  
  // Alerts
  getAlerts: (params) => api.get('/therapist/alerts', { params }),
  markAlertRead: (id) => api.patch(`/therapist/alerts/${id}/read`),
  markAlertsRead: (ids) => api.patch('/therapist/alerts/bulk-read', { ids }),
  
  // Treatment plans
  getTreatmentPlan: (clientId) => api.get(`/therapist/clients/${clientId}/treatment-plan`),
  saveTreatmentPlan: (clientId, plan) => api.put(`/therapist/clients/${clientId}/treatment-plan`, plan),
  getModuleLibrary: () => api.get('/therapist/modules'),
  getRecommendedModules: (approach) => api.get('/therapist/modules/recommend', { params: { approach } }),
};

export default therapistService;
