import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dashboard.app',
  appName: 'Dashboard',
  webDir: 'public',
  server: {
    url: 'https://proyecto-principal-pearl.vercel.app',
    cleartext: true
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '766327056238-q5st3j8t2tq946s222222.apps.googleusercontent.com', // Replace with your Web Client ID from Supabase/Google Cloud
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
