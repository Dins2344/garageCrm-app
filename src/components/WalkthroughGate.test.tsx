import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor, userEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WalkthroughGate from './WalkthroughGate';
import { TOUR_SLIDES } from './tourSlides';
import type { User } from '../types/models';

/**
 * The behaviour this file pins is the whole point of the feature:
 * shown once, never again — including across the logouts IdleTimer causes
 * every day — and never flashing the app underneath while we find out.
 */

let mockUser: User | null = null;
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    hasRole: (...roles: string[]) => !!mockUser && roles.includes(mockUser.role),
    login: jest.fn(), register: jest.fn(), logout: jest.fn(), refreshUser: jest.fn(),
  }),
}));

const owner = { _id: 'u1', name: 'Owner', email: 'o@example.com', phone: '9876543210', role: 'owner' } as User;
const mechanic = { _id: 'u2', name: 'Mech', email: 'm@example.com', phone: '9876543211', role: 'mechanic' } as User;

const INTRO_KEY = 'garagepulse_walkthrough_seen';
const USERS_KEY = 'garagepulse_tour_seen_users';

const App = () => <Text>APP</Text>;
const renderGate = () => render(<WalkthroughGate><App /></WalkthroughGate>);

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockUser = null;
});

describe('holding until storage is read', () => {
  /**
   * The no-flash guarantee. Asserting "APP is absent right after `await
   * render`" would be flaky — `await render` flushes effects, so the read may
   * already have resolved. Holding the read open makes it deterministic.
   *
   * This is the test that fails if someone later "simplifies" the tri-state
   * into a plain boolean defaulting to true.
   */
  it('renders neither the app nor the tour before the seen-state is known', async () => {
    // `Once`, not `mockReturnValue`, and no restore afterwards. Both of the
    // obvious alternatives break the rest of the file: `mockReturnValue`
    // survives `clearAllMocks` and hangs every later test on the same
    // never-resolving read, and `mockRestore` puts back a bare jest.fn with no
    // implementation, so `getItem` starts returning undefined. Overriding a
    // single call lets everything after it fall through to the real mock.
    jest.spyOn(AsyncStorage, 'getItem').mockReturnValueOnce(new Promise(() => {}));

    await renderGate();

    expect(screen.getByTestId('walkthrough-gate-loading')).toBeTruthy();
    expect(screen.queryByText('APP')).toBeNull();
    expect(screen.queryByText(TOUR_SLIDES[0].title)).toBeNull();
  });
});

describe('pre-auth intro', () => {
  it('shows on a fresh install', async () => {
    await renderGate();
    await waitFor(() => expect(screen.getByText(TOUR_SLIDES[0].title)).toBeTruthy());
    expect(screen.queryByText('APP')).toBeNull();
  });

  it('records completion and lets the app through', async () => {
    const user = userEvent.setup();
    await renderGate();
    await waitFor(() => expect(screen.getByTestId('feature-carousel-skip')).toBeTruthy());

    await user.press(screen.getByTestId('feature-carousel-skip'));

    await waitFor(() => expect(screen.getByText('APP')).toBeTruthy());
    await waitFor(async () => expect(await AsyncStorage.getItem(INTRO_KEY)).toBe('true'));
  });

  it('does not show once it has run', async () => {
    await AsyncStorage.setItem(INTRO_KEY, 'true');
    await renderGate();
    await waitFor(() => expect(screen.getByText('APP')).toBeTruthy());
  });
});

describe('post-login tour', () => {
  beforeEach(async () => {
    // The intro is behind us; these cases are about the signed-in half.
    await AsyncStorage.setItem(INTRO_KEY, 'true');
  });

  it('shows for a user who has not seen it', async () => {
    mockUser = owner;
    await renderGate();
    await waitFor(() => expect(screen.getByText(TOUR_SLIDES[0].title)).toBeTruthy());
  });

  it('does not show for a user already in the list', async () => {
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify([owner._id]));
    mockUser = owner;
    await renderGate();
    await waitFor(() => expect(screen.getByText('APP')).toBeTruthy());
  });

  it('appends without dropping other people on a shared device', async () => {
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(['u9']));
    mockUser = owner;
    const user = userEvent.setup();
    await renderGate();
    await waitFor(() => expect(screen.getByTestId('feature-carousel-skip')).toBeTruthy());

    await user.press(screen.getByTestId('feature-carousel-skip'));

    await waitFor(async () =>
      expect(await AsyncStorage.getItem(USERS_KEY)).toBe(JSON.stringify(['u9', owner._id]))
    );
  });

  it('filters to what the role can reach — a mechanic sees no estimates slide', async () => {
    mockUser = mechanic;
    await renderGate();

    await waitFor(() => expect(screen.getByText(TOUR_SLIDES[0].title)).toBeTruthy());
    const estimates = TOUR_SLIDES.find(s => s.key === 'estimates')!;
    expect(screen.queryByText(estimates.title)).toBeNull();
  });

  it('survives a corrupt stored value instead of locking anyone out', async () => {
    await AsyncStorage.setItem(USERS_KEY, 'not json');
    mockUser = owner;
    await renderGate();
    // Treated as "nobody has seen it", so the tour runs rather than crashing.
    await waitFor(() => expect(screen.getByText(TOUR_SLIDES[0].title)).toBeTruthy());
  });
});

/**
 * The core requirement, and the reason both keys sit in DEVICE_STORAGE_KEYS:
 * IdleTimer signs people out after 10 idle minutes, so "cleared on logout"
 * would mean "replayed several times a day".
 */
describe('after a logout', () => {
  it('shows neither the intro nor the tour again', async () => {
    await AsyncStorage.setItem(INTRO_KEY, 'true');
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify([owner._id]));

    mockUser = null;
    const { unmount } = await renderGate();
    await waitFor(() => expect(screen.getByText('APP')).toBeTruthy());
    unmount();

    mockUser = owner;
    await renderGate();
    await waitFor(() => expect(screen.getByText('APP')).toBeTruthy());
    expect(screen.queryByText(TOUR_SLIDES[0].title)).toBeNull();
  });
});
