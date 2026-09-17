import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import JobCardsScreen from './JobCardsScreen';
import * as jobCardService from '../api/jobCardService';
import type { JobCard } from '../types/models';
import type { MainTabScreenProps } from '../types/navigation';

/**
 * The status chips under the search box are a multi-select: each toggles on
 * its own, "All" clears them, and every change refetches page 1 with the
 * picked statuses comma-joined (the API matches any of them).
 */

// Explicit factory — a bare automock would require() the real module and pull
// in apiInterceptor's axios.create(), which crashes under jest-expo.
jest.mock('../api/jobCardService', () => ({
  getJobCards: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  // Re-run whenever the screen hands over a new callback, as a focused screen
  // whose deps changed would.
  useFocusEffect: (cb: () => void) => {
    const react = require('react');
    react.useEffect(cb, [cb]);
  },
}));

jest.mock('../context/GarageContext', () => ({
  useGarage: () => ({
    garages: [], activeGarageId: 'g1', garagesLoading: false,
    locale: jest.requireActual('../utils/locale').DEFAULT_LOCALE,
    activeGarage: null, refreshGarage: jest.fn(),
    switchGarage: jest.fn(), addBranch: jest.fn(), removeBranch: jest.fn(),
  }),
}));

const jobCard = {
  _id: 'j1',
  jobCardNumber: 'JC-260917-0001',
  status: 'new',
  vehicle: { _id: 'v1', licensePlate: 'KA 05 MJ 4412', make: 'Maruti Suzuki', model: 'Swift' },
  customer: { _id: 'c1', name: 'Anita Desai', phone: '9876500001' },
  estimation: { grandTotal: 1000 },
  createdAt: '2026-09-17T08:30:00.000Z',
} as unknown as JobCard;

const props = {
  navigation: { navigate: jest.fn(), setOptions: jest.fn() },
  route: { key: 'JobCards', name: 'JobCards', params: undefined },
} as unknown as MainTabScreenProps<'JobCards'>;

const lastCall = () => jest.mocked(jobCardService.getJobCards).mock.calls.at(-1)![0];
const isOn = (testID: string) => screen.getByTestId(testID).props.accessibilityState?.selected === true;

describe('JobCardsScreen — status filter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(jobCardService.getJobCards).mockResolvedValue({
      success: true, data: [jobCard], total: 1, pages: 1, currentPage: 1, count: 1,
    });
  });

  it('starts on All and sends no status', async () => {
    await render(<JobCardsScreen {...props} />);
    await waitFor(() => expect(screen.getByText(/JC-260917-0001/)).toBeTruthy());

    expect(lastCall()).toMatchObject({ page: 1 });
    expect(lastCall()!.status).toBeUndefined();
    expect(isOn('status-chip-all')).toBe(true);
    expect(isOn('status-chip-new')).toBe(false);
  });

  it('lets several chips be on at once and sends them comma-joined from page 1', async () => {
    const user = userEvent.setup();
    await render(<JobCardsScreen {...props} />);
    await waitFor(() => expect(screen.getByText(/JC-260917-0001/)).toBeTruthy());

    await user.press(screen.getByTestId('status-chip-new'));
    await waitFor(() => expect(lastCall()!.status).toBe('new'));
    expect(isOn('status-chip-all')).toBe(false);

    await user.press(screen.getByTestId('status-chip-in_progress'));
    await waitFor(() => expect(lastCall()!.status).toBe('new,in_progress'));
    expect(lastCall()!.page).toBe(1);
    expect(isOn('status-chip-new')).toBe(true);
    expect(isOn('status-chip-in_progress')).toBe(true);
  });

  it('toggles a chip off again and All clears the rest', async () => {
    const user = userEvent.setup();
    await render(<JobCardsScreen {...props} />);
    await waitFor(() => expect(screen.getByText(/JC-260917-0001/)).toBeTruthy());

    await user.press(screen.getByTestId('status-chip-new'));
    await user.press(screen.getByTestId('status-chip-delivered'));
    await waitFor(() => expect(lastCall()!.status).toBe('new,delivered'));

    await user.press(screen.getByTestId('status-chip-new'));
    await waitFor(() => expect(lastCall()!.status).toBe('delivered'));

    await user.press(screen.getByTestId('status-chip-all'));
    await waitFor(() => expect(lastCall()!.status).toBeUndefined());
    expect(isOn('status-chip-all')).toBe(true);
    expect(isOn('status-chip-delivered')).toBe(false);
  });

  it('blames the filter, not the garage, when a filtered page is empty', async () => {
    const user = userEvent.setup();
    await render(<JobCardsScreen {...props} />);
    await waitFor(() => expect(screen.getByText(/JC-260917-0001/)).toBeTruthy());

    jest.mocked(jobCardService.getJobCards).mockResolvedValue({
      success: true, data: [], total: 0, pages: 0, currentPage: 1, count: 0,
    });
    await user.press(screen.getByTestId('status-chip-cancelled'));

    await waitFor(() => expect(screen.getByText('Try a different status filter')).toBeTruthy());
  });
});
