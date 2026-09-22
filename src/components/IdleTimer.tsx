import React, { useEffect, ReactNode } from 'react';
import { View, PanResponder, StyleSheet, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { getMe } from '../api/authService';
import { IDLE_TIMEOUT_MS, KEEP_ALIVE_MS, LAST_ACTIVITY_KEY } from '../utils/constants';

const CHECK_EVERY_MS = 30 * 1000;
// A touch this soon after the last persisted one is not worth a storage write.
const PERSIST_THROTTLE_MS = 30 * 1000;

// Module state rather than refs: there is one IdleTimer per app, and the
// PanResponder (created once) must read the latest value without a
// ref-in-render dance the React compiler rules reject.
let lastTouch = 0;
let lastPersisted = 0;

const touch = () => {
  const now = Date.now();
  lastTouch = now;
  if (now - lastPersisted > PERSIST_THROTTLE_MS) {
    lastPersisted = now;
    AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(now)).catch(() => {});
  }
};

// Returning false lets touches pass through to child components normally.
const panResponder = PanResponder.create({
  onStartShouldSetPanResponder: () => { touch(); return false; },
  onMoveShouldSetPanResponder: () => { touch(); return false; },
});

/**
 * Signs the user out after IDLE_TIMEOUT_MS without a touch, and pings the
 * server while they are active so its sliding token stays alive.
 *
 * The last touch is kept in memory and mirrored (throttled) to AsyncStorage:
 * the copy is what lets AuthContext apply the same rule on a cold start, and
 * the foreground check is what applies it when the app was merely
 * backgrounded — JS timers do not run there, so the interval alone would
 * let a phone that sat in a pocket for an hour come back signed in.
 */
const IdleTimer = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();

  useEffect(() => {
    if (!user) return;
    touch();
    let lastKeepAlive = Date.now();

    const check = () => {
      const now = Date.now();
      if (now - lastTouch > IDLE_TIMEOUT_MS) {
        logout();
      } else if (now - lastKeepAlive > KEEP_ALIVE_MS) {
        lastKeepAlive = now;
        getMe().catch(() => logout());
      }
    };

    const interval = setInterval(check, CHECK_EVERY_MS);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      clearInterval(interval);
      appState.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <View style={styles.container} testID="idle-timer" {...panResponder.panHandlers}>
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
