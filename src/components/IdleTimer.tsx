import React, { useEffect, useRef, useCallback, useMemo, ReactNode } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { IDLE_TIMEOUT_MS } from '../utils/constants';

const IdleTimer = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (user) {
      timerRef.current = setTimeout(() => {
        logout();
      }, IDLE_TIMEOUT_MS);
    }
  }, [user, logout]);

  // Always keep a ref to the latest resetTimer.
  // PanResponder is created once — without this ref it would hold
  // a stale closure and never actually reset the timer on touches.
  const resetTimerRef = useRef(resetTimer);
  useEffect(() => {
    resetTimerRef.current = resetTimer;
  }, [resetTimer]);

  // PanResponder created once via useMemo; reads from resetTimerRef so it
  // always calls the current version regardless of re-renders.
  // Uses the correct PanResponder callback names (not the Responder API).
  // Returning false lets touches pass through to child components normally.
  //
  // resetTimerRef.current is only read inside onStart/onMoveShouldSetPanResponder,
  // which the native gesture system invokes on a real touch event, never
  // during render. The rule's static analysis can't see that the read is
  // inside a callback that isn't itself called synchronously here.
  /* eslint-disable react-hooks/refs */
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => {
          resetTimerRef.current?.();
          return false;
        },
        onMoveShouldSetPanResponder: () => {
          resetTimerRef.current?.();
          return false;
        },
      }),
    []
  );
  /* eslint-enable react-hooks/refs */

  useEffect(() => {
    if (user) {
      resetTimer(); // Start timer on login
    } else {
      // Clear timer on logout so it doesn't fire after user is gone
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [user, resetTimer]);

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default IdleTimer;
