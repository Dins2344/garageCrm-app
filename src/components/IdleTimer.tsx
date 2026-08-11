import React, { useEffect, useRef, useCallback, ReactNode } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

const IDLE_TIME_LIMIT = 10 * 60 * 1000; // 10 minutes

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
      }, IDLE_TIME_LIMIT);
    }
  }, [user, logout]);

  // Always keep a ref to the latest resetTimer.
  // PanResponder is created once — without this ref it would hold
  // a stale closure and never actually reset the timer on touches.
  const resetTimerRef = useRef(resetTimer);
  useEffect(() => {
    resetTimerRef.current = resetTimer;
  }, [resetTimer]);

  // PanResponder created once; reads from resetTimerRef so it always
  // calls the current version regardless of re-renders.
  // Uses the correct PanResponder callback names (not the Responder API).
  // Returning false lets touches pass through to child components normally.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        resetTimerRef.current?.();
        return false;
      },
      onMoveShouldSetPanResponder: () => {
        resetTimerRef.current?.();
        return false;
      },
    })
  ).current;

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
