import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppUpdate, type AppUpdateDecision } from '../api/updateService';
import { APP_VERSION } from '../utils/appVersion';
import {
  UPDATE_SNOOZE_KEY, UPDATE_SNOOZE_MS, UPDATE_CHECK_INTERVAL_MS,
} from '../utils/constants';

export type UpdateGateState =
  | { status: 'checking' }
  | { status: 'clear' }
  | { status: 'optional'; decision: AppUpdateDecision }
  | { status: 'required'; decision: AppUpdateDecision };

/**
 * **The only path to a blocking verdict**, and every clause is an explicit
 * positive check.
 *
 * `=== true` identity rather than truthiness, because a malformed body carrying
 * the *string* `"true"` must not block. The last two clauses are the only logic
 * this app keeps about updates, and both can only ever *unblock*:
 *
 * - `latestVersion !== APP_VERSION` — "update to the version you are already
 *   running" is unactionable. This is string identity, not a comparison, so it
 *   cannot rot the way a frozen-in-the-binary semver compare would.
 * - `receivedVersion === APP_VERSION` — the server echoes what we sent. A
 *   mismatch means a cache or proxy handed us another build's answer.
 */
const isBlocking = (d: AppUpdateDecision): boolean =>
  d.updateRequired === true
  && typeof d.latestVersion === 'string'
  && d.latestVersion.length > 0
  && APP_VERSION.length > 0
  && d.latestVersion !== APP_VERSION
  && d.receivedVersion === APP_VERSION;

const isOffering = (d: AppUpdateDecision): boolean =>
  d.updateAvailable === true
  && typeof d.latestVersion === 'string'
  && d.latestVersion.length > 0
  && d.latestVersion !== APP_VERSION
  && d.receivedVersion === APP_VERSION;

interface Snooze { version: string; until: number }

/** A corrupt value must never hide a prompt, so it parses to "not snoozed". */
const parseSnooze = (raw: string | null): Snooze | null => {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' && parsed !== null
      && typeof (parsed as Snooze).version === 'string'
      && typeof (parsed as Snooze).until === 'number'
    ) {
      return parsed as Snooze;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * When the last check ran. Module scope rather than AsyncStorage, mirroring
 * `useCountries`'s module cache: a process restart *should* re-check, and this
 * gives that for free with one less storage key.
 */
let lastCheckedAt = 0;

/** Tests only — module state does not reset between cases in a file. */
export const __resetUpdateThrottle = () => { lastCheckedAt = 0; };

export function useAppUpdate() {
  const [state, setState] = useState<UpdateGateState>({ status: 'checking' });

  const check = useCallback(async (force = false) => {
    if (!force && Date.now() - lastCheckedAt < UPDATE_CHECK_INTERVAL_MS) return;
    lastCheckedAt = Date.now();

    try {
      const res = await getAppUpdate();
      const decision = res?.data;

      // Anything that is not a well-formed body falls through to `clear`.
      if (res?.success !== true || !decision || typeof decision !== 'object') {
        setState({ status: 'clear' });
        return;
      }

      if (isBlocking(decision)) {
        setState({ status: 'required', decision });
        return;
      }

      if (isOffering(decision)) {
        const snooze = parseSnooze(await AsyncStorage.getItem(UPDATE_SNOOZE_KEY));
        const suppressed =
          snooze !== null
          && snooze.version === decision.latestVersion
          && Date.now() < snooze.until;
        setState(suppressed ? { status: 'clear' } : { status: 'optional', decision });
        return;
      }

      setState({ status: 'clear' });
    } catch {
      // Rejection, timeout, non-2xx, 429, a black-holed socket — all of it
      // lands here, and all of it lets the user through. A server-driven gate
      // that fails closed cannot be fixed remotely, because the devices it
      // blocked are the ones that would need to receive the fix.
      setState({ status: 'clear' });
    }
  }, []);

  useEffect(() => { check(true); }, [check]);

  /**
   * Depends on `state.status` rather than reading a ref, so it re-subscribes
   * when the status changes. A ref written during render is what the React
   * Compiler lint rule forbids, and there are only four statuses, so the
   * churn is nothing.
   */
  useEffect(() => {
    const blocked = state.status === 'required';
    const sub = AppState.addEventListener('change', next => {
      if (next !== 'active') return;
      // A resume while blocked forces a re-check, ignoring the throttle: this
      // is how an admin's rollback reaches a stuck device without waiting for
      // a cold start.
      check(blocked);
    });
    return () => sub.remove();
  }, [check, state.status]);

  /** "Later" on an optional prompt. Never reachable from a blocking one. */
  const snooze = useCallback(async () => {
    const version = state.status === 'optional' ? state.decision.latestVersion : '';
    setState({ status: 'clear' });
    if (!version) return;
    // Storing the version is what makes "a new release always re-prompts"
    // structural rather than a coincidence of the timer.
    await AsyncStorage.setItem(
      UPDATE_SNOOZE_KEY,
      JSON.stringify({ version, until: Date.now() + UPDATE_SNOOZE_MS })
    );
  }, [state]);

  return { state, snooze };
}
