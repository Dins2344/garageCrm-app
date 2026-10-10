import { useEffect } from 'react';
import { DeviceEventEmitter, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerPushToken, markNotificationRead } from '../api/notificationService';
import { openChangeRequest } from '../navigation/navigationRef';
import { useAuth } from '../context/AuthContext';
import { useGarage } from '../context/GarageContext';
import { PUSH_TOKEN_KEY, ACTIVE_GARAGE_KEY, NOTIFICATION_CHANNEL_ID, NOTIFICATIONS_CHANGED_EVENT } from '../utils/constants';

// Show pushes that arrive while the app is open, too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** What the backend puts in `data` (services/pushService.ts). */
export interface PushData {
  notificationId?: string;
  type?: string;
  entityType?: string;
  entityId?: string;
  garageId?: string;
}

interface TapContext {
  isOwner: boolean;
  activeGarageId: string | null;
  switchGarage: (garageId: string) => Promise<void>;
}

/**
 * Asks for permission (Android 13+ shows a prompt), then registers this
 * device's Expo token with the API. The channel must exist before the prompt
 * or Android 13 never shows it. Any failure leaves in-app notifications working.
 */
export async function registerForPush(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: 'Requests',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const granted = current.granted || (await Notifications.requestPermissionsAsync()).status === 'granted';
  if (!granted) return;

  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await registerPushToken(token, Platform.OS === 'ios' ? 'ios' : 'android');
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
}

/** A tapped push: mark it read, move an owner to its branch, open what it is about. */
export async function handleTap(data: PushData, { isOwner, activeGarageId, switchGarage }: TapContext): Promise<void> {
  if (data.notificationId) {
    markNotificationRead(data.notificationId)
      .then(() => DeviceEventEmitter.emit(NOTIFICATIONS_CHANGED_EVENT))
      .catch(() => {});
  }
  if (data.entityType !== 'change_request' || !data.entityId) return;
  // A request lives in one branch; opened from another it answers 404.
  // On a cold start GarageContext still holds the home-garage fallback while
  // the API client already sends the persisted branch, so compare to storage.
  if (isOwner && data.garageId) {
    const current = (await AsyncStorage.getItem(ACTIVE_GARAGE_KEY).catch(() => null)) ?? activeGarageId;
    if (data.garageId !== current) await switchGarage(data.garageId);
  }
  openChangeRequest(data.entityId);
}

// Module scope, so a remount after an idle sign-out and back in does not
// replay the tap that launched the app.
const handledTaps = new Set<string>();

/**
 * Mounted once while someone is signed in. Registers the device, refreshes the
 * bell when a push lands, and routes taps — including the one that cold-started
 * the app, which may have happened before sign-in.
 */
export function PushNotificationsBridge(): null {
  const { user, hasRole } = useAuth();
  const { activeGarageId, switchGarage } = useGarage();
  const userId = user?._id;

  useEffect(() => {
    if (!userId) return;
    registerForPush().catch(() => { /* no Play services, emulator, refused: the bell still works */ });
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const tap = (response: Notifications.NotificationResponse) => {
      const key = response.notification.request.identifier;
      if (handledTaps.has(key)) return;
      handledTaps.add(key);
      handleTap(response.notification.request.content.data as PushData, {
        isOwner: hasRole('owner'), activeGarageId, switchGarage,
      }).catch(() => {});
    };

    Notifications.getLastNotificationResponseAsync().then(r => { if (r) tap(r); }).catch(() => {});
    const tapSub = Notifications.addNotificationResponseReceivedListener(tap);
    const receivedSub = Notifications.addNotificationReceivedListener(() => DeviceEventEmitter.emit(NOTIFICATIONS_CHANGED_EVENT));
    return () => {
      tapSub.remove();
      receivedSub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hasRole/switchGarage change identity every render
  }, [userId, activeGarageId]);

  return null;
}
