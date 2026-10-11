import { AppState, DeviceEventEmitter } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import { useUnreadNotifications } from './useUnreadNotifications';
import { getUnreadCount } from '../api/notificationService';
import { NOTIFICATION_POLL_MS, NOTIFICATIONS_CHANGED_EVENT } from '../utils/constants';

jest.mock('../api/notificationService', () => ({
  getUnreadCount: jest.fn(),
}));

const setAppState = (state: string) => {
  (AppState as { currentState: string }).currentState = state;
};

describe('useUnreadNotifications', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.mocked(getUnreadCount).mockResolvedValue(3);
    setAppState('active');
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('reads on mount, polls while active, refreshes on the change event, and stops on unmount', async () => {
    const { result, unmount } = await renderHook(() => useUnreadNotifications());
    expect(getUnreadCount).toHaveBeenCalledTimes(1);
    await act(async () => {});
    expect(result.current.count).toBe(3);

    await act(async () => { jest.advanceTimersByTime(NOTIFICATION_POLL_MS); });
    expect(getUnreadCount).toHaveBeenCalledTimes(2);

    await act(async () => { DeviceEventEmitter.emit(NOTIFICATIONS_CHANGED_EVENT); });
    expect(getUnreadCount).toHaveBeenCalledTimes(3);

    setAppState('background');
    await act(async () => { jest.advanceTimersByTime(NOTIFICATION_POLL_MS); });
    expect(getUnreadCount).toHaveBeenCalledTimes(3);

    await unmount();
    setAppState('active');
    await act(async () => {
      jest.advanceTimersByTime(NOTIFICATION_POLL_MS * 2);
      DeviceEventEmitter.emit(NOTIFICATIONS_CHANGED_EVENT);
    });
    expect(getUnreadCount).toHaveBeenCalledTimes(3);
  });
});
