import React from 'react';
import { Linking } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WebAppBanner from './WebAppBanner';

describe('WebAppBanner', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  it('shows the banner when it has not been dismissed before', async () => {
    await render(<WebAppBanner />);
    await waitFor(() => expect(screen.getByTestId('web-app-banner')).toBeTruthy());
  });

  it('does not render when previously dismissed', async () => {
    await AsyncStorage.setItem('garagepulse_web_banner_dismissed', 'true');
    await render(<WebAppBanner />);

    // Give the AsyncStorage read a tick to resolve, then confirm it stays hidden.
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled());
    expect(screen.queryByTestId('web-app-banner')).toBeNull();
  });

  it('opens the web app when pressed', async () => {
    const user = userEvent.setup();
    await render(<WebAppBanner />);
    await waitFor(() => expect(screen.getByTestId('web-app-banner')).toBeTruthy());

    await user.press(screen.getByText('More on the web'));

    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('/home'));
  });

  it('persists dismissal so the banner does not reappear', async () => {
    const user = userEvent.setup();
    await render(<WebAppBanner />);
    await waitFor(() => expect(screen.getByTestId('web-app-banner')).toBeTruthy());

    await user.press(screen.getByTestId('web-app-banner-dismiss'));

    await waitFor(() => expect(screen.queryByTestId('web-app-banner')).toBeNull());
    expect(await AsyncStorage.getItem('garagepulse_web_banner_dismissed')).toBe('true');
  });
});
