import React from 'react';
import { Text, AppState } from 'react-native';
import { render, screen, act, fireEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from '../context/AuthContext';
import * as authService from '../api/authService';
import { LAST_ACTIVITY_KEY, TOKEN_KEY, USER_KEY } from '../utils/constants';

jest.mock('../api/authService', () => ({
  login: jest.fn(),
  register: jest.fn(),
  getMe: jest.fn(),
}));

jest.mock('../api/notificationService', () => ({ unregisterPushToken: jest.fn() }));

const MIN = 60 * 1000;
const mockUser = { _id: 'u1', name: 'Owner', email: 'owner@example.com', phone: '9000000001', role: 'owner', garage: 'g1', isActive: true };

function Consumer() {
  const { user } = useAuth();
  return <Text testID="user">{user ? user.email : 'none'}</Text>;
}

const flush = () => act(async () => { await Promise.resolve(); });

/** Renders a signed-in session under fake timers. */
async function renderSignedIn() {
  await AsyncStorage.setItem(TOKEN_KEY, 'stored-token');
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(mockUser));
  await AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  jest.mocked(authService.getMe).mockResolvedValue({ success: true, data: mockUser as never });
  await render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>
  );
  await flush();
  expect(screen.getByTestId('user').props.children).toBe('owner@example.com');
  jest.mocked(authService.getMe).mockClear();
}

const touch = () => fireEvent(screen.getByTestId('idle-timer'), 'startShouldSetResponder');

describe('IdleTimer', () => {
  let appStateHandler: ((state: string) => void) | undefined;

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    jest.useFakeTimers();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      appStateHandler = handler as (state: string) => void;
      return { remove: jest.fn() } as never;
    });
  });
  afterEach(() => jest.useRealTimers());

  it('signs out after ten minutes without a touch', async () => {
    await renderSignedIn();

    await act(async () => { await jest.advanceTimersByTimeAsync(11 * MIN); });

    expect(screen.getByTestId('user').props.children).toBe('none');
  });

  it('stays signed in while the screen is being touched', async () => {
    await renderSignedIn();

    for (let i = 0; i < 4; i++) {
      await act(async () => { await jest.advanceTimersByTimeAsync(4 * MIN); });
      touch();
    }

    expect(screen.getByTestId('user').props.children).toBe('owner@example.com');
  });

  it('touches the server every five minutes while active so the session slides', async () => {
    await renderSignedIn();

    await act(async () => { await jest.advanceTimersByTimeAsync(4 * MIN); });
    touch();
    await act(async () => { await jest.advanceTimersByTimeAsync(2 * MIN); });

    expect(authService.getMe).toHaveBeenCalledTimes(1);
  });

  it('signs out on return to the foreground when the idle window passed in the background', async () => {
    await renderSignedIn();

    // Background: JS timers do not run, so only the clock moves.
    jest.setSystemTime(Date.now() + 11 * MIN);
    await act(async () => { appStateHandler?.('active'); await Promise.resolve(); });

    expect(screen.getByTestId('user').props.children).toBe('none');
  });
});
