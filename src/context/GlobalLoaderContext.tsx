import React, { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

/**
 * A full-screen "working" overlay for actions that have no button to put a
 * spinner in — everything launched from an `Alert` confirm (delete a
 * customer, generate an invoice, cancel an invoice) and branch switching.
 * Mirrors the web app's `useGlobalLoader().withLoader()`.
 *
 * Where there IS a button, keep using its own `loading` prop: an inline
 * spinner is more precise than covering the screen. This is for the gap
 * between a confirm tap and its toast, where the app used to sit inert and a
 * second tap could fire the request twice.
 *
 * Rendered as a `Modal` so it sits above an open bottom sheet; a plain
 * absolutely-positioned View would be hidden behind RN's native modal layer.
 * Reference-counted, so two overlapping calls show one overlay and it clears
 * only when the last one finishes.
 */

interface GlobalLoaderValue {
  /** Runs `fn` with the overlay up; the overlay clears whether it resolves or throws. */
  withLoader: <T>(fn: () => Promise<T>, label?: string) => Promise<T>;
  busy: boolean;
}

const GlobalLoaderContext = createContext<GlobalLoaderValue | null>(null);

export function GlobalLoaderProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const [label, setLabel] = useState<string | undefined>(undefined);
  const labelRef = useRef<string | undefined>(undefined);

  const withLoader = useCallback(async <T,>(fn: () => Promise<T>, text?: string): Promise<T> => {
    if (text) {
      labelRef.current = text;
      setLabel(text);
    }
    setCount(c => c + 1);
    try {
      return await fn();
    } finally {
      setCount(c => {
        const next = c - 1;
        if (next === 0) {
          labelRef.current = undefined;
          setLabel(undefined);
        }
        return next;
      });
    }
  }, []);

  const busy = count > 0;
  const value = useMemo(() => ({ withLoader, busy }), [withLoader, busy]);

  return (
    <GlobalLoaderContext.Provider value={value}>
      {children}
      <Modal visible={busy} transparent animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
        <View style={styles.overlay} testID="global-loader" accessibilityLiveRegion="polite">
          <View style={styles.card}>
            <ActivityIndicator size="large" color={colors.primary} />
            {label ? <Text style={styles.label}>{label}</Text> : null}
          </View>
        </View>
      </Modal>
    </GlobalLoaderContext.Provider>
  );
}

// A screen rendered without the provider (a unit test, a storybook) just runs
// the action with no overlay rather than throwing — App.tsx always mounts it.
const passthrough: GlobalLoaderValue = { withLoader: fn => fn(), busy: false };

export const useGlobalLoader = (): GlobalLoaderValue => useContext(GlobalLoaderContext) ?? passthrough;

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.xl, paddingVertical: 24, paddingHorizontal: 32,
    alignItems: 'center', gap: 12, minWidth: 140
  },
  label: { fontSize: 15, fontWeight: '600', color: colors.textPrimary }
});
