import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  WALKTHROUGH_SEEN_KEY, TOUR_SEEN_USERS_KEY, TOUR_SEEN_USERS_LIMIT,
} from '../utils/constants';

/**
 * Owns every read and write of the two walkthrough flags.
 *
 * Both live in `DEVICE_STORAGE_KEYS` and therefore survive logout — see the
 * note on that list in `utils/constants.ts`. The short version: IdleTimer signs
 * people out after 10 idle minutes, so a flag that logout cleared would replay
 * the tour several times a day.
 */

function parseSeenUsers(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    // A corrupt value must not lock anyone permanently into — or out of — the
    // tour. Treat it as "nobody has seen it" and let the next write repair it.
    return [];
  }
}

export function useWalkthroughSeen(userId?: string) {
  // `null` means "not read yet", exactly as WebAppBanner does it. The callers
  // hold on null rather than guessing, which is what makes the no-flash
  // guarantee structural instead of a race.
  const [introSeen, setIntroSeen] = useState<boolean | null>(null);
  const [tourSeen, setTourSeen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(WALKTHROUGH_SEEN_KEY).then(v => setIntroSeen(v === 'true'));
  }, []);

  useEffect(() => {
    if (!userId) { setTourSeen(null); return; }
    AsyncStorage.getItem(TOUR_SEEN_USERS_KEY).then(raw => setTourSeen(parseSeenUsers(raw).includes(userId)));
  }, [userId]);

  const markIntroSeen = useCallback(async () => {
    setIntroSeen(true);   // optimistic, as WebAppBanner does — dismissal is instant
    await AsyncStorage.setItem(WALKTHROUGH_SEEN_KEY, 'true');
  }, []);

  const markTourSeen = useCallback(async () => {
    if (!userId) return;
    setTourSeen(true);
    const ids = parseSeenUsers(await AsyncStorage.getItem(TOUR_SEEN_USERS_KEY));
    if (ids.includes(userId)) return;
    // Newest last, oldest dropped: a shared workshop phone that has seen forty
    // staff accounts over two years should not carry forty ids forever. The
    // cost is that the 21st-oldest person could see the tour twice.
    await AsyncStorage.setItem(
      TOUR_SEEN_USERS_KEY,
      JSON.stringify([...ids, userId].slice(-TOUR_SEEN_USERS_LIMIT))
    );
  }, [userId]);

  return { introSeen, tourSeen, markIntroSeen, markTourSeen };
}
