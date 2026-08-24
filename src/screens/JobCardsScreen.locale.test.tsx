import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import JobCardsScreen from './JobCardsScreen';
import * as jobCardService from '../api/jobCardService';
import type { JobCard } from '../types/models';
import type { ResolvedLocale } from '../types/models';
import type { MainTabScreenProps } from '../types/navigation';

/**
 * Regression test for a stale-locale bug.
 *
 * `renderItem` is wrapped in `useCallback` so FlatList does not get a new
 * identity on every keystroke in the search box. Its dependency array listed
 * only `[navigation]`, while the row body formats money with `locale` from
 * `useGarage()`. An owner switching from an Indian branch to a UK one kept
 * seeing rupees in this list until the screen remounted — in the one feature
 * the whole multi-country design exists for.
 *
 * ESLint's `react-hooks/exhaustive-deps` flagged it as a warning. It was a bug.
 */

// Explicit factory — a bare automock would require() the real module and pull
// in apiInterceptor's axios.create(), which crashes under jest-expo.
jest.mock('../api/jobCardService', () => ({
  getJobCards: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  // Run the callback once on mount, like a focused screen would.
  useFocusEffect: (cb: () => void) => {
    const react = require('react');
    react.useEffect(cb, []);
  },
}));

const IN_LOCALE: ResolvedLocale = {
  country: 'IN', currency: 'INR', locale: 'en-IN', taxLabel: 'GST', taxIdLabel: 'GSTIN',
  postalLabel: 'Pincode', postalInputMode: 'numeric', phoneExample: '98765 43210',
  timezone: 'Asia/Kolkata',
};

const GB_LOCALE: ResolvedLocale = {
  country: 'GB', currency: 'GBP', locale: 'en-GB', taxLabel: 'VAT', taxIdLabel: 'VAT No.',
  postalLabel: 'Postcode', postalInputMode: 'text', phoneExample: '07911 123456',
  timezone: 'Europe/London',
};

// Mutable so a test can switch branch mid-flight. Must be `mock`-prefixed:
// jest hoists the factory above the imports.
let mockLocale: ResolvedLocale = IN_LOCALE;

jest.mock('../context/GarageContext', () => ({
  useGarage: () => ({
    garages: [], activeGarageId: 'g1', garagesLoading: false,
    locale: mockLocale,
    activeGarage: null, refreshGarage: jest.fn(),
    switchGarage: jest.fn(), addBranch: jest.fn(), removeBranch: jest.fn(),
  }),
}));

const jobCard = {
  _id: 'j1',
  jobCardNumber: 'JC-2026-1041',
  status: 'in_progress',
  vehicle: { _id: 'v1', licensePlate: 'KA 05 MJ 4412', make: 'Maruti Suzuki', model: 'Swift' },
  customer: { _id: 'c1', name: 'Anita Desai', phone: '9876500001' },
  estimation: { grandTotal: 10094.9 },
  createdAt: '2026-08-11T08:30:00.000Z',
} as unknown as JobCard;

const props = {
  navigation: { navigate: jest.fn(), setOptions: jest.fn() },
  route: { key: 'JobCards', name: 'JobCards', params: undefined },
} as unknown as MainTabScreenProps<'JobCards'>;

describe('JobCardsScreen money formatting follows the active branch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocale = IN_LOCALE;
    (jobCardService.getJobCards as jest.Mock).mockResolvedValue({
      success: true, data: [jobCard], total: 1, pages: 1, currentPage: 1, count: 1,
    });
  });

  it('formats the estimate in the active branch currency', async () => {
    await render(<JobCardsScreen {...props} />);
    await waitFor(() => expect(screen.getByText(/JC-2026-1041/)).toBeTruthy());

    expect(screen.getByText(/₹/)).toBeTruthy();
  });

  it('re-formats when the owner switches to a branch in another country', async () => {
    const view = await render(<JobCardsScreen {...props} />);
    await waitFor(() => expect(screen.getByText(/JC-2026-1041/)).toBeTruthy());
    expect(screen.getByText(/₹/)).toBeTruthy();

    // Switch branch. The row must re-render through the new locale rather than
    // the one captured when renderItem was first memoised.
    mockLocale = GB_LOCALE;
    view.rerender(<JobCardsScreen {...props} />);

    await waitFor(() => expect(screen.getByText(/£/)).toBeTruthy());
    expect(screen.queryByText(/₹/)).toBeNull();
  });
});
