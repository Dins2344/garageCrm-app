import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import InvoiceViewerScreen from './InvoiceViewerScreen';
import * as invoiceService from '../api/invoiceService';
import * as changeRequestService from '../api/changeRequestService';
import { GlobalLoaderProvider } from '../context/GlobalLoaderContext';
import type { Invoice } from '../types/models';
import type { RootStackScreenProps } from '../types/navigation';

jest.mock('expo-file-system/legacy', () => ({}));
jest.mock('expo-sharing', () => ({}));
jest.mock('../api/invoiceService', () => ({
  getInvoice: jest.fn(),
  updateInvoicePayment: jest.fn(),
  deleteInvoice: jest.fn(),
  getInvoicePdfUrl: jest.fn(),
}));
jest.mock('../api/changeRequestService', () => ({
  getChangeRequests: jest.fn(),
  raiseChangeRequest: jest.fn(),
}));
const mockRole = { value: 'service_advisor' };
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ hasRole: (...roles: string[]) => roles.includes(mockRole.value), user: { _id: 'u1', role: mockRole.value } }),
}));
jest.mock('../context/GarageContext', () => ({
  useGarage: () => ({ locale: jest.requireActual('../utils/locale').DEFAULT_LOCALE, activeGarage: null }),
}));

const INVOICE = {
  _id: 'inv1', invoiceNumber: 'INV-0042', paymentStatus: 'unpaid', grandTotal: 590, subtotal: 500, taxRate: 18,
  taxAmount: 90, discount: 0, parts: [], labor: [], createdAt: '2026-10-10T05:00:00Z',
  customer: { _id: 'c1', name: 'Rahul', phone: '9876543210' }, vehicle: { _id: 'v1', licensePlate: 'KL07AB1234' },
} as unknown as Invoice;
const props = { route: { params: { invoiceId: 'inv1' } }, navigation: { goBack: jest.fn() } } as unknown as RootStackScreenProps<'InvoiceViewer'>;

async function renderScreen() {
  await render(<GlobalLoaderProvider><InvoiceViewerScreen {...props} /></GlobalLoaderProvider>);
  await waitFor(() => expect(screen.getAllByText(/INV-0042/).length).toBeGreaterThan(0));
}

describe('InvoiceViewerScreen — staff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRole.value = 'service_advisor';
    jest.mocked(invoiceService.getInvoice).mockResolvedValue({ success: true, data: INVOICE });
    jest.mocked(changeRequestService.getChangeRequests).mockResolvedValue({ success: true, count: 0, total: 0, pages: 0, currentPage: 1, data: [] });
    jest.mocked(changeRequestService.raiseChangeRequest).mockResolvedValue({ success: true, data: {} as never });
  });

  it('asks for a cancellation instead of cancelling', async () => {
    const user = userEvent.setup();
    await renderScreen();
    expect(screen.queryByText('Cancel Invoice')).toBeNull();

    await user.press(screen.getByText('Request Cancellation'));
    await user.type(screen.getByTestId('request-reason-input'), 'Duplicate bill');
    await user.press(screen.getByText('Send Request'));

    await waitFor(() => expect(changeRequestService.raiseChangeRequest).toHaveBeenCalledWith({
      type: 'invoice_cancellation', targetId: 'inv1', payload: { reason: 'Duplicate bill' },
    }));
    expect(invoiceService.deleteInvoice).not.toHaveBeenCalled();
  });

  it('keeps Cancel Invoice for an owner', async () => {
    mockRole.value = 'owner';
    await renderScreen();
    expect(screen.getByText('Cancel Invoice')).toBeTruthy();
    expect(changeRequestService.getChangeRequests).not.toHaveBeenCalled();
  });
});
