import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.talkreminder.app',
  appName: 'Mate Reminder',
  webDir: '.next',
  server: {
    url: 'https://talk-reminder.vercel.app',
    androidScheme: 'https'
  }
};

export default config;