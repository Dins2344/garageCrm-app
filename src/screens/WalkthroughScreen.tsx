import React from 'react';
import { useAuth } from '../context/AuthContext';
import FeatureCarousel from '../components/FeatureCarousel';
import ResponsiveScreen from '../components/ResponsiveScreen';
import { slidesForRole } from '../components/tourSlides';
import type { RootStackScreenProps } from '../types/navigation';

type Props = RootStackScreenProps<'Walkthrough'>;

/**
 * The replay route, reached from More. Not the first-run path — both of those
 * are early returns inside `WalkthroughGate` and never navigate here, which is
 * why this route takes no params: a `mode` flag could only ever hold one value.
 *
 * It writes nothing. A replay is not a first run, and the header's back button
 * is the only exit it needs, so `onSkip` is omitted too.
 */
export default function WalkthroughScreen({ navigation }: Props) {
  const { user } = useAuth();
  return (
    <ResponsiveScreen>
      <FeatureCarousel
        slides={slidesForRole(user?.role)}
        onDone={() => navigation.goBack()}
        doneLabel="Done"
      />
    </ResponsiveScreen>
  );
}
