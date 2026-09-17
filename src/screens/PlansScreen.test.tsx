import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react-native';
import Toast from 'react-native-toast-message';
import PlansScreen from './PlansScreen';
import * as metaService from '../api/metaService';
import type { PlanCatalog } from '../types/models';
import type { RootStackScreenProps } from '../types/navigation';

// Explicit factory — importing the real module pulls in apiInterceptor and
// axios, which jest-expo cannot load.
jest.mock('../api/metaService', () => ({
  listCountries: jest.fn(),
  getPlans: jest.fn(),
}));

jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

// The screen prices in the garage's currency; the mock picks the country.
jest.mock('../context/GarageContext', () => ({
  useGarage: () => ({
    locale: {
      country: 'AE', currency: 'AED', locale: 'en-AE', taxLabel: 'VAT', taxIdLabel: 'TRN',
      postalLabel: 'PO Box', postalInputMode: 'numeric', phoneExample: '050 123 4567', timezone: 'Asia/Dubai',
    },
  }),
}));

const catalog: PlanCatalog = {
  country: 'AE',
  currency: 'AED',
  purchasing: { enabled: false, message: 'Paid subscriptions will be enabled soon.' },
  plans: [
    {
      id: 'free', name: 'Free', tagline: 'Small garage.', features: ['2 branches'],
      limits: { maxGaragesPerOwner: 2, maxJobCardsPerGaragePerDay: 3, maxInvoicesPerGaragePerDay: 3, maxStaffPerGarage: 2 },
      price: { monthly: 0, annual: 0 },
    },
    {
      id: 'plus', name: 'Plus', tagline: 'Busy workshop.', features: ['3 branches', '10 job cards a day'],
      limits: { maxGaragesPerOwner: 3, maxJobCardsPerGaragePerDay: 10, maxInvoicesPerGaragePerDay: 10, maxStaffPerGarage: 8 },
      price: { monthly: 49, annual: 490 },
    },
    {
      id: 'pro', name: 'Pro', tagline: 'Multi-branch.', features: ['10 branches'],
      limits: { maxGaragesPerOwner: 10, maxJobCardsPerGaragePerDay: null, maxInvoicesPerGaragePerDay: null, maxStaffPerGarage: null },
      price: { monthly: 99, annual: 990 },
    },
  ],
};

const props = {} as RootStackScreenProps<'Plans'>;

describe('PlansScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(metaService.getPlans).mockResolvedValue({ success: true, data: catalog });
  });

  it('fetches the catalog for the garage country and lists the three plans priced in its currency', async () => {
    await render(<PlansScreen {...props} />);

    await screen.findByTestId('plan-plus');
    expect(metaService.getPlans).toHaveBeenCalledWith('AE');
    expect(screen.getByTestId('plan-free')).toBeTruthy();
    expect(screen.getByTestId('plan-pro')).toBeTruthy();

    const plus = within(screen.getByTestId('plan-plus'));
    expect(plus.getByText(/AED\s?49\.00/)).toBeTruthy();
    expect(plus.getByText(/AED\s?490\.00 a year/)).toBeTruthy();
    expect(plus.getByText('10 job cards a day')).toBeTruthy();
    expect(within(screen.getByTestId('plan-pro')).getByText(/AED\s?99\.00/)).toBeTruthy();
  });

  it('marks Free as the current plan and shows the coming-soon notice with the server message', async () => {
    await render(<PlansScreen {...props} />);

    await screen.findByTestId('plan-free');
    expect(within(screen.getByTestId('plan-free')).getByText('Current plan')).toBeTruthy();
    // The name and the price line both read "Free" — no "AED 0.00".
    expect(within(screen.getByTestId('plan-free')).getAllByText('Free')).toHaveLength(2);
    expect(within(screen.getByTestId('plan-free')).queryByText(/AED/)).toBeNull();
    expect(within(screen.getByTestId('coming-soon')).getByText('Paid subscriptions will be enabled soon.')).toBeTruthy();
  });

  it('offers nothing to press — no upgrade, buy or choose affordance', async () => {
    await render(<PlansScreen {...props} />);
    await screen.findByTestId('plan-plus');

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByText(/upgrade|buy|choose|subscribe/i)).toBeNull();
  });

  it('shows a skeleton while loading, and never the notice before the catalog arrives', async () => {
    let resolve!: (v: { success: true; data: PlanCatalog }) => void;
    jest.mocked(metaService.getPlans).mockReturnValue(new Promise(r => { resolve = r; }));
    await render(<PlansScreen {...props} />);

    expect(screen.getByTestId('plans-skeleton')).toBeTruthy();
    expect(screen.queryByTestId('coming-soon')).toBeNull();

    resolve({ success: true, data: catalog });
    await screen.findByTestId('coming-soon');
    expect(screen.queryByTestId('plans-skeleton')).toBeNull();
  });

  it('reports a failed catalog load', async () => {
    jest.mocked(metaService.getPlans).mockRejectedValue(new Error('down'));
    await render(<PlansScreen {...props} />);

    await waitFor(() => expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', text1: 'Could not load plans' })));
    expect(screen.getByText('Plans are not available right now.')).toBeTruthy();
  });
});
