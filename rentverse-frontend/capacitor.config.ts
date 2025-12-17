import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.rentverse.app',
  appName: 'RentVerse',
  webDir: 'out',
  server: {
    url: 'https://your-app.vercel.app',
    cleartext: false,
  },
}

export default config
