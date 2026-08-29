import { Linking } from 'react-native';
import Toast from 'react-native-toast-message';
import { PLAY_STORE_MARKET_URL, PLAY_STORE_URL } from './constants';

/**
 * Open this app's Play Store listing. Shaped like `utils/webApp.ts`.
 *
 * `market://` first, so the Play app opens directly with no browser round
 * trip; the https listing is the fallback for a device without it.
 *
 * **Deliberately no `Linking.canOpenURL` guard.** Android 11+ package
 * visibility makes `canOpenURL` return `false` for any scheme not declared in a
 * `<queries>` manifest entry, so guarding would send every modern device down
 * the browser path. Attempt and catch is the correct shape here.
 */
export const openStoreListing = async () => {
  try {
    await Linking.openURL(PLAY_STORE_MARKET_URL);
  } catch {
    try {
      await Linking.openURL(PLAY_STORE_URL);
    } catch {
      // The blocking screen keeps both version numbers visible, so a user who
      // lands here can still find the app in the store by hand.
      Toast.show({ type: 'error', text1: 'Could not open the Play Store' });
    }
  }
};
