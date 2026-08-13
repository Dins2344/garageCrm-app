import { Linking } from 'react-native';
import Toast from 'react-native-toast-message';

// Same env-var convention as apiInterceptor.ts's API_BASE_URL — EAS build
// profiles set EXPO_PUBLIC_WEB_APP_URL (see eas.json); local `expo start`
// falls back to the web app's local dev server.
export const WEB_APP_URL = process.env.EXPO_PUBLIC_WEB_APP_URL || 'http://localhost:3000/home';

export const openWebApp = async () => {
  try {
    await Linking.openURL(WEB_APP_URL);
  } catch {
    Toast.show({ type: 'error', text1: 'Could not open the web app' });
  }
};
