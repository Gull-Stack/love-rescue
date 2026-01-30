import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [relationship, setRelationship] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
      setRelationship(response.data.relationship);
    } catch (err) {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      await fetchUser(); // Get full user data with relationship
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
      throw err;
    }
  };

  const signup = async (data) => {
    try {
      setError(null);
      const response = await api.post('/auth/signup', data);
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      await fetchUser();
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
      throw err;
    }
  };

  const googleLogin = async (credential) => {
    try {
      setError(null);
      const response = await api.post('/auth/google', { credential });
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      await fetchUser();
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Google sign-in failed');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setRelationship(null);
  };

  const invitePartner = async (partnerEmail) => {
    try {
      const response = await api.post('/auth/invite-partner', { partnerEmail });
      return response.data;
    } catch (err) {
      throw err;
    }
  };

  const joinRelationship = async (code) => {
    try {
      const response = await api.post(`/auth/join/${code}`);
      await fetchUser();
      return response.data;
    } catch (err) {
      throw err;
    }
  };

  const value = {
    user,
    relationship,
    loading,
    error,
    login,
    signup,
    googleLogin,
    logout,
    invitePartner,
    joinRelationship,
    refreshUser: fetchUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
