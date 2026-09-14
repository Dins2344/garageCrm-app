import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import SampleDataBanner from './SampleDataBanner';
import * as garageService from '../api/garageService';

// Explicit factory, not a bare automock: automocking has to require() the real
// module to read its shape, which reaches apiInterceptor's axios.create() and
// crashes under jest-expo.
jest.mock('../api/garageService', () => ({
  removeSampleData: jest.fn(),
}));

/**
 * Fires the Alert's destructive button, which is what actually calls the API.
 * Wrapped in `act` because that handler sets state — without it React warns and
 * the assertions race the re-render.
 */
const confirmAlert = async () => {
  const [, , buttons] = jest.mocked(Alert.alert).mock.calls[0];
  const remove = buttons?.find(b => b.style === 'destructive');
  await act(async () => { await remove?.onPress?.(); });
};

describe('SampleDataBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('renders nothing when the garage has no sample data', async () => {
    await render(<SampleDataBanner visible={false} onRemoved={jest.fn()} />);

    expect(screen.queryByTestId('sample-data-banner')).toBeNull();
  });

  it('shows when the garage still holds seeded rows', async () => {
    await render(<SampleDataBanner visible onRemoved={jest.fn()} />);

    expect(screen.getByTestId('sample-data-banner')).toBeTruthy();
    expect(screen.getByText('Sample data')).toBeTruthy();
  });

  it('asks before deleting anything', async () => {
    await render(<SampleDataBanner visible onRemoved={jest.fn()} />);

    await fireEvent.press(screen.getByTestId('sample-data-remove'));

    // The press alone must not call the API — this is a destructive action on
    // data the owner may have started using.
    expect(Alert.alert).toHaveBeenCalled();
    expect(garageService.removeSampleData).not.toHaveBeenCalled();
  });

  it('removes the data and tells the caller to refetch once confirmed', async () => {
    jest.mocked(garageService.removeSampleData).mockResolvedValue({
      success: true,
      data: { customers: 3, vehicles: 4, jobCards: 5, invoices: 1 },
    });
    const onRemoved = jest.fn();

    await render(<SampleDataBanner visible onRemoved={onRemoved} />);
    await fireEvent.press(screen.getByTestId('sample-data-remove'));
    await confirmAlert();

    await waitFor(() => expect(garageService.removeSampleData).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onRemoved).toHaveBeenCalledTimes(1));
  });

  it('does not claim success when the request fails', async () => {
    jest.mocked(garageService.removeSampleData).mockRejectedValue(new Error('offline'));
    const onRemoved = jest.fn();

    await render(<SampleDataBanner visible onRemoved={onRemoved} />);
    await fireEvent.press(screen.getByTestId('sample-data-remove'));
    await confirmAlert();

    await waitFor(() => expect(garageService.removeSampleData).toHaveBeenCalled());
    // The banner must stay put and the caller must not refetch — otherwise the
    // rows are still there and the owner has been told they are gone.
    expect(onRemoved).not.toHaveBeenCalled();
    expect(screen.getByTestId('sample-data-banner')).toBeTruthy();
  });
});
