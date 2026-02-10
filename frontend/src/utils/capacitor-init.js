import { isNative, isIOS } from './platform';

/**
 * Initialize Capacitor native plugins.
 * Call this once in your app entry point (e.g., App.js useEffect).
 */
export async function initCapacitor() {
  if (!isNative()) return;

  // Status Bar
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Light });
    if (isIOS()) {
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch (e) {
    console.warn('StatusBar plugin not available:', e);
  }

  // Splash Screen — hide after app is ready
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch (e) {
    console.warn('SplashScreen plugin not available:', e);
  }

  // Keyboard
  try {
    const { Keyboard } = await import('@capacitor/keyboard');
    Keyboard.addListener('keyboardWillShow', (info) => {
      document.body.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.style.setProperty('--keyboard-height', '0px');
    });
  } catch (e) {
    console.warn('Keyboard plugin not available:', e);
  }

  // App lifecycle
  try {
    const { App } = await import('@capacitor/app');
    App.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Active:', isActive);
    });
    App.addListener('appUrlOpen', ({ url }) => {
      console.log('App opened with URL:', url);
      // Handle deep links here
    });
  } catch (e) {
    console.warn('App plugin not available:', e);
  }
}

/**
 * Register for push notifications (native).
 * Returns the push token string or null.
 */
export async function registerNativePush() {
  if (!isNative()) return null;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    const permResult = await PushNotifications.requestPermissions();
    if (permResult.receive !== 'granted') {
      console.warn('Push permission not granted');
      return null;
    }

    await PushNotifications.register();

    return new Promise((resolve) => {
      PushNotifications.addListener('registration', (token) => {
        console.log('Push token:', token.value);
        resolve(token.value);
      });
      PushNotifications.addListener('registrationError', (err) => {
        console.error('Push registration error:', err);
        resolve(null);
      });
    });
  } catch (e) {
    console.error('Push registration failed:', e);
    return null;
  }
}

/**
 * Set up push notification listeners (foreground handling).
 */
export async function setupPushListeners(onNotification) {
  if (!isNative()) return;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received:', notification);
      if (onNotification) onNotification(notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Push action:', action);
      // Handle notification tap — navigate to relevant screen
    });
  } catch (e) {
    console.warn('Push listeners not available:', e);
  }
}

/**
 * Trigger haptic feedback.
 */
export async function hapticFeedback(type = 'Medium') {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle[type] || ImpactStyle.Medium });
  } catch (e) {
    // Silently fail on web
  }
}
