import api from './api';

const therapistService = {
  // Dashboard
  getDashboard: () => api.get('/therapist/dashboard'),
  getClients: (params) => api.get('/therapist/clients', { params }),
  getOutcomes: () => api.get('/therapist/outcomes'),
  
  // Client progress
  getClient: (id) => api.get(`/therapist/clients/${id}`),
  getClientProgress: (id) => api.get(`/therapist/clients/${id}/progress`),
  getClientAssessments: (id) => api.get(`/therapist/clients/${id}/assessments`),
  
  // Session prep
  getSessionPrep: (id) => api.get(`/therapist/clients/${id}/session-prep`),
  
  // Couple view
  getCouple: (id) => api.get(`/therapist/couples/${id}`),
  getCoupleComparison: (id) => api.get(`/therapist/couples/${id}/comparison`),
  createCouple: (clientAId, clientBId) => api.post('/therapist/couples', { clientAId, clientBId }),
  
  // Alerts
  getAlerts: (params) => api.get('/therapist/alerts', { params }),
  markAlertRead: (id) => api.patch(`/therapist/alerts/${id}/read`),
  markAlertsRead: (ids) => api.patch('/therapist/alerts/bulk-read', { ids }),
  
  // Treatment plans
  getTreatmentPlan: (clientId) => api.get(`/therapist/clients/${clientId}/treatment-plan`),
  saveTreatmentPlan: (clientId, plan) => api.put(`/therapist/clients/${clientId}/treatment-plan`, plan),
  getModuleLibrary: () => api.get('/therapist/modules'),
  getRecommendedModules: (approach) => api.get('/therapist/modules/recommend', { params: { approach } }),

  // Session notes (therapist practice)
  createNote: (clientId, data) => api.post(`/therapist/clients/${clientId}/notes`, data),
  getClientNotes: (clientId, params) => api.get(`/therapist/clients/${clientId}/notes`, { params }),
  getNote: (id) => api.get(`/therapist/notes/${id}`),
  updateNote: (id, data) => api.put(`/therapist/notes/${id}`, data),
  deleteNote: (id) => api.delete(`/therapist/notes/${id}`), // soft delete

  // Appointments (therapist practice)
  createAppointment: (data) => api.post('/therapist/appointments', data),
  getAppointments: (params) => api.get('/therapist/appointments', { params }),
  // PATCH — { scheduledAt, durationMinutes } to reschedule, or
  // { status: 'completed' | 'cancelled' | 'no_show', createNote? } to transition.
  updateAppointment: (id, data) => api.patch(`/therapist/appointments/${id}`, data),
  // Billing SSO — get the redirect URL to billing.loverescue.app
  getBillingSsoUrl: () => api.get('/billing/sso-url'),
};

export default therapistService;
