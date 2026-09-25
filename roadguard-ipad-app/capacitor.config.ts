import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.roadguard.ipad',
  appName: 'RoadGuard iPad Hub',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  ios: {
    preferredContentMode: 'mobile',
    backgroundColor: '#090d16'
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#38bdf8',
      sound: 'beep.wav'
    }
  }
};

export default config;
