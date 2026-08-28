import React, { useCallback, useEffect, useState, type ReactNode } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useWalkthroughSeen } from '../hooks/useWalkthroughSeen';
import FeatureCarousel from './FeatureCarousel';
import ResponsiveScreen from './ResponsiveScreen';
import { TOUR_SLIDES, slidesForRole } from './tourSlides';
import { colors } from '../theme';

/**
 * Decides whether to show the first-run intro, the post-login tour, or the app.
 *
 * **A wrapper rather than branches inside AppNavigator**, for two reasons:
 *
 * 1. No flash, structurally rather than by timing. `children` is a created
 *    element, not a mounted tree — React never invokes NavigationContainer's or
 *    LoginScreen's component function while this returns something else. That
 *    is stronger than an `initialRouteName` trick, where "Login doesn't render"
 *    would be a property of React Navigation rather than of our code.
 * 2. Testable. AppNavigator imports all seventeen screens, which transitively
 *    reach `axios.create()` and crash under jest-expo — which is why there is
 *    no AppNavigator.test.tsx. This imports only useAuth, the hook and the
 *    carousel, so a test can mount it with a plain <Text> as its child.
 */
export default function WalkthroughGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { introSeen, tourSeen, markIntroSeen, markTourSeen } = useWalkthroughSeen(user?._id);

  // Whether the user finished or skipped the intro during THIS launch.
  //
  // State rather than a ref, because the render branches below read it and the
  // React Compiler lint rule forbids reading a ref during render. It is set
  // from the intro's own completion handler — an event, not an effect — which
  // is both lint-clean and more precise than "the intro branch rendered".
  //
  // The gate mounts once (AuthContext's `loading` only ever goes true -> false)
  // and stays mounted across the user null -> set transition, so this survives
  // exactly as long as it should, and does not survive a restart.
  const [introShownThisLaunch, setIntroShownThisLaunch] = useState(false);

  const handleIntroDone = useCallback(() => {
    setIntroShownThisLaunch(true);
    markIntroSeen();
  }, [markIntroSeen]);

  // Someone who watched the intro ninety seconds ago does not need the same
  // deck again the moment they finish registering. The render branch below
  // already suppresses it; this persists that so it does not reappear on the
  // next launch either.
  useEffect(() => {
    if (user && tourSeen === false && introShownThisLaunch) markTourSeen();
  }, [user, tourSeen, introShownThisLaunch, markTourSeen]);

  // On upgrade from a build without the walkthrough, a user with a live session
  // never reaches the intro branch — until they log out at end of shift and get
  // a marketing carousel the next morning. An install that already has a
  // session has, by definition, already been introduced.
  useEffect(() => {
    if (user && introSeen === false) markIntroSeen();
  }, [user, introSeen, markIntroSeen]);

  // Hold until both reads that matter have resolved. This is the no-flash
  // guarantee; `WalkthroughGate.test.tsx` pins it.
  if (introSeen === null || (user && tourSeen === null)) {
    return (
      <View style={styles.loading} testID="walkthrough-gate-loading">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user && introSeen === false) {
    return (
      <ResponsiveScreen>
        <FeatureCarousel
          slides={TOUR_SLIDES}
          onDone={handleIntroDone}
          onSkip={handleIntroDone}
          doneLabel="Get started"
        />
      </ResponsiveScreen>
    );
  }

  if (user && tourSeen === false && !introShownThisLaunch) {
    const slides = slidesForRole(user.role);
    if (slides.length > 0) {
      return (
        <ResponsiveScreen>
          <FeatureCarousel
            slides={slides}
            onDone={markTourSeen}
            onSkip={markTourSeen}
            doneLabel="Start using GaragePulse"
          />
        </ResponsiveScreen>
      );
    }
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
});
