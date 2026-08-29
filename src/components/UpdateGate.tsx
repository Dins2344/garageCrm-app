import React, { useEffect, useState, type ReactNode } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useAppUpdate } from '../hooks/useAppUpdate';
import UpdateScreen from '../screens/UpdateScreen';
import ResponsiveScreen from './ResponsiveScreen';
import { UPDATE_GATE_HOLD_MS } from '../utils/constants';
import { colors } from '../theme';

/**
 * Shows the update prompt in place of the app, or gets out of the way.
 *
 * Mounted in `App.tsx` **wrapping `AuthProvider`**, which is further out than
 * `WalkthroughGate`. Three reasons:
 *
 * 1. `AppNavigator` early-returns a spinner while `AuthContext.loading`
 *    resolves, so a gate below that would run its request *after* the auth
 *    round trip. Up here the two overlap and cold start costs nothing extra.
 * 2. A binary we have declared unusable should do nothing else — no `getMe()`,
 *    no IdleTimer, no garage fetch running behind a blocking screen.
 * 3. It must be outside `WalkthroughGate` regardless: otherwise a blocked user
 *    could swipe through the first-run carousel and burn
 *    `WALKTHROUGH_SEEN_KEY`, so after updating they would never see the intro.
 */
export default function UpdateGate({ children }: { children: ReactNode }) {
  const { state, snooze } = useAppUpdate();
  const [held, setHeld] = useState(true);

  /**
   * Whether the optional prompt has already taken the screen.
   *
   * `held` decides whether the prompt may *appear*; this decides that it
   * *stays*. Without the latch the hold timer tore down a prompt the user was
   * in the middle of reading — it showed for about a second on a fast network
   * and then closed itself, which is exactly how it was found on an emulator.
   */
  const [shownOptional, setShownOptional] = useState(false);

  /**
   * **The one hard invariant: this gate never withholds `children` for longer
   * than `UPDATE_GATE_HOLD_MS`.**
   *
   * `WalkthroughGate` may hold indefinitely because it waits on AsyncStorage,
   * which cannot hang on a network. This waits on a network. An unbounded hold
   * is a permanent brick on exactly the connections nobody tests on, so the
   * timeout always fires regardless of what the request is doing.
   *
   * Pinned by the fake-timer case in UpdateGate.test.tsx.
   */
  useEffect(() => {
    const t = setTimeout(() => setHeld(false), UPDATE_GATE_HOLD_MS);
    return () => clearTimeout(t);
  }, []);

  // Latches on the same render the prompt first shows, so there is no frame
  // where the app flashes behind it.
  useEffect(() => {
    if (held && state.status === 'optional') setShownOptional(true);
  }, [held, state.status]);

  // A blocking verdict takes the screen whenever it arrives, hold or no hold:
  // "this build must not be used" outranks being jarring.
  if (state.status === 'required') {
    return (
      <ResponsiveScreen>
        <UpdateScreen mandatory decision={state.decision} />
      </ResponsiveScreen>
    );
  }

  // An optional prompt only *takes* the screen if it resolved during the hold —
  // arriving later it waits for the next launch rather than yanking away a
  // screen the user is already working in. But once it has taken the screen it
  // keeps it until the user acts, which is what `shownOptional` latches.
  if ((held || shownOptional) && state.status === 'optional') {
    return (
      <ResponsiveScreen>
        <UpdateScreen decision={state.decision} onLater={snooze} />
      </ResponsiveScreen>
    );
  }

  if (held && state.status === 'checking') {
    return (
      <View style={styles.loading} testID="update-gate-loading">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
});
