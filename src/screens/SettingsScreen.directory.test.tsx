import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import SettingsScreen from './SettingsScreen';
import * as garageService from '../api/garageService';
import * as metaService from '../api/metaService';
import { __setCountryCache } from '../hooks/useCountries';
import type { Garage, User } from '../types/models';
import type { RootStackScreenProps } from '../types/navigation';

/**
 * Settings is a directory: it holds tiles that lead to features, not the
 * features themselves. These tests pin that for the Contact Verification tile
 * and check the garage card shows a skeleton, not a spinner, while loading.
 */

jest.mock('../api/garageService', () => ({
  getGarage: jest.fn(),
  updateGarage: jest.fn(),
  getBranchStaff: jest.fn(),
}));

jest.mock('../api/metaService', () => ({
  listCountries: jest.fn(),
  getPlans: jest.fn(),
}));

jest.mock('../api/userService', () => ({
  getUsers: jest.fn().mockResolvedValue({ success: true, count: 0, data: [] }),
}));

const mockAuth: { user: Partial<User> } = { user: {} };
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    hasRole: (...roles: string[]) => roles.includes(mockAuth.user.role as string),
    user: mockAuth.user,
    logout: jest.fn(),
    loading: false,
    refreshUser: jest.fn(),
  }),
}));

jest.mock('../context/GarageContext', () => ({
  useGarage: () => ({
    garages: [], activeGarageId: 'g1', garagesLoading: false,
    locale: jest.requireActual('../utils/locale').DEFAULT_LOCALE,
    activeGarage: null,
    refreshGarage: jest.fn().mockResolvedValue(undefined),
    switchGarage: jest.fn(), addBranch: jest.fn(), removeBranch: jest.fn(),
  }),
}));

const garage: Garage = {
  _id: 'g1', name: 'Speed Auto Works', phone: '9876543210', country: 'IN',
  settings: { currency: '', taxRate: 18, laborRatePerHour: 500, serviceReminderDays: 180 },
  address: {},
};

const owner = (over: Partial<User> = {}): Partial<User> => ({
  _id: 'u1', role: 'owner', name: 'Owner', email: 'o@example.com', phone: '9876543210',
  emailVerifiedAt: null, phoneVerifiedAt: null, ...over,
});

const mockNavigate = jest.fn();
const props = { navigation: { navigate: mockNavigate } } as unknown as RootStackScreenProps<'Settings'>;

beforeEach(() => {
  jest.clearAllMocks();
  __setCountryCache(null);
  jest.mocked(metaService.listCountries).mockResolvedValue({ success: true, data: [] });
  jest.mocked(garageService.getGarage).mockResolvedValue({ success: true, data: garage });
  jest.mocked(garageService.getBranchStaff).mockResolvedValue({ success: true, data: [] });
});

describe('SettingsScreen — Contact Verification tile', () => {
  it('shows the tile to an owner and navigates to the feature screen', async () => {
    mockAuth.user = owner();
    const user = userEvent.setup();
    await render(<SettingsScreen {...props} />);

    const tile = await screen.findByTestId('verification-tile');
    expect(screen.getByText('Contact Verification')).toBeTruthy();
    expect(screen.getByText('Verify your email and phone number')).toBeTruthy();
    // The feature itself is not on this page.
    expect(screen.queryByTestId('verify-email')).toBeNull();
    expect(screen.queryByText('Not verified')).toBeNull();

    await user.press(tile);
    expect(mockNavigate).toHaveBeenCalledWith('ContactVerification');
  });

  it('summarises the state on the tile once both channels are verified', async () => {
    mockAuth.user = owner({ emailVerifiedAt: '2026-09-01T00:00:00Z', phoneVerifiedAt: '2026-09-02T00:00:00Z' });
    await render(<SettingsScreen {...props} />);

    await screen.findByTestId('verification-tile');
    expect(screen.getByText('Email and phone verified')).toBeTruthy();
  });

  it('is not shown to staff', async () => {
    mockAuth.user = owner({ role: 'mechanic' });
    await render(<SettingsScreen {...props} />);

    await waitFor(() => expect(screen.getAllByText('Speed Auto Works').length).toBeGreaterThan(0));
    expect(screen.queryByTestId('verification-tile')).toBeNull();
  });
});

describe('SettingsScreen — Plans tile', () => {
  it('shows a tile to owners and admins that navigates to the Plans screen, and fetches no catalog itself', async () => {
    mockAuth.user = owner({ role: 'admin' });
    const user = userEvent.setup();
    await render(<SettingsScreen {...props} />);

    const tile = await screen.findByTestId('plans-tile');
    expect(screen.getByText('Free plan - paid plans coming soon')).toBeTruthy();
    // The catalog lives on PlansScreen; Settings only points at it.
    expect(screen.queryByTestId('plan-plus')).toBeNull();
    expect(metaService.getPlans).not.toHaveBeenCalled();

    await user.press(tile);
    expect(mockNavigate).toHaveBeenCalledWith('Plans');
  });

  it('is not shown to staff', async () => {
    mockAuth.user = owner({ role: 'service_advisor' });
    await render(<SettingsScreen {...props} />);

    await waitFor(() => expect(screen.getAllByText('Speed Auto Works').length).toBeGreaterThan(0));
    expect(screen.queryByTestId('plans-tile')).toBeNull();
  });
});

describe('SettingsScreen — garage information loading', () => {
  it('shows skeleton rows until the garage arrives, then the real rows', async () => {
    mockAuth.user = owner();
    let resolveGarage: (value: { success: boolean; data: Garage }) => void = () => {};
    jest.mocked(garageService.getGarage).mockReturnValue(new Promise(resolve => { resolveGarage = resolve; }));

    await render(<SettingsScreen {...props} />);

    expect(screen.getByTestId('garage-info-skeleton')).toBeTruthy();
    expect(screen.queryByText('Garage Name')).toBeNull();

    resolveGarage({ success: true, data: garage });

    await waitFor(() => expect(screen.queryByTestId('garage-info-skeleton')).toBeNull());
    expect(screen.getByText('Garage Name')).toBeTruthy();
    expect(screen.getAllByText('Speed Auto Works').length).toBeGreaterThan(0);
  });
});
