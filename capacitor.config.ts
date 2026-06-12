import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.eha.amfpdm',
  appName: 'AMF PDM Analyser',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    // Route fetch/XHR through the native Android HTTP stack so that
    // requests to kf.kobotoolbox.org bypass WebView CORS restrictions.
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
