import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.talkreminder.app',
  appName: 'Talk Reminder',
  webDir: '.next',
  server: {
    url: 'https://talk-reminder-8f7uwaasp-juankael37s-projects.vercel.app',
    androidScheme: 'https'
  }
};

export default config;