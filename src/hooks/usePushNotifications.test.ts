import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { registerForPush, handleTap } from './usePushNotifications';
import { registerPushToken, markNotificationRead } from '../api/notificationService';
import { PUSH_TOKEN_KEY, ACTIVE_GARAGE_KEY } from '../utils/constants';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  AndroidImportance: { HIGH: 4 },
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { easConfig: { projectId: 'proj-1' }, expoConfig: null },
}));
jest.mock('../api/notificationService', () => ({
  registerPushToken: jest.fn().mockResolvedValue(undefined),
  markNotificationRead: jest.fn().mockResolvedValue(undefined),
}));
// The bridge component is not under test here, and the real contexts pull in axios.
jest.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../context/GarageContext', () => ({ useGarage: jest.fn() }));
jest.mock('../navigation/navigationRef', () => ({ openChangeRequest: jest.fn() }));
const { openChangeRequest } = jest.requireMock('../navigation/navigationRef');

describe('registerForPush', () => {
  // jest-expo's default preset runs as iOS; the channel and platform are Android-only behaviour.
  let platformSpy: ReturnType<typeof jest.replaceProperty>;
  beforeEach(() => {
    jest.clearAllMocks();
    platformSpy = jest.replaceProperty(Platform, 'OS', 'android');
  });
  afterEach(() => platformSpy.restore());

  it('asks once, registers the token with the API and remembers it', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: false } as never);
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({ status: 'granted' } as never);
    jest.mocked(Notifications.getExpoPushTokenAsync).mockResolvedValue({ data: 'ExponentPushToken[abc]' } as never);

    await registerForPush();

    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('requests', expect.objectContaining({ name: 'Requests' }));
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'proj-1' });
    expect(registerPushToken).toHaveBeenCalledWith('ExponentPushToken[abc]', 'android');
    expect(await AsyncStorage.getItem(PUSH_TOKEN_KEY)).toBe('ExponentPushToken[abc]');
  });

  it('does nothing more when permission is refused', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: false } as never);
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({ status: 'denied' } as never);

    await registerForPush();

    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(registerPushToken).not.toHaveBeenCalled();
  });
});

describe('handleTap', () => {
  const data = { notificationId: 'n1', entityType: 'change_request', entityId: 'cr1', garageId: 'g2' };
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it("marks it read, switches an owner to the request's branch, then opens it", async () => {
    const switchGarage = jest.fn().mockResolvedValue(undefined);
    await handleTap(data, { isOwner: true, activeGarageId: 'g1', switchGarage });

    expect(markNotificationRead).toHaveBeenCalledWith('n1');
    expect(switchGarage).toHaveBeenCalledWith('g2');
    expect(openChangeRequest).toHaveBeenCalledWith('cr1');
    expect(switchGarage.mock.invocationCallOrder[0]).toBeLessThan(openChangeRequest.mock.invocationCallOrder[0]);
  });

  it('compares with the persisted branch, not the context fallback, on a cold start', async () => {
    await AsyncStorage.setItem(ACTIVE_GARAGE_KEY, 'g3');
    const switchGarage = jest.fn().mockResolvedValue(undefined);
    await handleTap({ ...data, garageId: 'g2' }, { isOwner: true, activeGarageId: 'g2', switchGarage });
    expect(switchGarage).toHaveBeenCalledWith('g2');
  });

  it('never switches branch for staff', async () => {
    const switchGarage = jest.fn();
    await handleTap(data, { isOwner: false, activeGarageId: 'g1', switchGarage });
    expect(switchGarage).not.toHaveBeenCalled();
    expect(openChangeRequest).toHaveBeenCalledWith('cr1');
  });

  it('ignores a push about something it cannot open', async () => {
    await handleTap({ entityType: 'other' }, { isOwner: true, activeGarageId: 'g1', switchGarage: jest.fn() });
    expect(openChangeRequest).not.toHaveBeenCalled();
  });
});
