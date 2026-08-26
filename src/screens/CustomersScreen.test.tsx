import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import CustomersScreen from './CustomersScreen';
import * as customerService from '../api/customerService';
import type { Customer } from '../types/models';
import type { RootStackScreenProps } from '../types/navigation';

// Explicit factory — see AuthContext.test.tsx for why automock isn't used here.
jest.mock('../api/customerService', () => ({
  getCustomers: jest.fn(),
  getCustomer: jest.fn(),
  createCustomer: jest.fn(),
  updateCustomer: jest.fn(),
  deleteCustomer: jest.fn(),
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ hasRole: () => true, user: { _id: 'u1', role: 'owner' }, loading: false }),
}));

jest.mock('../context/GarageContext', () => ({
  // `locale` is never undefined in the real provider — it falls back to
  // DEFAULT_LOCALE — so the mock must honour that or the screen's money
  // formatting blows up on a state the app can't actually reach.
  useGarage: () => ({
    garages: [], activeGarageId: 'g1', garagesLoading: false,
    locale: jest.requireActual('../utils/locale').DEFAULT_LOCALE,
    activeGarage: null, refreshGarage: jest.fn(),
    switchGarage: jest.fn(), addBranch: jest.fn(), removeBranch: jest.fn(),
  }),
}));

const sampleCustomer: Customer = {
  _id: 'c1',
  name: 'Rahul Sharma',
  phone: '9876543210',
  email: 'rahul@example.com',
  totalVisits: 3,
  totalSpent: 4500,
  vehicles: [],
};

const props = {} as RootStackScreenProps<'Customers'>;

describe('CustomersScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches and renders the customer list', async () => {
    jest.mocked(customerService.getCustomers).mockResolvedValue({
      success: true, count: 1, total: 1, pages: 1, currentPage: 1, data: [sampleCustomer],
    });

    await render(<CustomersScreen {...props} />);

    await waitFor(() => expect(screen.getByText('Rahul Sharma')).toBeTruthy());
    expect(screen.getByText(/9876543210/)).toBeTruthy();
    expect(customerService.getCustomers).toHaveBeenCalled();
  });

  it('shows an empty state when there are no customers', async () => {
    jest.mocked(customerService.getCustomers).mockResolvedValue({
      success: true, count: 0, total: 0, pages: 1, currentPage: 1, data: [],
    });

    await render(<CustomersScreen {...props} />);

    await waitFor(() => expect(screen.getByText('No Customers Found')).toBeTruthy());
  });

  it('creates a new customer via the Add Customer modal', async () => {
    jest.mocked(customerService.getCustomers)
      .mockResolvedValueOnce({ success: true, count: 0, total: 0, pages: 1, currentPage: 1, data: [] })
      .mockResolvedValueOnce({ success: true, count: 1, total: 1, pages: 1, currentPage: 1, data: [sampleCustomer] });
    jest.mocked(customerService.createCustomer).mockResolvedValue({ success: true, data: sampleCustomer });

    const user = userEvent.setup();
    await render(<CustomersScreen {...props} />);

    await waitFor(() => expect(screen.getByText('No Customers Found')).toBeTruthy());

    await user.press(screen.getByTestId('add-customer-fab'));

    // Select by accessibility label, not placeholder: the phone placeholder is
    // the garage country's example number, so a placeholder query passes for an
    // Indian tenant and fails for every other one.
    await user.type(screen.getByLabelText('Full Name *'), 'Rahul Sharma');
    await user.type(screen.getByLabelText('Phone Number *'), '9876543210');

    // Two "Add Customer" texts exist once the modal is open (the sheet title
    // and the submit button) — the submit button is rendered last.
    const addCustomerTexts = screen.getAllByText('Add Customer');
    await user.press(addCustomerTexts[addCustomerTexts.length - 1]);

    await waitFor(() => expect(customerService.createCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Rahul Sharma', phone: '9876543210' })
    ));
    await waitFor(() => expect(customerService.getCustomers).toHaveBeenCalledTimes(2));
  });
});
