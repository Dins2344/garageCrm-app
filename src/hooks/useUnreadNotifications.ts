import { useCallback, useEffect, useState } from 'react';
import { AppState, DeviceEventEmitter } from 'react-native';
import { getUnreadCount } from '../api/notificationService';
import { NOTIFICATION_POLL_MS, NOTIFICATIONS_CHANGED_EVENT } from '../utils/constants';

/**
 * The unread count for the bell. Re-read every NOTIFICATION_POLL_MS while the
 * app is in the foreground, when it comes back to the foreground, and whenever
 * something emits NOTIFICATIONS_CHANGED_EVENT (a push arrived, a decision, a read).
 */
export function useUnreadNotifications(): { count: number; refresh: () => void } {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    // A poll never toasts: the bell is a convenience, not something to nag about.
    getUnreadCount().then(setCount).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') refresh();
    }, NOTIFICATION_POLL_MS);
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    const changed = DeviceEventEmitter.addListener(NOTIFICATIONS_CHANGED_EVENT, refresh);
    return () => {
      clearInterval(timer);
      appState.remove();
      changed.remove();
    };
  }, [refresh]);

  return { count, refresh };
}
