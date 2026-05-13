import React, { useEffect, useRef, useCallback } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

const IDLE_TIME_LIMIT = 10 * 60 * 1000; // 10 minutes

const IdleTimer = ({ children }) => {
  const { user, logout } = useAuth();
  const timerRef = useRef(null);

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

  // Use PanResponder to detect any touch on the screen
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetResponderCapture: () => {
        resetTimer();
        return false; // Don't capture, just observe
      },
      onMoveShouldSetResponderCapture: () => {
        resetTimer();
        return false;
      },
    })
  ).current;

  useEffect(() => {
    if (user) {
      resetTimer();
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
