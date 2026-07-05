import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gullstack.loverescue',
  appName: 'Love Rescue',
  webDir: 'build',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1B2735',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      // 'native' lets iOS resize the web view when the keyboard shows, so
      // focused inputs stay visible without any CSS-var plumbing in the app.
      resize: 'native' as any,
      style: 'dark' as any,
      resizeOnFullScreen: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '665328889617-mg6vqui0a5bgkjpj7p85o35lc0f7rnft.apps.googleusercontent.com',
      forceCodeForRefreshToken: false,
    },
  },
};

export default config;
