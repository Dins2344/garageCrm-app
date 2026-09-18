import React from 'react';
import { Alert } from 'react-native';
import { act, render, screen, waitFor, userEvent } from '@testing-library/react-native';
import ExpensesScreen from './ExpensesScreen';
import * as expenseService from '../api/expenseService';
import { currentMonthKey, shiftMonth } from '../utils/months';
import type { Expense } from '../types/models';
import type { RootStackScreenProps } from '../types/navigation';

// Explicit factory — importing the real module pulls in apiInterceptor and
// axios, which jest-expo cannot load.
jest.mock('../api/expenseService', () => ({
  getExpenses: jest.fn(),
  createExpense: jest.fn(),
  updateExpense: jest.fn(),
  deleteExpense: jest.fn(),
}));

// BottomSheet mounts its own <Toast /> inside the modal, so the mock must be
// a component that also carries `show`.
jest.mock('react-native-toast-message', () => {
  const ToastMock = () => null;
  ToastMock.show = jest.fn();
  return { __esModule: true, default: ToastMock };
});

jest.mock('../context/GarageContext', () => ({
  useGarage: () => ({
    garages: [], activeGarageId: 'g1', garagesLoading: false,
    locale: jest.requireActual('../utils/locale').DEFAULT_LOCALE,
    activeGarage: null, refreshGarage: jest.fn(),
    switchGarage: jest.fn(), addBranch: jest.fn(), removeBranch: jest.fn(),
  }),
}));

const expense = (over: Partial<Expense> = {}): Expense => ({
  _id: 'e1', title: 'Engine oil stock', category: 'parts', amount: 12500, expenseDate: '2026-09-03T06:30:00.000Z',
  paymentMethod: 'upi', notes: '', garage: 'g1', ...over,
});

const listResponse = (data: Expense[]) => ({
  success: true, count: data.length, total: data.length, pages: 1, currentPage: 1, data,
  totalAmount: data.reduce((s, e) => s + e.amount, 0),
});

const props = {} as RootStackScreenProps<'Expenses'>;
const lastCall = () => jest.mocked(expenseService.getExpenses).mock.calls.at(-1)![0]!;
const alertSpy = jest.spyOn(Alert, 'alert');

describe('ExpensesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy.mockImplementation(() => {});
    jest.mocked(expenseService.getExpenses).mockResolvedValue(listResponse([
      expense(), expense({ _id: 'e2', title: 'Rent', category: 'rent', amount: 20000, paymentMethod: 'bank_transfer' }),
    ]));
    jest.mocked(expenseService.createExpense).mockResolvedValue({ success: true, data: expense({ _id: 'e3' }) });
    jest.mocked(expenseService.updateExpense).mockResolvedValue({ success: true, data: expense() });
    jest.mocked(expenseService.deleteExpense).mockResolvedValue({ success: true, message: 'Expense deleted' });
  });

  it("lists the current month with the API's total, not a sum of the page", async () => {
    await render(<ExpensesScreen {...props} />);

    await waitFor(() => expect(screen.getByText('Engine oil stock')).toBeTruthy());
    expect(lastCall()).toMatchObject({ month: currentMonthKey(), page: 1 });
    expect(screen.getByTestId('expense-e2')).toBeTruthy();
    expect(screen.getByText(/32,500\.00/)).toBeTruthy();
  });

  it('steps back a month, never past the current one going forward', async () => {
    const user = userEvent.setup();
    await render(<ExpensesScreen {...props} />);
    await waitFor(() => expect(screen.getByText('Engine oil stock')).toBeTruthy());

    await user.press(screen.getByTestId('month-prev'));
    await waitFor(() => expect(lastCall().month).toBe(shiftMonth(currentMonthKey(), -1)));

    await user.press(screen.getByTestId('month-next'));
    await waitFor(() => expect(lastCall().month).toBe(currentMonthKey()));
    expect(screen.getByTestId('month-next').props.accessibilityState?.disabled).toBe(true);
  });

  it('records an expense from the sheet with the amount coerced and today as the date', async () => {
    const user = userEvent.setup();
    await render(<ExpensesScreen {...props} />);
    await waitFor(() => expect(screen.getByText('Engine oil stock')).toBeTruthy());

    await user.press(screen.getByTestId('add-expense-fab'));
    await user.type(screen.getByTestId('expense-title'), 'Brake pads');
    await user.type(screen.getByTestId('expense-amount'), '3200.5');
    await user.press(screen.getByText('Record Expense'));

    await waitFor(() => expect(expenseService.createExpense).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Brake pads', amount: 3200.5, category: 'other', expenseDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    })));
    // The list is refetched after a save.
    await waitFor(() => expect(expenseService.getExpenses).toHaveBeenCalledTimes(2));
  });

  it('refuses an empty title without calling the API', async () => {
    const user = userEvent.setup();
    await render(<ExpensesScreen {...props} />);
    await waitFor(() => expect(screen.getByText('Engine oil stock')).toBeTruthy());

    await user.press(screen.getByTestId('add-expense-fab'));
    await user.press(screen.getByText('Record Expense'));

    await waitFor(() => expect(screen.getByText('Title is required')).toBeTruthy());
    expect(expenseService.createExpense).not.toHaveBeenCalled();
  });

  it('opens an expense for editing with its values and saves the change', async () => {
    const user = userEvent.setup();
    await render(<ExpensesScreen {...props} />);
    await waitFor(() => expect(screen.getByTestId('expense-e2')).toBeTruthy());

    await user.press(screen.getByTestId('expense-e2'));
    expect(screen.getByTestId('expense-title').props.value).toBe('Rent');
    expect(screen.getByTestId('expense-amount').props.value).toBe('20000');

    await user.clear(screen.getByTestId('expense-amount'));
    await user.type(screen.getByTestId('expense-amount'), '21000');
    await user.press(screen.getByText('Save Changes'));

    await waitFor(() => expect(expenseService.updateExpense).toHaveBeenCalledWith('e2', expect.objectContaining({ amount: 21000, title: 'Rent' })));
  });

  it('deletes only after the alert is confirmed', async () => {
    const user = userEvent.setup();
    await render(<ExpensesScreen {...props} />);
    await waitFor(() => expect(screen.getByTestId('delete-e2')).toBeTruthy());

    await user.press(screen.getByTestId('delete-e2'));
    expect(alertSpy).toHaveBeenCalledWith('Delete expense?', expect.stringMatching(/Rent/), expect.any(Array));
    expect(expenseService.deleteExpense).not.toHaveBeenCalled();

    const buttons = alertSpy.mock.calls.at(-1)![2] as { text: string; onPress?: () => void }[];
    await act(async () => { buttons.find(b => b.text === 'Delete')!.onPress!(); });

    await waitFor(() => expect(expenseService.deleteExpense).toHaveBeenCalledWith('e2'));
  });
});
