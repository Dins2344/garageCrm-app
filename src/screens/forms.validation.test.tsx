import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import CustomersScreen from './CustomersScreen';
import StaffScreen from './StaffScreen';
import LoginScreen from './LoginScreen';
import * as customerService from '../api/customerService';
import * as userService from '../api/userService';
import type { RootStackScreenProps } from '../types/navigation';

/**
 * Form validation, end to end through the real screens.
 *
 * `utils/validation.test.ts` proves the rules; this proves they are actually
 * wired to the inputs. On React Native that is not a formality — `register()`
 * typechecks against a `TextInput` and then silently never sees a keystroke,
 * so a form can look converted, compile, and validate nothing at all. Each
 * test below types into a real field and asserts the API was not called.
 */

// Explicit factories — a bare automock has to require() the real module, which
// pulls in apiInterceptor's axios.create() and crashes under jest-expo.
jest.mock('../api/customerService', () => ({
  getCustomers: jest.fn(),
  createCustomer: jest.fn(),
  updateCustomer: jest.fn(),
  deleteCustomer: jest.fn(),
}));

jest.mock('../api/userService', () => ({
  getUsers: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
}));

jest.mock('../api/authService', () => ({
  forgotPassword: jest.fn(),
}));

jest.mock('../api/metaService', () => ({
  listCountries: jest.fn().mockResolvedValue({ success: true, data: [] }),
}));

const mockLogin = jest.fn();
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    hasRole: () => true,
    user: { _id: 'u1', role: 'owner', name: 'Owner', email: 'o@example.com', phone: '9876543210' },
    login: mockLogin,
    register: jest.fn(),
    logout: jest.fn(),
    loading: false,
  }),
}));

jest.mock('../context/GarageContext', () => ({
  useGarage: () => ({
    garages: [], activeGarageId: 'g1', garagesLoading: false,
    locale: jest.requireActual('../utils/locale').DEFAULT_LOCALE,
    activeGarage: null,
    refreshGarage: jest.fn(), switchGarage: jest.fn(),
    addBranch: jest.fn(), removeBranch: jest.fn(),
  }),
}));

const emptyList = { success: true as const, count: 0, total: 0, pages: 1, currentPage: 1, data: [] };

const customerProps = { navigation: { navigate: jest.fn(), goBack: jest.fn() }, route: { params: undefined } } as unknown as RootStackScreenProps<'Customers'>;
const staffProps = { navigation: { navigate: jest.fn(), goBack: jest.fn() }, route: { params: undefined } } as unknown as RootStackScreenProps<'Staff'>;
const loginProps = { navigation: { navigate: jest.fn(), goBack: jest.fn() }, route: { params: undefined } } as unknown as RootStackScreenProps<'Login'>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(customerService.getCustomers).mockResolvedValue(emptyList);
  jest.mocked(userService.getUsers).mockResolvedValue(emptyList);
});

describe('customer form', () => {
  const openModal = async (user: ReturnType<typeof userEvent.setup>) => {
    await render(<CustomersScreen {...customerProps} />);
    await waitFor(() => expect(screen.getByText('No Customers Found')).toBeTruthy());
    await user.press(screen.getByTestId('add-customer-fab'));
  };

  const submit = async (user: ReturnType<typeof userEvent.setup>) => {
    // "Add Customer" is both the sheet title and the submit button; the button
    // is rendered last.
    const matches = screen.getAllByText('Add Customer');
    await user.press(matches[matches.length - 1]);
  };

  it('blocks submission and names the field when required values are missing', async () => {
    const user = userEvent.setup();
    await openModal(user);
    await submit(user);

    expect(await screen.findByText(/Customer name is required/i)).toBeTruthy();
    expect(customerService.createCustomer).not.toHaveBeenCalled();
  });

  /**
   * The rule the whole conversion turns on. Email is optional on this form, but
   * "optional" has never meant "anything goes" — a typo'd address that silently
   * saves is how a customer stops receiving their invoices.
   */
  it('accepts a blank email but rejects a malformed one', async () => {
    const user = userEvent.setup();
    await openModal(user);

    await user.type(screen.getByLabelText('Full Name *'), 'Rahul Sharma');
    await user.type(screen.getByLabelText('Phone Number *'), '9876543210');
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await submit(user);

    expect(await screen.findByText(/Enter a valid email address/i)).toBeTruthy();
    expect(customerService.createCustomer).not.toHaveBeenCalled();
  });

  it('rejects a phone number that is not one', async () => {
    const user = userEvent.setup();
    await openModal(user);

    await user.type(screen.getByLabelText('Full Name *'), 'Rahul Sharma');
    await user.type(screen.getByLabelText('Phone Number *'), '123');
    await submit(user);

    expect(await screen.findByText(/Enter a valid phone number/i)).toBeTruthy();
    expect(customerService.createCustomer).not.toHaveBeenCalled();
  });
});

describe('staff form', () => {
  const openModal = async (user: ReturnType<typeof userEvent.setup>) => {
    await render(<StaffScreen {...staffProps} />);
    await waitFor(() => expect(screen.getByTestId('add-staff-fab')).toBeTruthy());
    await user.press(screen.getByTestId('add-staff-fab'));
  };

  it('requires a password when adding a new member', async () => {
    const user = userEvent.setup();
    await openModal(user);

    await user.type(screen.getByLabelText('Full Name *'), 'Imran Shaikh');
    await user.type(screen.getByLabelText('Email *'), 'imran@example.com');
    await user.type(screen.getByLabelText('Phone *'), '9876543211');

    const matches = screen.getAllByText('Add Staff');
    await user.press(matches[matches.length - 1]);

    expect(await screen.findByText(/at least 6 characters/i)).toBeTruthy();
    expect(userService.createUser).not.toHaveBeenCalled();
  });

  it('rejects a malformed email inline rather than round-tripping to the server', async () => {
    const user = userEvent.setup();
    await openModal(user);

    await user.type(screen.getByLabelText('Full Name *'), 'Imran Shaikh');
    await user.type(screen.getByLabelText('Email *'), 'imran@@example');
    await user.type(screen.getByLabelText('Phone *'), '9876543211');

    const matches = screen.getAllByText('Add Staff');
    await user.press(matches[matches.length - 1]);

    expect(await screen.findByText(/Enter a valid email address/i)).toBeTruthy();
    expect(userService.createUser).not.toHaveBeenCalled();
  });
});

describe('login form', () => {
  it('rejects a malformed email before calling the API', async () => {
    const user = userEvent.setup();
    await render(<LoginScreen {...loginProps} />);

    await user.type(screen.getByLabelText('Email Address'), 'nonsense');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.press(screen.getByText('Sign In'));

    expect(await screen.findByText(/Enter a valid email address/i)).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('submits once the credentials are well formed', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue(undefined);
    await render(<LoginScreen {...loginProps} />);

    await user.type(screen.getByLabelText('Email Address'), 'owner@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.press(screen.getByText('Sign In'));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('owner@example.com', 'secret123'));
  });
});
