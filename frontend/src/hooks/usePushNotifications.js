import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import api from '../services/api';

const isNative = () => Capacitor.isNativePlatform();

const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isNative()) {
      // Native iOS/Android — use Capacitor Push Notifications
      setIsSupported(true);
      checkNativeSubscription();
    } else {
      // Web — use VAPID/Service Worker
      const supported = 'serviceWorker' in navigator && 'PushManager' in window;
      setIsSupported(supported);
      if (supported) {
        checkWebSubscription();
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  // ── Native (iOS/Android) ──

  const checkNativeSubscription = async () => {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const permStatus = await PushNotifications.checkPermissions();
      setIsSubscribed(permStatus.receive === 'granted');
    } catch (err) {
      console.error('Native push check error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeNative = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');

      // Request permission
      const permStatus = await PushNotifications.requestPermissions();
      if (permStatus.receive !== 'granted') {
        throw new Error('Push notification permission denied');
      }

      // Register with APNs/FCM
      await PushNotifications.register();

      // Listen for registration success
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Push registration timed out'));
        }, 10000);

        PushNotifications.addListener('registration', async (token) => {
          clearTimeout(timeout);
          console.log('Push token received:', token.value.substring(0, 16) + '...');

          try {
            const platform = Capacitor.getPlatform(); // 'ios' or 'android'
            await api.post('/push/register-device', {
              token: token.value,
              platform,
            });
            setIsSubscribed(true);
            resolve({ success: true });
          } catch (err) {
            reject(err);
          }
        });

        PushNotifications.addListener('registrationError', (err) => {
          clearTimeout(timeout);
          console.error('Push registration error:', err);
          reject(new Error(err.error || 'Registration failed'));
        });
      });
    } catch (err) {
      console.error('Native push subscribe error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeNative = async () => {
    setIsLoading(true);
    try {
      await api.post('/push/unregister-device');
      setIsSubscribed(false);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // ── Web (VAPID) ──

  const registerServiceWorker = async () => {
    const registration = await navigator.serviceWorker.register('/push-sw.js');
    return registration;
  };

  const checkWebSubscription = async () => {
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

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeWeb = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await registerServiceWorker();
      const registration = await navigator.serviceWorker.ready;
      const response = await api.get('/push/vapid-public-key');
      const vapidKey = response.data.publicKey;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      await api.post('/push/subscribe', { subscription: subscription.toJSON() });
      setIsSubscribed(true);
      return { success: true };
    } catch (err) {
      setError(err.message || 'Failed to enable notifications');
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeWeb = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await api.post('/push/unsubscribe', { endpoint: subscription.endpoint });
      }
      setIsSubscribed(false);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // ── Unified API ──

  const subscribe = useCallback(async () => {
    return isNative() ? subscribeNative() : subscribeWeb();
  }, []);

  const unsubscribe = useCallback(async () => {
    return isNative() ? unsubscribeNative() : unsubscribeWeb();
  }, []);

  const sendTest = useCallback(async () => {
    if (isNative()) {
      const response = await api.post('/push/test-apns');
      return response.data;
    }
    const response = await api.post('/push/test');
    return response.data;
  }, []);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    sendTest,
    checkSubscription: isNative() ? checkNativeSubscription : checkWebSubscription,
  };
};

export default usePushNotifications;
