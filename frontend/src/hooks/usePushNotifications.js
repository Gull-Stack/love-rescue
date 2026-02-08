import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if push is supported
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    
    if (supported) {
      checkSubscription();
    } else {
      setIsLoading(false);
    }
  }, []);

  // Register service worker
  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/push-sw.js');
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (err) {
      console.error('Service Worker registration failed:', err);
      throw err;
    }
  };

  // Check current subscription status
  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error('Error checking subscription:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Get VAPID public key from server
  const getVapidKey = async () => {
    const response = await api.get('/push/vapid-public-key');
    return response.data.publicKey;
  };

  // Convert base64 to Uint8Array for VAPID key
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Register service worker first
      await registerServiceWorker();
      
      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;
      
      // Get VAPID key
      const vapidKey = await getVapidKey();
      
      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // Send subscription to server
      await api.post('/push/subscribe', { subscription: subscription.toJSON() });
      
      setIsSubscribed(true);
      return { success: true };
    } catch (err) {
      console.error('Push subscription error:', err);
      setError(err.message || 'Failed to enable notifications');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();
        
        // Tell server to remove subscription
        await api.post('/push/unsubscribe', { endpoint: subscription.endpoint });
      }
      
      setIsSubscribed(false);
      return { success: true };
    } catch (err) {
      console.error('Push unsubscribe error:', err);
      setError(err.message || 'Failed to disable notifications');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send test notification
  const sendTest = useCallback(async () => {
    try {
      const response = await api.post('/push/test');
      return response.data;
    } catch (err) {
      console.error('Test notification error:', err);
      throw err;
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    sendTest,
    checkSubscription,
  };
};

export default usePushNotifications;
