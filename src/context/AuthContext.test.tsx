import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from './AuthContext';
import * as authService from '../api/authService';
import type { User } from '../types/models';

// Explicit factory — a bare `jest.mock('../api/authService')` automock would
// still require the real module (and its `apiInterceptor.ts` -> `axios.create()`
// chain) to introspect its shape, which crashes under jest-expo's fetch polyfill.
jest.mock('../api/authService', () => ({
  login: jest.fn(),
  register: jest.fn(),
  getMe: jest.fn(),
}));

const mockUser: User = {
  _id: 'u1',
  name: 'Test Owner',
  email: 'owner@example.com',
  phone: '9000000001',
  role: 'owner',
  garage: 'g1',
  isActive: true,
};

function Consumer() {
  const { user, loading, login, logout, hasRole } = useAuth();
  return (
    <View>
      <Text testID="loading">{String(loading)}</Text>
      <Text testID="user">{user ? user.email : 'none'}</Text>
      <Text testID="has-owner-role">{String(hasRole('owner'))}</Text>
      <TouchableOpacity testID="login-btn" onPress={() => login('owner@example.com', 'password123')}>
        <Text>login</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="logout-btn" onPress={() => logout()}>
        <Text>logout</Text>
      </TouchableOpacity>
    </View>
  );
}

// AuthContext only calls getMe() to re-validate a session that's already
// persisted in AsyncStorage (unlike the web app, which always calls getMe()
// on mount) — tests that exercise that path must seed storage first.
async function seedStoredSession() {
  await AsyncStorage.setItem('garagepulse_token', 'stored-token');
  await AsyncStorage.setItem('garagepulse_user', JSON.stringify(mockUser));
}

describe('AuthContext', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('resolves the session from getMe() on mount when one is already stored', async () => {
    await seedStoredSession();
    jest.mocked(authService.getMe).mockResolvedValue({ success: true, data: mockUser });

    await render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('user').props.children).toBe('owner@example.com');
  });

  it('leaves user null when there is no stored session', async () => {
    await render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('user').props.children).toBe('none');
    expect(authService.getMe).not.toHaveBeenCalled();
  });

  it('logs out and clears user when getMe() rejects a stored session', async () => {
    await seedStoredSession();
    jest.mocked(authService.getMe).mockRejectedValue(new Error('401'));

    await render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));
    expect(screen.getByTestId('user').props.children).toBe('none');
    expect(await AsyncStorage.getItem('garagepulse_token')).toBeNull();
  });

  it('login() stores the user and updates hasRole()', async () => {
    jest.mocked(authService.login).mockResolvedValue({ success: true, token: 'tok', data: mockUser });
    const user = userEvent.setup();

    await render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId('loading').props.children).toBe('false'));

    await user.press(screen.getByTestId('login-btn'));

    await waitFor(() => expect(screen.getByTestId('user').props.children).toBe('owner@example.com'));
    expect(screen.getByTestId('has-owner-role').props.children).toBe('true');
  });

  it('logout() clears the user even if there is no server-side call', async () => {
    await seedStoredSession();
    jest.mocked(authService.getMe).mockResolvedValue({ success: true, data: mockUser });
    const user = userEvent.setup();

    await render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId('user').props.children).toBe('owner@example.com'));

    await user.press(screen.getByTestId('logout-btn'));

    await waitFor(() => expect(screen.getByTestId('user').props.children).toBe('none'));
  });
});
