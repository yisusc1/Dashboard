import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dashboard.app',
  appName: 'Dashboard',
  webDir: 'public',
  server: {
    url: 'http://10.0.2.2:3000',
    cleartext: true
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '820734797192-i79t4gkvss50nq8hqr48qe5oeleb97an.apps.googleusercontent.com',
      forceCodeForRefreshToken: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
