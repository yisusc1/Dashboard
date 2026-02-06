import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dashboard.app',
  appName: 'Dashboard',
  webDir: 'public',
  server: {
    url: 'https://proyecto-principal-pearl.vercel.app',
    cleartext: false // HTTPS used
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
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#ffffffff', // Transparent
      overlaysWebView: false,
    },
  },
};

export default config;
