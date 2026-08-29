import React from 'react';
import { Text, BackHandler, AppState } from 'react-native';
import { render, screen, waitFor, userEvent, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UpdateGate from './UpdateGate';
import * as updateService from '../api/updateService';
import { __resetUpdateThrottle } from '../hooks/useAppUpdate';
import { UPDATE_GATE_HOLD_MS } from '../utils/constants';

/**
 * This gate can hide the entire app. Most of what follows tests the cases
 * where it must NOT — a server-driven block that fails closed cannot be fixed
 * remotely, because the devices it blocked are the ones that would need to
 * receive the fix.
 */

// Explicit factory — a bare automock require()s the real module, which reaches
// apiInterceptor's axios.create() and crashes under jest-expo.
jest.mock('../api/updateService', () => ({ getAppUpdate: jest.fn() }));

// Fixed so the self-referential and echo checks are exercisable.
jest.mock('../utils/appVersion', () => ({ APP_VERSION: '1.0.9' }));

const SNOOZE_KEY = 'garagepulse_update_snooze';

const decision = (over: Partial<updateService.AppUpdateDecision> = {}): updateService.AppUpdateDecision => ({
  updateAvailable: false,
  updateRequired: false,
  latestVersion: '1.1.0',
  storeUrl: 'https://play.google.com/store/apps/details?id=com.dctechs.garagepulse',
  message: '',
  receivedVersion: '1.0.9',
  ...over,
});

const ok = (d: updateService.AppUpdateDecision) => ({ success: true as const, data: d });

const renderGate = () => render(<UpdateGate><Text>APP</Text></UpdateGate>);
const appShows = () => waitFor(() => expect(screen.getByText('APP')).toBeTruthy());

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  __resetUpdateThrottle();
});

describe('failing open', () => {
  it.each([
    ['a network error', () => Promise.reject(new Error('Network Error'))],
    ['a timeout', () => Promise.reject(Object.assign(new Error('timeout'), { code: 'ECONNABORTED' }))],
    ['a body with no data', () => Promise.resolve({ success: true } as never)],
    ['success: false', () => Promise.resolve({ success: false, data: decision() } as never)],
  ])('lets the user through on %s', async (_label, impl) => {
    jest.mocked(updateService.getAppUpdate).mockImplementation(impl);
    await renderGate();
    await appShows();
  });

  /**
   * The anti-brick test. Without the bounded hold in UpdateGate, a request that
   * never settles hides the app forever — on exactly the connections nobody
   * tests on.
   */
  it('lets the user through when the check never resolves', async () => {
    jest.useFakeTimers();
    try {
      jest.mocked(updateService.getAppUpdate).mockReturnValue(new Promise(() => {}));
      await renderGate();

      expect(screen.getByTestId('update-gate-loading')).toBeTruthy();
      expect(screen.queryByText('APP')).toBeNull();

      await act(async () => { jest.advanceTimersByTime(UPDATE_GATE_HOLD_MS + 1); });

      expect(screen.getByText('APP')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  /** "Update to the version you are already running" is unactionable. */
  it('ignores a required verdict naming the version already installed', async () => {
    jest.mocked(updateService.getAppUpdate).mockResolvedValue(
      ok(decision({ updateRequired: true, latestVersion: '1.0.9' }))
    );
    await renderGate();
    await appShows();
  });

  /** A cache or proxy handing us another build's answer. */
  it('ignores a response whose echoed version is not ours', async () => {
    jest.mocked(updateService.getAppUpdate).mockResolvedValue(
      ok(decision({ updateRequired: true, receivedVersion: '0.9.0' }))
    );
    await renderGate();
    await appShows();
  });

  /** A malformed body must not block on truthiness. */
  it('ignores updateRequired sent as the string "true"', async () => {
    jest.mocked(updateService.getAppUpdate).mockResolvedValue(
      ok(decision({ updateRequired: 'true' as unknown as boolean }))
    );
    await renderGate();
    await appShows();
  });
});

describe('mandatory update', () => {
  beforeEach(() => {
    jest.mocked(updateService.getAppUpdate).mockResolvedValue(
      ok(decision({ updateRequired: true, message: 'Please update to continue.' }))
    );
  });

  it('replaces the app and shows both version numbers', async () => {
    await renderGate();
    await waitFor(() => expect(screen.getByText('Update required')).toBeTruthy());
    expect(screen.queryByText('APP')).toBeNull();
    expect(screen.getByText(/You have 1\.0\.9\..*current version is 1\.1\.0/)).toBeTruthy();
  });

  it('offers no Later escape', async () => {
    await renderGate();
    await waitFor(() => expect(screen.getByText('Update required')).toBeTruthy());
    expect(screen.queryByTestId('update-later')).toBeNull();
  });

  it('swallows Android back rather than revealing the app', async () => {
    const spy = jest.spyOn(BackHandler, 'addEventListener');
    await renderGate();
    await waitFor(() => expect(screen.getByText('Update required')).toBeTruthy());

    const handler = spy.mock.calls.at(-1)?.[1] as () => boolean;
    expect(handler()).toBe(true);
    expect(screen.queryByText('APP')).toBeNull();
  });
});

describe('optional update', () => {
  const offered = ok(decision({ updateAvailable: true, message: 'A new version is available.' }));

  it('prompts, and Later reveals the app and records the snooze', async () => {
    jest.mocked(updateService.getAppUpdate).mockResolvedValue(offered);
    const user = userEvent.setup();
    await renderGate();

    await waitFor(() => expect(screen.getByText('Update available')).toBeTruthy());
    await user.press(screen.getByTestId('update-later'));

    await appShows();
    await waitFor(async () => {
      const stored = JSON.parse((await AsyncStorage.getItem(SNOOZE_KEY)) ?? '{}');
      expect(stored.version).toBe('1.1.0');
      expect(stored.until).toBeGreaterThan(Date.now());
    });
  });

  /**
   * Found on an emulator: the prompt appeared and then closed itself after
   * about a second. The hold timer fires regardless of what is on screen, and
   * the optional branch used to be gated on it, so it tore down a prompt the
   * user was still reading.
   */
  it('stays on screen once shown, rather than closing itself when the hold expires', async () => {
    jest.useFakeTimers();
    try {
      jest.mocked(updateService.getAppUpdate).mockResolvedValue(offered);
      await renderGate();
      await act(async () => {});
      expect(screen.getByText('Update available')).toBeTruthy();

      await act(async () => { jest.advanceTimersByTime(UPDATE_GATE_HOLD_MS * 3); });

      expect(screen.getByText('Update available')).toBeTruthy();
      expect(screen.queryByText('APP')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  /** The other half of the same rule: arriving late, it must NOT take over. */
  it('does not take over a loaded screen when the verdict arrives after the hold', async () => {
    jest.useFakeTimers();
    try {
      let resolveCheck: (v: unknown) => void = () => {};
      jest.mocked(updateService.getAppUpdate).mockReturnValue(
        new Promise(res => { resolveCheck = res as (v: unknown) => void; })
      );
      await renderGate();

      // The hold expires first, so the app is already on screen.
      await act(async () => { jest.advanceTimersByTime(UPDATE_GATE_HOLD_MS + 1); });
      expect(screen.getByText('APP')).toBeTruthy();

      await act(async () => { resolveCheck(offered); });

      expect(screen.getByText('APP')).toBeTruthy();
      expect(screen.queryByText('Update available')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('stays quiet while the same version is snoozed', async () => {
    await AsyncStorage.setItem(
      SNOOZE_KEY, JSON.stringify({ version: '1.1.0', until: Date.now() + 60_000 })
    );
    jest.mocked(updateService.getAppUpdate).mockResolvedValue(offered);
    await renderGate();
    await appShows();
  });

  /** Storing the version is what makes this structural, not a timer accident. */
  it('prompts again for a newer version even while an older snooze is live', async () => {
    await AsyncStorage.setItem(
      SNOOZE_KEY, JSON.stringify({ version: '1.0.9', until: Date.now() + 60_000 })
    );
    jest.mocked(updateService.getAppUpdate).mockResolvedValue(offered);
    await renderGate();
    await waitFor(() => expect(screen.getByText('Update available')).toBeTruthy());
  });

  it('prompts once the snooze has expired', async () => {
    await AsyncStorage.setItem(
      SNOOZE_KEY, JSON.stringify({ version: '1.1.0', until: Date.now() - 1 })
    );
    jest.mocked(updateService.getAppUpdate).mockResolvedValue(offered);
    await renderGate();
    await waitFor(() => expect(screen.getByText('Update available')).toBeTruthy());
  });

  it('prompts rather than crashing on a corrupt snooze value', async () => {
    await AsyncStorage.setItem(SNOOZE_KEY, 'not json');
    jest.mocked(updateService.getAppUpdate).mockResolvedValue(offered);
    await renderGate();
    await waitFor(() => expect(screen.getByText('Update available')).toBeTruthy());
  });
});

describe('resume from background', () => {
  /**
   * The un-brick path: an admin clears a bad policy and the device picks it up
   * on the next resume, without waiting for a cold start.
   */
  it('re-checks on resume while blocked, and clears when the policy is lifted', async () => {
    const spy = jest.spyOn(AppState, 'addEventListener');
    jest.mocked(updateService.getAppUpdate)
      .mockResolvedValueOnce(ok(decision({ updateRequired: true })))
      .mockResolvedValueOnce(ok(decision()));

    await renderGate();
    await waitFor(() => expect(screen.getByText('Update required')).toBeTruthy());

    const handler = spy.mock.calls.at(-1)?.[1] as (s: string) => void;
    await act(async () => { handler('active'); });

    await appShows();
  });
});
