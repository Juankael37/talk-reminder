import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.talkreminder.app',
  appName: 'Talk Reminder',
  webDir: '.next',
  server: {
    androidScheme: 'https'
  }
};

export default config;