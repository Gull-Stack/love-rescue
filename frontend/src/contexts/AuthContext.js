import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { setTokens, getToken, clearTokens, biometricApi } from '../services/api';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';

// TODO: HIGH-01 — Move JWT storage from localStorage to httpOnly cookies.
// This requires backend changes (set-cookie headers, cookie-parser middleware,
// CORS credentials). localStorage is vulnerable to XSS token theft.
// Until migrated, ensure no user-generated content is rendered via
// dangerouslySetInnerHTML anywhere in the app.

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
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Check if biometrics are available on this device
  const checkBiometricAvailability = useCallback(async () => {
    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        return false;
      }
      // Check if platform authenticator (Face ID/Touch ID) is available
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch {
      return false;
    }
  }, []);

  // Check if user has biometrics registered (requires being logged in)
  const checkBiometricStatus = useCallback(async () => {
    try {
      const response = await biometricApi.getStatus();
      setBiometricEnabled(response.data.biometricEnabled);
      return response.data.biometricEnabled;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  // Update biometric status when user changes
  useEffect(() => {
    if (user) {
      checkBiometricStatus();
    } else {
      setBiometricEnabled(false);
    }
  }, [user, checkBiometricStatus]);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
      setRelationship(response.data.relationship);
    } catch (err) {
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, rememberMe = true) => {
    try {
      setError(null);
      const response = await api.post('/auth/login', { email, password });
      setTokens(response.data.token, response.data.refreshToken, rememberMe);
      
      // Store email for biometric login
      if (rememberMe) {
        localStorage.setItem('biometricEmail', email);
      }
      
      setUser(response.data.user);
      await fetchUser(); // Get full user data with relationship
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
      throw err;
    }
  };

  const signup = async (data, rememberMe = true) => {
    try {
      setError(null);
      const response = await api.post('/auth/signup', data);
      setTokens(response.data.token, response.data.refreshToken, rememberMe);
      setUser(response.data.user);
      await fetchUser();
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
      throw err;
    }
  };

  const googleLogin = async (credential, rememberMe = true) => {
    try {
      setError(null);
      const response = await api.post('/auth/google', { credential });
      setTokens(response.data.token, response.data.refreshToken, rememberMe);
      setUser(response.data.user);
      await fetchUser();
      return response.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Google sign-in failed');
      throw err;
    }
  };

  // Register biometrics for the current user
  const registerBiometric = async () => {
    try {
      setError(null);
      
      // Get registration options from server
      const optionsResponse = await biometricApi.getRegisterOptions();
      const options = optionsResponse.data;
      
      // Start WebAuthn registration (prompts Face ID/Touch ID)
      const credential = await startRegistration(options);
      
      // Verify with server
      const verifyResponse = await biometricApi.verifyRegistration(credential);
      
      if (verifyResponse.data.verified) {
        setBiometricEnabled(true);
        localStorage.setItem('biometricEmail', user.email);
        return true;
      }
      
      throw new Error('Verification failed');
    } catch (err) {
      const message = err.name === 'NotAllowedError' 
        ? 'Biometric authentication was cancelled'
        : err.response?.data?.error || err.message || 'Biometric registration failed';
      setError(message);
      throw new Error(message);
    }
  };

  // Login with biometrics
  const biometricLogin = async (email) => {
    try {
      setError(null);
      
      // Get authentication options from server
      const optionsResponse = await biometricApi.getLoginOptions(email);
      const options = optionsResponse.data;
      
      // Start WebAuthn authentication (prompts Face ID/Touch ID)
      const credential = await startAuthentication(options);
      
      // Verify with server
      const verifyResponse = await biometricApi.verifyLogin(email, credential);
      
      if (verifyResponse.data.token) {
        setTokens(verifyResponse.data.token, verifyResponse.data.refreshToken, true);
        setUser(verifyResponse.data.user);
        await fetchUser();
        return verifyResponse.data;
      }
      
      throw new Error('Authentication failed');
    } catch (err) {
      const message = err.name === 'NotAllowedError'
        ? 'Biometric authentication was cancelled'
        : err.response?.data?.error || err.message || 'Biometric login failed';
      setError(message);
      throw new Error(message);
    }
  };

  const logout = () => {
    clearTokens();
    setUser(null);
    setRelationship(null);
    setBiometricEnabled(false);
    // Don't clear biometricEmail - we need it for biometric login
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
    refreshUser: fetchUser,
    // Biometric methods
    biometricEnabled,
    checkBiometricAvailability,
    checkBiometricStatus,
    registerBiometric,
    biometricLogin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
