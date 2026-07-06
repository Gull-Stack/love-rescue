import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '../services/api';

const TherapistContext = createContext(null);

export const useTherapist = () => {
  const context = useContext(TherapistContext);
  if (!context) {
    throw new Error('useTherapist must be used within a TherapistProvider');
  }
  return context;
};

export const TherapistProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);
  const [clients, setClients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeAlertsCount, setActiveAlertsCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await api.get('/therapist/profile');
      setProfile(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load therapist profile');
      throw err;
    }
  }, []);

  const updateProfile = useCallback(async (data) => {
    try {
      const response = await api.patch('/therapist/profile', data);
      setProfile(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
      throw err;
    }
  }, []);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/therapist/clients');
      setClients(response.data.clients || []);
      return response.data.clients;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load clients');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await api.get('/therapist/alerts');
      setAlerts(response.data.alerts || []);
      setActiveAlertsCount(response.data.unreadCount || 0);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load alerts');
      throw err;
    }
  }, []);

  const linkClient = useCallback(async (inviteData) => {
    try {
      const response = await api.post('/therapist/clients/invite', inviteData);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send invite');
      throw err;
    }
  }, []);

  const updateApproach = useCallback(async (approach) => {
    try {
      const response = await api.patch('/therapist/profile', { approach });
      setProfile((prev) => prev ? { ...prev, approach } : prev);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update approach');
      throw err;
    }
  }, []);

  const fetchAuditLog = useCallback(async (params) => {
    try {
      const response = await api.get('/therapist/audit-log', { params });
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load audit log');
      throw err;
    }
  }, []);

  const fetchNotificationPrefs = useCallback(async () => {
    try {
      const response = await api.get('/therapist/notification-preferences');
      return response.data;
    } catch (err) {
      throw err;
    }
  }, []);

  const updateNotificationPrefs = useCallback(async (prefs) => {
    try {
      const response = await api.patch('/therapist/notification-preferences', prefs);
      return response.data;
    } catch (err) {
      throw err;
    }
  }, []);

  // The export endpoint is a stub that returns JSON ({ message: 'Export coming
  // soon', data: [] }) — return it as plain JSON rather than pretending it's a
  // downloadable PDF/CSV blob. UI surfaces should treat export as "coming soon".
  const exportData = useCallback(async (format = 'json') => {
    const response = await api.get('/therapist/export', { params: { format } });
    return response.data;
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = {
    profile,
    clients,
    alerts,
    activeAlertsCount,
    loading,
    error,
    clearError,
    fetchProfile,
    updateProfile,
    fetchClients,
    fetchAlerts,
    linkClient,
    updateApproach,
    fetchAuditLog,
    fetchNotificationPrefs,
    updateNotificationPrefs,
    exportData,
  };

  return (
    <TherapistContext.Provider value={value}>
      {children}
    </TherapistContext.Provider>
  );
};
