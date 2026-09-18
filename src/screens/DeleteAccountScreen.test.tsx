import React from 'react';
import { Alert } from 'react-native';
import { act, render, screen, waitFor, userEvent } from '@testing-library/react-native';
import Toast from 'react-native-toast-message';
import DeleteAccountScreen from './DeleteAccountScreen';
import * as authService from '../api/authService';
import type { RootStackScreenProps } from '../types/navigation';

/**
 * Deletion needs the password and then a final Alert. The role decides the
 * warning copy and the server decides whether the password is right.
 */

jest.mock('../api/authService', () => ({
  deleteAccount: jest.fn(),
}));

jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

const mockAuth = { role: 'owner', logout: jest.fn().mockResolvedValue(undefined) };
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { _id: 'u1', name: 'Rahul Menon', email: 'rahul@example.com', role: mockAuth.role },
    hasRole: (...roles: string[]) => roles.includes(mockAuth.role),
    logout: mockAuth.logout,
  }),
}));

const props = {} as RootStackScreenProps<'DeleteAccount'>;
const alertSpy = jest.spyOn(Alert, 'alert');

const pressAlertButton = (label: string) => {
  const buttons = alertSpy.mock.calls.at(-1)![2] as { text: string; onPress?: () => void }[];
  buttons.find(b => b.text === label)!.onPress!();
};

describe('DeleteAccountScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.role = 'owner';
    alertSpy.mockImplementation(() => {});
    jest.mocked(authService.deleteAccount).mockResolvedValue({ success: true, message: 'Your account has been deleted' });
  });

  it('tells an owner the garage goes with them and a staff member that only their login does', async () => {
    await render(<DeleteAccountScreen {...props} />);
    expect(screen.getByText(/Every branch you own will be deleted/)).toBeTruthy();

    mockAuth.role = 'mechanic';
    await render(<DeleteAccountScreen {...props} />);
    expect(screen.getByText(/Your login will be removed/)).toBeTruthy();
  });

  it('does nothing without a password', async () => {
    const user = userEvent.setup();
    await render(<DeleteAccountScreen {...props} />);

    await user.press(screen.getByTestId('delete-account-button'));
    expect(alertSpy).not.toHaveBeenCalled();
    expect(authService.deleteAccount).not.toHaveBeenCalled();
  });

  it('asks once more, then deletes with the password and signs out', async () => {
    const user = userEvent.setup();
    await render(<DeleteAccountScreen {...props} />);

    await user.type(screen.getByTestId('delete-account-password'), 'hunter22');
    await user.press(screen.getByTestId('delete-account-button'));

    expect(alertSpy).toHaveBeenCalledWith('Delete your account?', expect.stringMatching(/Every branch you own/), expect.any(Array));
    expect(authService.deleteAccount).not.toHaveBeenCalled();

    await act(async () => { pressAlertButton('Delete'); });

    await waitFor(() => expect(authService.deleteAccount).toHaveBeenCalledWith('hunter22'));
    await waitFor(() => expect(mockAuth.logout).toHaveBeenCalled());
    expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('keeps the account when the alert is dismissed', async () => {
    const user = userEvent.setup();
    await render(<DeleteAccountScreen {...props} />);

    await user.type(screen.getByTestId('delete-account-password'), 'hunter22');
    await user.press(screen.getByTestId('delete-account-button'));
    const buttons = alertSpy.mock.calls.at(-1)![2] as { text: string; onPress?: () => void }[];
    buttons.find(b => b.text === 'Keep my account')!.onPress?.();

    expect(authService.deleteAccount).not.toHaveBeenCalled();
    expect(mockAuth.logout).not.toHaveBeenCalled();
  });

  it('shows the server message on a wrong password and stays signed in', async () => {
    jest.mocked(authService.deleteAccount).mockRejectedValue({ response: { data: { message: 'Password is incorrect' } } });
    const user = userEvent.setup();
    await render(<DeleteAccountScreen {...props} />);

    await user.type(screen.getByTestId('delete-account-password'), 'wrong');
    await user.press(screen.getByTestId('delete-account-button'));
    await act(async () => { pressAlertButton('Delete'); });

    await waitFor(() => expect(screen.getByText('Password is incorrect')).toBeTruthy());
    expect(mockAuth.logout).not.toHaveBeenCalled();
  });
});
