import { isNative, isIOS } from './platform';

// Module-level guards so listeners are only attached once, even though React
// StrictMode double-invokes effects in development and multiple callers may
// race (e.g. App mount + auth bootstrap).
let capacitorInitialized = false;
let pushListenersAttached = false;

/**
 * Initialize Capacitor native plugins.
 * Call this once in your app entry point (e.g., App.js useEffect).
 *
 * @param {Object}   [options]
 * @param {Function} [options.onDeepLink] Called with an SPA path
 *   (pathname + search + hash) when the app is opened via a universal/custom
 *   URL — pass the router's navigate so deep links land on the right screen.
 */
export async function initCapacitor({ onDeepLink } = {}) {
  if (!isNative() || capacitorInitialized) return;
  capacitorInitialized = true;

  // Status Bar
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Light });
    if (isIOS()) {
      // overlay: true => true native edge-to-edge; web view renders under the
      // status bar so env(safe-area-inset-top) padding works (viewport-fit=cover).
      await StatusBar.setOverlaysWebView({ overlay: true });
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

  // Keyboard: handled natively — capacitor.config.ts sets Keyboard.resize to
  // 'native' so the web view resizes when the keyboard shows. No CSS-var
  // plumbing needed here (nothing in the app consumed --keyboard-height).

  // App lifecycle
  try {
    const { App } = await import('@capacitor/app');
    App.addListener('appStateChange', ({ isActive }) => {
      console.log('App state changed. Active:', isActive);
    });
    App.addListener('appUrlOpen', ({ url }) => {
      console.log('App opened with URL:', url);
      // Route deep links into the SPA: https://loverescue.app/join/abc?x=1
      // (or a custom scheme) becomes /join/abc?x=1.
      try {
        const parsed = new URL(url);
        const path = `${parsed.pathname}${parsed.search}${parsed.hash}` || '/';
        if (onDeepLink) {
          onDeepLink(path);
        } else if (window.location.pathname !== parsed.pathname) {
          // Fallback without a router hook: hard-navigate within the SPA.
          window.location.assign(path);
        }
      } catch (err) {
        console.warn('Unparseable deep link URL:', url, err);
      }
    });
  } catch (e) {
    console.warn('App plugin not available:', e);
  }
}

/**
 * Register for push notifications (native), prompting for permission if
 * needed. Returns the push token string or null.
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

    return await registerAndAwaitToken(PushNotifications);
  } catch (e) {
    console.error('Push registration failed:', e);
    return null;
  }
}

/**
 * Silent variant for app startup / login: refreshes the device token ONLY if
 * the user has already granted push permission. Never prompts — first-time
 * opt-in stays with explicit user actions (Settings toggle, post-check-in
 * prompt in DailyLog).
 */
export async function registerNativePushIfGranted() {
  if (!isNative()) return null;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    const permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive !== 'granted') return null;

    return await registerAndAwaitToken(PushNotifications);
  } catch (e) {
    console.error('Push registration failed:', e);
    return null;
  }
}

// Shared APNs/FCM registration; resolves the token (or null on error/timeout).
// Listener handles are removed once settled so repeated calls don't stack
// duplicate 'registration' listeners.
async function registerAndAwaitToken(PushNotifications) {
  await PushNotifications.register();

  return new Promise((resolve) => {
    const handles = [];
    const cleanup = () => handles.forEach((h) => h?.remove?.());
    const timeout = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 10000);

    PushNotifications.addListener('registration', (token) => {
      clearTimeout(timeout);
      cleanup();
      resolve(token.value);
    }).then((h) => handles.push(h));

    PushNotifications.addListener('registrationError', (err) => {
      clearTimeout(timeout);
      cleanup();
      console.error('Push registration error:', err);
      resolve(null);
    }).then((h) => handles.push(h));
  });
}

/**
 * Set up push notification listeners (foreground handling).
 * Attaches at most once per app session (guarded), so calling on every login
 * doesn't stack duplicate listeners.
 */
export async function setupPushListeners(onNotification) {
  if (!isNative() || pushListenersAttached) return;
  pushListenersAttached = true;

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
    pushListenersAttached = false;
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
