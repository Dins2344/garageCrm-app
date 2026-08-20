import React from 'react';
import { render, screen, waitFor, userEvent, within } from '@testing-library/react-native';
import HomeScreen from './HomeScreen';
import * as dashboardService from '../api/dashboardService';
import type { DashboardStats } from '../api/dashboardService';
import type { MainTabScreenProps } from '../types/navigation';

// See JobCardDetailScreen.test.tsx — the screen refetches through
// useFocusEffect, which needs a NavigationContainer we deliberately don't mount.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const react = require('react');
    react.useEffect(cb, [cb]);
  },
}));

jest.mock('../api/dashboardService', () => ({
  getDashboardStats: jest.fn(),
}));

jest.mock('../components/WebAppBanner', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return () => <Text>MORE ON THE WEB</Text>;
});

const mockHasRole = jest.fn(() => true);
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    hasRole: (...roles: string[]) => mockHasRole(...(roles as [])),
    user: { _id: 'u1', name: 'Dinson C', role: 'owner' },
  }),
}));

jest.mock('../context/GarageContext', () => ({
  useGarage: () => ({
    garages: [], activeGarageId: 'g1', garagesLoading: false,
    locale: jest.requireActual('../utils/locale').DEFAULT_LOCALE,
    activeGarage: null, refreshGarage: jest.fn(),
    switchGarage: jest.fn(), addBranch: jest.fn(), removeBranch: jest.fn(),
  }),
}));

const navigate = jest.fn();
const props = { navigation: { navigate } } as unknown as MainTabScreenProps<'Home'>;

/** A quiet garage: nothing outstanding anywhere. */
const calmStats = {
  overview: {
    totalCustomers: 128, totalVehicles: 164, activeJobCards: 0, todayJobCards: 0,
    pendingEstimations: 0, inProgressJobs: 0, readyForPickup: 0,
  },
  revenue: { today: 0, month: 0 },
  unpaid: { total: 0, count: 0 },
  weeklyRevenue: [], jobStatusBreakdown: {}, lowStockItems: [],
  recentJobCards: [], recentInvoices: [], upcomingReminders: [],
  staffAchievement: [], queryTimeMs: 5,
} as unknown as DashboardStats;

/** A busy garage: something outstanding in every category. */
const busyStats = {
  ...calmStats,
  overview: {
    ...calmStats.overview,
    activeJobCards: 7, todayJobCards: 3, pendingEstimations: 2, readyForPickup: 1,
  },
  revenue: { today: 12500, month: 480000 },
  unpaid: { total: 34000, count: 4 },
  upcomingReminders: [
    { _id: 'r1', nextServiceDate: '2026-09-02T00:00:00Z', type: 'periodic_service', status: 'pending' },
    { _id: 'r2', nextServiceDate: '2026-08-25T00:00:00Z', type: 'oil_change', status: 'pending' },
  ],
} as unknown as DashboardStats;

async function renderHome(stats: DashboardStats) {
  jest.mocked(dashboardService.getDashboardStats).mockResolvedValue({ success: true, data: stats });
  await render(<HomeScreen {...props} />);
  await waitFor(() => expect(screen.getByText('Quick Actions')).toBeTruthy());
}

describe('HomeScreen — Needs Attention', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasRole.mockReturnValue(true);
  });

  it('surfaces every category of outstanding work', async () => {
    await renderHome(busyStats);
    const attention = within(screen.getByTestId('needs-attention'));
    expect(attention.getByText('2 estimations awaiting approval')).toBeTruthy();
    expect(attention.getByText('1 vehicle ready for pickup')).toBeTruthy();
    expect(attention.getByText('4 unpaid invoices')).toBeTruthy();
    expect(attention.getByText('2 services due soon')).toBeTruthy();
  });

  it('shows the outstanding amount, formatted in the garage currency', async () => {
    await renderHome(busyStats);
    expect(screen.getByText('₹34,000.00 outstanding')).toBeTruthy();
  });

  it('shows the soonest reminder date, not just a count', async () => {
    await renderHome(busyStats);
    // The earlier of the two dates, so the row says something actionable.
    expect(screen.getByText('Next on 25 Aug')).toBeTruthy();
  });

  it('falls back to an all-clear card instead of the work list', async () => {
    // There is no status hero above this any more, so leaving nothing here
    // would drop the user straight from the greeting into the shortcut grid.
    await renderHome(calmStats);
    expect(screen.queryByTestId('needs-attention')).toBeNull();
    expect(screen.getByTestId('all-clear')).toBeTruthy();
    expect(screen.getByText('Nothing needs your attention right now')).toBeTruthy();
  });

  it('mentions work in progress in the all-clear state when there is some', async () => {
    await renderHome({
      ...calmStats,
      overview: { ...calmStats.overview, activeJobCards: 3 },
    } as DashboardStats);
    expect(screen.getByText('3 jobs in progress, nothing waiting on you')).toBeTruthy();
  });

  it('replaces the old status hero rather than sitting alongside it', async () => {
    // The hero derived its headline from the same figures, so the screen
    // stated the same fact twice, one card above the other.
    await renderHome(busyStats);
    expect(screen.queryByText("Today's Status")).toBeNull();
    expect(screen.queryByText('Action Needed')).toBeNull();
    expect(screen.getByTestId('needs-attention')).toBeTruthy();
  });

  it('navigates from a row that has a destination', async () => {
    const user = userEvent.setup();
    await renderHome(busyStats);
    await user.press(screen.getByText('4 unpaid invoices'));
    expect(navigate).toHaveBeenCalledWith('Invoices');
  });

  it('singularises correctly for a single item', async () => {
    await renderHome({
      ...busyStats,
      overview: { ...busyStats.overview, pendingEstimations: 1 },
    } as DashboardStats);
    expect(screen.getByText('1 estimation awaiting approval')).toBeTruthy();
  });
});

describe('HomeScreen — layout and de-duplication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasRole.mockReturnValue(true);
  });

  it('does not repeat the pending-estimation count in the stats grid', async () => {
    // It used to appear in the status hero, the stats grid AND the overview
    // list — the same number three times on one screen.
    await renderHome(busyStats);
    expect(screen.queryByText('Pending Estimations')).toBeNull();
  });

  it('offers the full shortcut grid in one wrapping section', async () => {
    await renderHome(busyStats);
    // Scoped: "Customers" is legitimately also a label in the totals footer.
    const actions = within(screen.getByTestId('quick-actions'));
    [
      'New Job Card', 'Job Cards', 'Vehicles', 'Customers',
      'Invoices', 'Dashboard', 'Staff', 'Settings',
    ].forEach(label => expect(actions.getByText(label)).toBeTruthy());
    // One section, not the old Quick Actions + Manage split.
    expect(screen.queryByText('Manage')).toBeNull();
  });

  it('navigates from a shortcut tile', async () => {
    const user = userEvent.setup();
    await renderHome(busyStats);
    const actions = within(screen.getByTestId('quick-actions'));
    await user.press(actions.getByText('Vehicles'));
    expect(navigate).toHaveBeenCalledWith('Vehicles');
  });

  it('keeps the business totals available at the bottom', async () => {
    await renderHome(calmStats);
    expect(screen.getByText('128')).toBeTruthy();
    expect(screen.getByText('164')).toBeTruthy();
  });

  it('still renders the web banner, just further down', async () => {
    await renderHome(calmStats);
    expect(screen.getByText('MORE ON THE WEB')).toBeTruthy();
  });

  it('hides role-gated shortcuts from staff who cannot use them', async () => {
    mockHasRole.mockReturnValue(false);
    await renderHome(calmStats);
    const actions = within(screen.getByTestId('quick-actions'));
    expect(actions.queryByText('New Job Card')).toBeNull();
    expect(actions.queryByText('Staff')).toBeNull();
    expect(actions.queryByText('Customers')).toBeNull();
    // Ungated tiles stay.
    expect(actions.getByText('Invoices')).toBeTruthy();
    expect(actions.getByText('Job Cards')).toBeTruthy();
  });
});
