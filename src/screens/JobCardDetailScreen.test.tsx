import React from 'react';
import { render, screen, waitFor, userEvent, within } from '@testing-library/react-native';
import JobCardDetailScreen from './JobCardDetailScreen';
import * as jobCardService from '../api/jobCardService';
import * as userService from '../api/userService';
import type { JobCard, User } from '../types/models';
import type { RootStackScreenProps } from '../types/navigation';

// The screen refetches via useFocusEffect, which needs a real
// NavigationContainer above it. Rendering the screen in isolation is the point
// of these tests, so stand the hook in for a plain mount effect — "focused" is
// exactly what a freshly rendered screen is.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  // `require` inside the factory, not the file-scope React import: jest hoists
  // mock factories above every import, so closing over one is a ReferenceError.
  useFocusEffect: (cb: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const react = require('react');
    react.useEffect(cb, [cb]);
  },
}));

// Explicit factories — see AuthContext.test.tsx for why automock isn't used.
jest.mock('../api/jobCardService', () => ({
  getJobCard: jest.fn(),
  updateJobCard: jest.fn(),
  approveJobCardEstimation: jest.fn(),
}));

jest.mock('../api/userService', () => ({
  getMechanics: jest.fn(),
}));

jest.mock('../api/invoiceService', () => ({
  createInvoice: jest.fn(),
}));

const mockHasRole = jest.fn(() => true);
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ hasRole: (...roles: string[]) => mockHasRole(...(roles as [])), user: { _id: 'u1', role: 'owner' } }),
}));

jest.mock('../context/GarageContext', () => ({
  useGarage: () => ({
    garages: [], activeGarageId: 'g1', garagesLoading: false,
    locale: jest.requireActual('../utils/locale').DEFAULT_LOCALE,
    activeGarage: null, refreshGarage: jest.fn(),
    switchGarage: jest.fn(), addBranch: jest.fn(), removeBranch: jest.fn(),
  }),
}));

const MECHANICS: User[] = [
  { _id: 'm1', name: 'Ravi Kumar', email: 'ravi@x.com', phone: '9000000001', role: 'mechanic', garage: 'g1', isActive: true },
  { _id: 'm2', name: 'Anil Joseph', email: 'anil@x.com', phone: '9000000002', role: 'mechanic', garage: 'g1', isActive: true },
];

const baseJobCard = {
  _id: 'jc1',
  jobCardNumber: 'JC-260815-0001',
  serviceType: 'periodic_service',
  status: 'in_progress',
  odometerAtIntake: 42500,
  customer: { _id: 'c1', name: 'Rahul Sharma', phone: '9876543210' },
  vehicle: { _id: 'v1', licensePlate: 'KL07AB1234', make: 'Maruti', model: 'Swift', year: 2019 },
  assignedMechanic: { _id: 'm1', name: 'Ravi Kumar' },
  assignedAdvisor: { _id: 'a1', name: 'Priya Nair' },
  complaints: [{ description: 'Brake noise', priority: 'high' }],
  statusHistory: [
    { status: 'new', changedAt: '2026-08-10T04:00:00Z', changedBy: { _id: 'u1', name: 'Priya Nair' } },
    { status: 'in_progress', changedAt: '2026-08-12T06:30:00Z', changedBy: { _id: 'u2', name: 'Ravi Kumar' }, notes: 'Parts arrived' },
  ],
  estimation: { parts: [], labor: [], subtotal: 0, taxRate: 18, taxAmount: 0, discount: 0, grandTotal: 0, approvedByCustomer: false },
} as unknown as JobCard;

const props = { route: { params: { id: 'jc1' } }, navigation: { goBack: jest.fn(), navigate: jest.fn() } } as unknown as RootStackScreenProps<'JobCardDetail'>;

async function renderScreen(jobCard: JobCard = baseJobCard) {
  jest.mocked(jobCardService.getJobCard).mockResolvedValue({ success: true, data: jobCard });
  await render(<JobCardDetailScreen {...props} />);
  await waitFor(() => expect(screen.getByText('Service Details')).toBeTruthy());
}

describe('JobCardDetailScreen — details parity with the web page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasRole.mockReturnValue(true);
    jest.mocked(userService.getMechanics).mockResolvedValue(MECHANICS);
  });

  it('shows the service type, advisor and odometer', async () => {
    await renderScreen();
    // Stored as a snake_case enum; shown to humans as words.
    expect(screen.getByText('Periodic Service')).toBeTruthy();
    expect(screen.getByText('Priya Nair')).toBeTruthy();
    expect(screen.getByText('42,500 km')).toBeTruthy();
  });

  it('shows the vehicle year alongside make and model', async () => {
    await renderScreen();
    expect(screen.getByText('Maruti Swift (2019)')).toBeTruthy();
  });

  it('renders the status timeline newest-first, with who changed it', async () => {
    await renderScreen();
    expect(screen.getByText('Parts arrived')).toBeTruthy();

    // Scoped to the timeline: the StatusStepper above renders the same status
    // names, so an unscoped query would read its order instead of this one's.
    const timeline = within(screen.getByTestId('status-timeline'));
    const statuses = timeline.getAllByText(/^(New|In Progress)$/).map(n => n.props.children);
    expect(statuses).toEqual(['In Progress', 'New']);
  });

  it('omits the timeline entirely when there is no history', async () => {
    await renderScreen({ ...baseJobCard, statusHistory: [] } as JobCard);
    expect(screen.queryByText('Timeline')).toBeNull();
  });
});

describe('JobCardDetailScreen — mechanic assignment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasRole.mockReturnValue(true);
    jest.mocked(userService.getMechanics).mockResolvedValue(MECHANICS);
  });

  it('shows the current mechanic and offers the others', async () => {
    const user = userEvent.setup();
    await renderScreen();

    expect(screen.getByText('Assigned Mechanic')).toBeTruthy();
    await user.press(screen.getByText('Ravi Kumar'));
    await waitFor(() => expect(screen.getByText('Anil Joseph')).toBeTruthy());
  });

  it('assigns a different mechanic and re-fetches the job card', async () => {
    jest.mocked(jobCardService.updateJobCard).mockResolvedValue({ success: true, data: baseJobCard });
    const user = userEvent.setup();
    await renderScreen();

    await user.press(screen.getByText('Ravi Kumar'));
    await user.press(await screen.findByText('Anil Joseph'));

    await waitFor(() => expect(jobCardService.updateJobCard).toHaveBeenCalledWith('jc1', { assignedMechanic: 'm2' }));
    // Re-fetched rather than adopting the PUT response, which populates fewer
    // refs and would blank the advisor and timeline names.
    await waitFor(() => expect(jobCardService.getJobCard).toHaveBeenCalledTimes(2));
  });

  it('sends null when clearing the assignment', async () => {
    jest.mocked(jobCardService.updateJobCard).mockResolvedValue({ success: true, data: baseJobCard });
    const user = userEvent.setup();
    await renderScreen();

    await user.press(screen.getByText('Ravi Kumar'));
    await user.press(await screen.findByText('Unassigned'));

    await waitFor(() => expect(jobCardService.updateJobCard).toHaveBeenCalledWith('jc1', { assignedMechanic: null }));
  });

  it('is read-only for a role that cannot reassign work', async () => {
    // A mechanic must not be able to reassign their own job.
    mockHasRole.mockReturnValue(false);
    await renderScreen();

    expect(screen.getByText('Assigned Mechanic')).toBeTruthy();
    expect(screen.getByText('Ravi Kumar')).toBeTruthy();
    // No picker: pressing the name opens nothing.
    expect(screen.queryByText('Anil Joseph')).toBeNull();
  });

  it('still renders when the mechanic list fails to load', async () => {
    // Reassignment is a convenience; a failed staff fetch must not take the
    // whole detail screen down.
    jest.mocked(userService.getMechanics).mockRejectedValue(new Error('offline'));
    await renderScreen();
    expect(screen.getByText('Assigned Mechanic')).toBeTruthy();
    // Regex, not an exact string: the header renders "Job Card" and the number
    // as two sibling text nodes.
    expect(screen.getByText(/JC-260815-0001/)).toBeTruthy();
  });
});
