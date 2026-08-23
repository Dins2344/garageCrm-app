import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import SettingsScreen from './SettingsScreen';
import * as garageService from '../api/garageService';
import * as metaService from '../api/metaService';
import { __setCountryCache } from '../hooks/useCountries';
import type { Garage, CountryOption } from '../types/models';
import type { RootStackScreenProps } from '../types/navigation';

// Explicit factories — see AuthContext.test.tsx for why automock isn't used.
jest.mock('../api/garageService', () => ({
  getGarage: jest.fn(),
  updateGarage: jest.fn(),
  getBranchStaff: jest.fn(),
}));

jest.mock('../api/metaService', () => ({
  listCountries: jest.fn(),
}));

jest.mock('../api/userService', () => ({
  getUsers: jest.fn().mockResolvedValue({ success: true, count: 0, data: [] }),
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    hasRole: () => true,
    user: { _id: 'u1', role: 'owner', name: 'Owner', email: 'o@example.com', phone: '9876543210' },
    logout: jest.fn(),
    loading: false,
  }),
}));

// `mock` prefix is required: jest hoists mock factories above const
// declarations, and only names matching /^mock/i may be referenced inside one.
const mockRefreshGarage = jest.fn().mockResolvedValue(undefined);
jest.mock('../context/GarageContext', () => ({
  // `locale` is never undefined in the real provider — it falls back to
  // DEFAULT_LOCALE — so the mock must honour that or it tests a state the app
  // can't reach.
  useGarage: () => ({
    garages: [], activeGarageId: 'g1', garagesLoading: false,
    locale: jest.requireActual('../utils/locale').DEFAULT_LOCALE,
    activeGarage: null,
    refreshGarage: mockRefreshGarage,
    switchGarage: jest.fn(), addBranch: jest.fn(), removeBranch: jest.fn(),
  }),
}));

const COUNTRIES: CountryOption[] = [
  {
    code: 'IN', name: 'India', currency: 'INR', taxLabel: 'GST', taxIdLabel: 'GSTIN',
    postalLabel: 'Pincode', postalInputMode: 'numeric', phoneExample: '98765 43210',
    requiresTimezoneChoice: false,
  },
  {
    code: 'GB', name: 'United Kingdom', currency: 'GBP', taxLabel: 'VAT', taxIdLabel: 'VAT No.',
    postalLabel: 'Postcode', postalInputMode: 'text', phoneExample: '07911 123456',
    requiresTimezoneChoice: false,
  },
];

const indianGarage: Garage = {
  _id: 'g1',
  name: 'Speed Auto Works',
  phone: '9876543210',
  country: 'IN',
  settings: { currency: '', taxRate: 18, laborRatePerHour: 500, serviceReminderDays: 180 },
  address: { pincode: '682001' },
};

const props = {} as RootStackScreenProps<'Settings'>;

/** Renders Settings with the garage card already in edit mode. */
async function renderEditing(garage: Garage = indianGarage) {
  jest.mocked(garageService.getGarage).mockResolvedValue({ success: true, data: garage });
  const user = userEvent.setup();
  await render(<SettingsScreen {...props} />);
  // The garage name renders in both the header and the info card, so match
  // on "at least one" rather than requiring a unique node.
  await waitFor(() => expect(screen.getAllByText('Speed Auto Works').length).toBeGreaterThan(0));
  await user.press(screen.getAllByText('Edit')[0]);
  return user;
}

describe('SettingsScreen — country and locale-driven labels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __setCountryCache(null);
    jest.mocked(metaService.listCountries).mockResolvedValue({ success: true, data: COUNTRIES });
    jest.mocked(garageService.getBranchStaff).mockResolvedValue({ success: true, data: [] });
  });

  it('labels the tax fields with the country\'s own terms', async () => {
    await renderEditing();
    await waitFor(() => expect(screen.getByText('GSTIN')).toBeTruthy());
    expect(screen.getByText('GST Rate (%)')).toBeTruthy();
    expect(screen.getByText('Labor Rate (INR/hr)')).toBeTruthy();
    // India's postal field keeps its familiar name.
    expect(screen.getByText('Pincode')).toBeTruthy();
  });

  it('relabels everything when the garage is in the UK', async () => {
    await renderEditing({ ...indianGarage, country: 'GB' });
    await waitFor(() => expect(screen.getByText('VAT No.')).toBeTruthy());
    expect(screen.getByText('VAT Rate (%)')).toBeTruthy();
    expect(screen.getByText('Labor Rate (GBP/hr)')).toBeTruthy();
    expect(screen.getByText('Postcode')).toBeTruthy();
    expect(screen.queryByText('GSTIN')).toBeNull();
  });

  it('gives an alphanumeric-postcode country a text keyboard, not a numeric one', async () => {
    // The regression this guards: keyboardType="numeric" made "SW1A 1AA"
    // literally impossible to type on a phone.
    await renderEditing({ ...indianGarage, country: 'GB' });
    const postcode = await screen.findByPlaceholderText('Postcode');
    expect(postcode.props.keyboardType).toBe('default');
  });

  it('keeps the numeric keypad where postal codes really are digits-only', async () => {
    await renderEditing();
    const pincode = await screen.findByPlaceholderText('Pincode');
    expect(pincode.props.keyboardType).toBe('numeric');
  });

  it('sends the country and refreshes context so the rest of the app follows', async () => {
    jest.mocked(garageService.updateGarage).mockResolvedValue({
      success: true, data: { ...indianGarage, country: 'GB' },
    });

    const user = await renderEditing();
    await user.press(await screen.findByText('Save Garage Info'));

    await waitFor(() => expect(garageService.updateGarage).toHaveBeenCalled());
    expect(garageService.updateGarage).toHaveBeenCalledWith(
      expect.objectContaining({ country: 'IN' })
    );
    // A country change alters how every screen formats money and dates, so it
    // must not stay local to this screen.
    await waitFor(() => expect(mockRefreshGarage).toHaveBeenCalled());
  });
});
