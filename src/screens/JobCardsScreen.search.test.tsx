import React from 'react';
import { act, render, screen, waitFor, userEvent } from '@testing-library/react-native';
import JobCardsScreen from './JobCardsScreen';
import * as jobCardService from '../api/jobCardService';
import type { JobCard } from '../types/models';
import type { MainTabScreenProps } from '../types/navigation';

/**
 * Typing in the search box must not fire a request per keystroke: the term
 * is debounced (400 ms) and one request goes out with the final text.
 */

jest.mock('../api/jobCardService', () => ({ getJobCards: jest.fn() }));

jest.mock('@react-navigation/native', () => ({
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
  _id: 'j1', jobCardNumber: 'JC-260918-0001', status: 'new',
  vehicle: { _id: 'v1', licensePlate: 'KL 07 BQ 4521', make: 'Maruti Suzuki', model: 'Swift' },
  customer: { _id: 'c1', name: 'Anitha Krishnan', phone: '9846123456' },
  estimation: { grandTotal: 1000 }, createdAt: '2026-09-18T08:30:00.000Z',
} as unknown as JobCard;

const props = {
  navigation: { navigate: jest.fn(), setOptions: jest.fn() },
  route: { key: 'JobCards', name: 'JobCards', params: undefined },
} as unknown as MainTabScreenProps<'JobCards'>;

const calls = () => jest.mocked(jobCardService.getJobCards).mock.calls;

describe('JobCardsScreen — debounced search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.mocked(jobCardService.getJobCards).mockResolvedValue({
      success: true, data: [jobCard], total: 1, pages: 1, currentPage: 1, count: 1,
    });
  });
  afterEach(() => { jest.useRealTimers(); });

  it('sends one request with the whole term after typing stops, not one per keystroke', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(<JobCardsScreen {...props} />);
    await waitFor(() => expect(screen.getByText(/JC-260918-0001/)).toBeTruthy());
    const before = calls().length;

    await user.type(screen.getByPlaceholderText(/Search job no/), 'swift');
    // Nothing yet: the debounce window is still open.
    expect(calls().length).toBe(before);

    await act(async () => { jest.advanceTimersByTime(450); });

    await waitFor(() => expect(calls().length).toBe(before + 1));
    expect(calls().at(-1)![0]).toMatchObject({ search: 'swift', page: 1 });
  });
});
