import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import MonthlyBusinessCard from './MonthlyBusinessCard';
import * as dashboardService from '../api/dashboardService';
import { currentMonthKey, shiftMonth, monthLabel } from '../utils/months';
import type { MonthlyMetrics } from '../types/models';

jest.mock('../api/dashboardService', () => ({
  getMonthlyMetrics: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../context/GarageContext', () => ({
  useGarage: () => ({
    activeGarageId: 'g1',
    locale: jest.requireActual('../utils/locale').DEFAULT_LOCALE,
  }),
}));

const metrics = (over: Partial<MonthlyMetrics> = {}): MonthlyMetrics => ({
  month: currentMonthKey(), revenue: 50000, services: 12, expenses: 32500, netProfit: 17500,
  previous: { month: shiftMonth(currentMonthKey(), -1), revenue: 40000, services: 10, expenses: 30000, netProfit: 10000 },
  expensesByCategory: [
    { category: 'rent', total: 20000, count: 1 },
    { category: 'parts', total: 12500, count: 3 },
  ],
  ...over,
});

describe('MonthlyBusinessCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(dashboardService.getMonthlyMetrics).mockResolvedValue({ success: true, data: metrics() });
  });

  it('shows the four figures against last month and the category split', async () => {
    await render(<MonthlyBusinessCard />);

    await waitFor(() => expect(screen.getByText('Total revenue')).toBeTruthy());
    expect(dashboardService.getMonthlyMetrics).toHaveBeenCalledWith(currentMonthKey());
    expect(screen.getByText(/50,000\.00/)).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText(/32,500\.00/)).toBeTruthy();
    expect(screen.getByText('Net profit')).toBeTruthy();
    expect(screen.getByText(/17,500\.00/)).toBeTruthy();
    expect(screen.getByText('+25% vs last month')).toBeTruthy();
    expect(screen.getByText('+8% vs last month')).toBeTruthy();
    expect(screen.getByText('Where the money went')).toBeTruthy();
    expect(screen.getByText('Rent')).toBeTruthy();
  });

  it('calls a losing month a loss, steps months, and links to Expenses', async () => {
    jest.mocked(dashboardService.getMonthlyMetrics).mockResolvedValue({
      success: true,
      data: metrics({ revenue: 1000, expenses: 4000, netProfit: -3000, expensesByCategory: [], previous: { month: 'x', revenue: 0, services: 0, expenses: 0, netProfit: 0 } }),
    });
    const user = userEvent.setup();
    await render(<MonthlyBusinessCard />);

    await waitFor(() => expect(screen.getByText('Net loss')).toBeTruthy());
    expect(screen.getByText(/3,000\.00/)).toBeTruthy();
    expect(screen.getAllByText('No figure last month')).toHaveLength(4);
    expect(screen.queryByText('Where the money went')).toBeNull();

    await user.press(screen.getByTestId('month-prev'));
    await waitFor(() => expect(dashboardService.getMonthlyMetrics).toHaveBeenLastCalledWith(shiftMonth(currentMonthKey(), -1)));

    await user.press(screen.getByTestId('manage-expenses'));
    expect(mockNavigate).toHaveBeenCalledWith('Expenses');
  });

  it('turns several quick taps on the arrow into one request for the month they end on', async () => {
    const user = userEvent.setup();
    await render(<MonthlyBusinessCard />);
    await waitFor(() => expect(screen.getByText('Total revenue')).toBeTruthy());
    expect(dashboardService.getMonthlyMetrics).toHaveBeenCalledTimes(1);

    // Three taps well inside the 350 ms debounce window.
    await user.press(screen.getByTestId('month-prev'));
    await user.press(screen.getByTestId('month-prev'));
    await user.press(screen.getByTestId('month-prev'));
    // The label follows every tap; the request waits for the taps to stop.
    expect(screen.getByTestId('month-label').props.children).toBe(monthLabel(shiftMonth(currentMonthKey(), -3), 'en-IN'));
    expect(dashboardService.getMonthlyMetrics).toHaveBeenCalledTimes(1);

    await waitFor(() => expect(dashboardService.getMonthlyMetrics).toHaveBeenCalledTimes(2));
    expect(dashboardService.getMonthlyMetrics).toHaveBeenLastCalledWith(shiftMonth(currentMonthKey(), -3));
    // And nothing more arrives later for the months skipped over.
    await new Promise(r => setTimeout(r, 450));
    expect(dashboardService.getMonthlyMetrics).toHaveBeenCalledTimes(2);
  });
});
