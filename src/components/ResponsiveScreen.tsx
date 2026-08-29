import React, { ReactNode } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { colors } from '../theme';

// Above this width (roughly "small tablet and up" in portrait), content gets
// capped and centered instead of stretching edge-to-edge.
export const TABLET_BREAKPOINT = 768;
export const CONTENT_MAX_WIDTH = 700;
// Narrower cap for bottom sheets / modals — a full-width sheet on a 1024px
// iPad reads as a design mistake even where full-bleed screen content is fine.
export const SHEET_MAX_WIDTH = 480;

export function useIsTablet(): boolean {
  const { width } = useWindowDimensions();
  return width >= TABLET_BREAKPOINT;
}

interface ResponsiveScreenProps {
  children: ReactNode;
  backgroundColor?: string;
}

/**
 * Wraps a screen's content so it's capped to CONTENT_MAX_WIDTH and centered
 * on tablet-sized viewports, instead of stretching edge-to-edge. On phones
 * this is a no-op (full width, same as before).
 */
export default function ResponsiveScreen({ children, backgroundColor = colors.background }: ResponsiveScreenProps) {
  const isTablet = useIsTablet();
  return (
    <View style={[styles.outer, { backgroundColor }]}>
      <View style={[styles.inner, isTablet && styles.tabletInner]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
  },
  tabletInner: {
    maxWidth: CONTENT_MAX_WIDTH,
  },
});
