import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.andreasbjorsvik.treningsappen',
  appName: 'Treningsappen',
  webDir: 'dist',
  server: {
    url: 'https://b76d427e-030c-484a-b51c-8b1ec9d0841b.lovableproject.com?forceHideBadge=true&v=4',
    cleartext: true,
  },
};

export default config;
