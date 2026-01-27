import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dashboard.app',
  appName: 'Dashboard',
  webDir: 'public',
  server: {
    url: 'https://proyecto-principal-pearl.vercel.app',
    cleartext: true
  }
};

export default config;
