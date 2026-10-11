import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationsScreen from './NotificationsScreen';
import { GlobalLoaderProvider } from '../context/GlobalLoaderContext';
import * as notificationService from '../api/notificationService';
import { ACTIVE_GARAGE_KEY } from '../utils/constants';
import type { AppNotification } from '../types/models';
import type { RootStackScreenProps } from '../types/navigation';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (cb: () => void | (() => void)) => {
    const react = require('react');
    react.useEffect(cb, [cb]);
  },
}));
jest.mock('../api/notificationService', () => ({
  getNotifications: jest.fn(),
  markNotificationRead: jest.fn(),
  markAllNotificationsRead: jest.fn(),
}));
const mockSwitchGarage = jest.fn().mockResolvedValue(undefined);
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ hasRole: (...r: string[]) => r.includes('owner') }),
}));
jest.mock('../context/GarageContext', () => ({
  useGarage: () => ({ activeGarageId: 'g1', switchGarage: mockSwitchGarage }),
}));

const NOTE: AppNotification = {
  _id: 'n1', user: 'u1', garage: 'g2', type: 'request_raised', title: 'Cancellation requested',
  body: 'Ravi asked to cancel JC-1: no', entityType: 'change_request', entity: 'cr1', readAt: null,
  createdAt: '2026-10-10T05:00:00Z',
};
const navigation = { navigate: jest.fn(), setOptions: jest.fn() };
const props = { route: { params: undefined }, navigation } as unknown as RootStackScreenProps<'Notifications'>;

describe('NotificationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(notificationService.getNotifications).mockResolvedValue({ success: true, count: 1, total: 1, pages: 1, currentPage: 1, data: [NOTE] });
    jest.mocked(notificationService.markNotificationRead).mockResolvedValue({ success: true, data: { ...NOTE, readAt: 'now' } });
    jest.mocked(notificationService.markAllNotificationsRead).mockResolvedValue(undefined);
  });

  it("opens a request from another branch by switching to it first", async () => {
    const user = userEvent.setup();
    await render(<GlobalLoaderProvider><NotificationsScreen {...props} /></GlobalLoaderProvider>);

    await user.press(await screen.findByText('Cancellation requested'));

    expect(notificationService.markNotificationRead).toHaveBeenCalledWith('n1');
    await waitFor(() => expect(mockSwitchGarage).toHaveBeenCalledWith('g2'));
    expect(navigation.navigate).toHaveBeenCalledWith('ChangeRequestDetail', { id: 'cr1' });
  });

  it("compares against the branch the API client sends, not the context's", async () => {
    await AsyncStorage.setItem(ACTIVE_GARAGE_KEY, 'g3'); // context says g1; requests go out as g3
    const user = userEvent.setup();
    await render(<GlobalLoaderProvider><NotificationsScreen {...props} /></GlobalLoaderProvider>);

    await user.press(await screen.findByText('Cancellation requested'));

    await waitFor(() => expect(mockSwitchGarage).toHaveBeenCalledWith('g2'));
    await AsyncStorage.removeItem(ACTIVE_GARAGE_KEY);
  });

  it('says so when there is nothing', async () => {
    jest.mocked(notificationService.getNotifications).mockResolvedValue({ success: true, count: 0, total: 0, pages: 0, currentPage: 1, data: [] });
    await render(<GlobalLoaderProvider><NotificationsScreen {...props} /></GlobalLoaderProvider>);
    expect(await screen.findByText('No notifications yet')).toBeTruthy();
  });

  it('marks everything read from the header button and reloads the list', async () => {
    const user = userEvent.setup();
    await render(<GlobalLoaderProvider><NotificationsScreen {...props} /></GlobalLoaderProvider>);
    await screen.findByText('Cancellation requested');
    const { headerRight } = navigation.setOptions.mock.calls.at(-1)[0];
    const loadsBefore = jest.mocked(notificationService.getNotifications).mock.calls.length;

    await render(headerRight());
    await user.press(screen.getByLabelText('Mark all read'));

    await waitFor(() => expect(jest.mocked(notificationService.getNotifications).mock.calls.length).toBe(loadsBefore + 1));
    expect(notificationService.markAllNotificationsRead).toHaveBeenCalledTimes(1);
  });
});
