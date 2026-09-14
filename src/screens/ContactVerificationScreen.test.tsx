import React from 'react';
import { render, screen, waitFor, userEvent, within } from '@testing-library/react-native';
import ContactVerificationScreen from './ContactVerificationScreen';
import * as authService from '../api/authService';
import type { User } from '../types/models';
import type { RootStackScreenProps } from '../types/navigation';

// Explicit factory — importing the real module pulls in apiInterceptor and
// axios, which jest-expo cannot load.
jest.mock('../api/authService', () => ({
  sendVerificationCode: jest.fn(),
  confirmVerificationCode: jest.fn(),
  getVerificationStatus: jest.fn(),
}));

// The screen is driven by `user.*VerifiedAt`; `mockAuth` lets each test choose
// the starting state and observe `refreshUser` being asked to pick it up.
const mockAuth: { user: Partial<User>; refreshUser: jest.Mock } = {
  user: {},
  refreshUser: jest.fn().mockResolvedValue(undefined),
};
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: mockAuth.user, refreshUser: mockAuth.refreshUser }),
}));

const owner = (over: Partial<User> = {}): Partial<User> => ({
  _id: 'u1', role: 'owner', name: 'Owner', email: 'o@example.com', phone: '9876543210',
  emailVerifiedAt: null, phoneVerifiedAt: null, ...over,
});

const props = {} as RootStackScreenProps<'ContactVerification'>;

describe('ContactVerificationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(authService.sendVerificationCode).mockResolvedValue({
      success: true,
      data: { status: 'sent', channel: 'email', target: 'o***o@example.com', expiresInSeconds: 600, resendAfterSeconds: 60 },
    });
    jest.mocked(authService.confirmVerificationCode).mockResolvedValue({
      success: true,
      data: owner({ emailVerifiedAt: '2026-09-14T00:00:00Z' }) as User,
    });
  });

  it('shows both channels as not verified for a fresh owner', async () => {
    mockAuth.user = owner();
    await render(<ContactVerificationScreen {...props} />);

    expect(screen.getAllByText('Not verified')).toHaveLength(2);
    expect(screen.getByTestId('verify-email')).toBeTruthy();
    expect(screen.getByTestId('verify-phone')).toBeTruthy();
  });

  it('shows Verified and no button for a verified channel', async () => {
    mockAuth.user = owner({ phoneVerifiedAt: '2026-09-01T00:00:00Z' });
    await render(<ContactVerificationScreen {...props} />);

    expect(screen.getByText('Verified')).toBeTruthy();
    expect(screen.getByText('Not verified')).toBeTruthy();
    expect(screen.queryByTestId('verify-phone')).toBeNull();
    expect(screen.getByTestId('verify-email')).toBeTruthy();
  });

  it('sends the code on open, confirms what was typed, and refreshes the user', async () => {
    mockAuth.user = owner();
    const user = userEvent.setup();
    await render(<ContactVerificationScreen {...props} />);

    await user.press(screen.getByTestId('verify-email'));

    await waitFor(() => expect(authService.sendVerificationCode).toHaveBeenCalledWith('email'));
    expect(await screen.findByText('o***o@example.com')).toBeTruthy();

    await user.type(screen.getByTestId('verification-code'), '48 29 13');
    expect(screen.getByTestId('verification-code').props.value).toBe('482913');

    await user.press(within(screen.getByTestId('verification-confirm')).getByText('Verify'));

    await waitFor(() => expect(authService.confirmVerificationCode).toHaveBeenCalledWith('email', '482913'));
    await waitFor(() => expect(mockAuth.refreshUser).toHaveBeenCalled());
  });

  it('surfaces the server message when a code is wrong', async () => {
    mockAuth.user = owner();
    jest.mocked(authService.confirmVerificationCode).mockRejectedValueOnce({
      response: { data: { message: 'Incorrect code. 4 attempts remaining' } },
    });
    const user = userEvent.setup();
    await render(<ContactVerificationScreen {...props} />);

    await user.press(screen.getByTestId('verify-phone'));
    await screen.findByText('o***o@example.com');
    await user.type(screen.getByTestId('verification-code'), '000000');
    await user.press(within(screen.getByTestId('verification-confirm')).getByText('Verify'));

    expect(await screen.findByText('Incorrect code. 4 attempts remaining')).toBeTruthy();
    expect(mockAuth.refreshUser).not.toHaveBeenCalled();
  });

  it('shows the cooldown message when sending is refused', async () => {
    mockAuth.user = owner();
    jest.mocked(authService.sendVerificationCode).mockRejectedValueOnce({
      response: { data: { message: 'Please wait a minute before requesting another code' } },
    });
    const user = userEvent.setup();
    await render(<ContactVerificationScreen {...props} />);

    await user.press(screen.getByTestId('verify-email'));

    expect(await screen.findByText('Please wait a minute before requesting another code')).toBeTruthy();
    expect(screen.getByTestId('verification-code').props.editable).toBe(false);
  });
});
