import React, { useState } from 'react';
import { Animated, StyleSheet, View, type DimensionValue } from 'react-native';
import { colors, radius } from '../theme';

/**
 * A placeholder block that pulses while content loads.
 *
 * Stands in for the *shape* of what is coming — a row of label and value, a
 * card, a line of text — so the layout does not jump when the data lands. A
 * lone spinner in an empty card tells the reader nothing about what to expect
 * and shifts everything below it when it resolves.
 */
interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  /** Defaults to the app's small radius; pass `radius.pill` for a chip. */
  borderRadius?: number;
  style?: object;
}

// One shared driver so every block on a screen pulses in step — staggered
// pulses read as activity, in-step ones read as "loading".
let sharedPulse: Animated.Value | null = null;
const pulse = (): Animated.Value => {
  if (!sharedPulse) {
    sharedPulse = new Animated.Value(0.45);
    Animated.loop(
      Animated.sequence([
        Animated.timing(sharedPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(sharedPulse, { toValue: 0.45, duration: 700, useNativeDriver: true })
      ])
    ).start();
  }
  return sharedPulse;
};

export function Skeleton({ width = '100%', height = 14, borderRadius = radius.sm, style }: SkeletonProps) {
  // `useState` rather than `useRef().current` — the React Compiler lint
  // rejects reading a ref during render.
  const [opacity] = useState(pulse);
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.block, { width, height, borderRadius, opacity }, style]}
    />
  );
}

/**
 * The shape of a label/value list — what `InfoRow` renders once loaded.
 * `rows` should match the real row count so nothing moves on arrival.
 */
export function SkeletonRows({ rows, testID }: { rows: number; testID?: string }) {
  return (
    <View testID={testID}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={[styles.row, i === rows - 1 && { borderBottomWidth: 0 }]}>
          <Skeleton width={i % 3 === 0 ? 88 : 64} height={12} />
          <Skeleton width={i % 2 === 0 ? 120 : 96} height={12} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.surfaceSunken },
  // 15 + 12 + 15 = 42, the height of an InfoRow (11 + ~20 line + 11).
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.surfaceSunken
  }
});

/** Test hook: reset the shared driver between renders. */
export const __resetSkeletonPulse = () => { sharedPulse = null; };
