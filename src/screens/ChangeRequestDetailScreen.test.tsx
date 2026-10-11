import React from 'react';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import ChangeRequestDetailScreen from './ChangeRequestDetailScreen';
import * as changeRequestService from '../api/changeRequestService';
import { GlobalLoaderProvider } from '../context/GlobalLoaderContext';
import type { ChangeRequest } from '../types/models';
import type { RootStackScreenProps } from '../types/navigation';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (cb: () => void | (() => void)) => {
    const react = require('react');
    react.useEffect(cb, [cb]);
  },
}));

jest.mock('../api/changeRequestService', () => ({
  getChangeRequest: jest.fn(),
  approveChangeRequest: jest.fn(),
  rejectChangeRequest: jest.fn(),
  withdrawChangeRequest: jest.fn(),
}));

const mockAuth = { role: 'owner', id: 'u-owner' };
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { _id: mockAuth.id, role: mockAuth.role },
    hasRole: (...roles: string[]) => roles.includes(mockAuth.role),
  }),
}));
jest.mock('../context/GarageContext', () => ({
  useGarage: () => ({ locale: jest.requireActual('../utils/locale').DEFAULT_LOCALE, activeGarageId: 'g1' }),
}));

const REQUEST: ChangeRequest = {
  _id: 'cr1', garage: 'g1', type: 'job_card_cancellation', status: 'pending', targetType: 'job_card',
  target: 'jc1', targetLabel: 'JC-261010-0001', payload: { reason: 'Customer declined' },
  requestedBy: { _id: 'u-mech', name: 'Ravi Kumar' }, decidedBy: null, decisionNote: '', decidedAt: null,
  createdAt: '2026-10-10T05:00:00Z', updatedAt: '2026-10-10T05:00:00Z',
};
const props = { route: { params: { id: 'cr1' } }, navigation: { goBack: jest.fn(), navigate: jest.fn() } } as unknown as RootStackScreenProps<'ChangeRequestDetail'>;

async function renderScreen(request: ChangeRequest = REQUEST) {
  jest.mocked(changeRequestService.getChangeRequest).mockResolvedValue({ success: true, data: request });
  await render(<GlobalLoaderProvider><ChangeRequestDetailScreen {...props} /></GlobalLoaderProvider>);
  await waitFor(() => expect(screen.getByText('JC-261010-0001')).toBeTruthy());
}

describe('ChangeRequestDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.role = 'owner';
    mockAuth.id = 'u-owner';
  });

  it('shows what was asked and by whom', async () => {
    await renderScreen();
    expect(screen.getByText('Job card cancellation')).toBeTruthy();
    expect(screen.getByText('Customer declined')).toBeTruthy();
    expect(screen.getByText(/Ravi Kumar/)).toBeTruthy();
  });

  it('shows no stale request or actions while a different id loads', async () => {
    jest.mocked(changeRequestService.getChangeRequest).mockResolvedValue({ success: true, data: REQUEST });
    const { rerender } = await render(<GlobalLoaderProvider><ChangeRequestDetailScreen {...props} /></GlobalLoaderProvider>);
    await waitFor(() => expect(screen.getByText('JC-261010-0001')).toBeTruthy());

    jest.mocked(changeRequestService.getChangeRequest).mockReturnValue(new Promise(() => {}));
    const next = { ...props, route: { params: { id: 'cr2' } } } as unknown as RootStackScreenProps<'ChangeRequestDetail'>;
    await rerender(<GlobalLoaderProvider><ChangeRequestDetailScreen {...next} /></GlobalLoaderProvider>);

    expect(screen.queryByText('JC-261010-0001')).toBeNull();
    expect(screen.queryByText('Approve')).toBeNull();
  });

  it('reloads after a failed decision so a stale state is replaced', async () => {
    jest.mocked(changeRequestService.approveChangeRequest).mockRejectedValue(new Error('already decided'));
    const user = userEvent.setup();
    await renderScreen();
    await user.press(screen.getByText('Approve'));
    await user.press(screen.getByText('Confirm Approval'));
    await waitFor(() => expect(changeRequestService.getChangeRequest).toHaveBeenCalledTimes(2));
  });

  it('lets an owner approve with a note', async () => {
    jest.mocked(changeRequestService.approveChangeRequest).mockResolvedValue({ success: true, data: { ...REQUEST, status: 'approved', decidedBy: { _id: 'u-owner', name: 'Owner' } } });
    const user = userEvent.setup();
    await renderScreen();

    await user.press(screen.getByText('Approve'));
    await user.type(screen.getByTestId('decision-note'), 'Fine');
    await user.press(screen.getByText('Confirm Approval'));

    await waitFor(() => expect(changeRequestService.approveChangeRequest).toHaveBeenCalledWith('cr1', 'Fine'));
    expect(await screen.findByText('Approved')).toBeTruthy();
  });

  it('lets an owner reject', async () => {
    jest.mocked(changeRequestService.rejectChangeRequest).mockResolvedValue({ success: true, data: { ...REQUEST, status: 'rejected' } });
    const user = userEvent.setup();
    await renderScreen();

    await user.press(screen.getByText('Reject'));
    await user.press(screen.getByText('Confirm Rejection'));

    await waitFor(() => expect(changeRequestService.rejectChangeRequest).toHaveBeenCalledWith('cr1', ''));
  });

  it('offers the requester Withdraw and not Approve', async () => {
    mockAuth.role = 'mechanic';
    mockAuth.id = 'u-mech';
    await renderScreen();
    expect(screen.getByText('Withdraw Request')).toBeTruthy();
    expect(screen.queryByText('Approve')).toBeNull();
  });

  it('offers another staff member nothing', async () => {
    mockAuth.role = 'mechanic';
    mockAuth.id = 'u-other';
    await renderScreen();
    expect(screen.queryByText('Withdraw Request')).toBeNull();
    expect(screen.queryByText('Approve')).toBeNull();
  });

  it('shows who decided and their note, with no actions', async () => {
    await renderScreen({ ...REQUEST, status: 'rejected', decidedBy: { _id: 'u-owner', name: 'Anu' }, decisionNote: 'Customer is coming back', decidedAt: '2026-10-10T06:00:00Z' });
    expect(screen.getByText('Rejected by')).toBeTruthy();
    expect(screen.getByText('Customer is coming back')).toBeTruthy();
    expect(screen.queryByText('Approve')).toBeNull();
  });
});
