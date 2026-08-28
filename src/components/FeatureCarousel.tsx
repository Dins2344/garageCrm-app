import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, BackHandler,
  useWindowDimensions, type LayoutChangeEvent,
  type NativeSyntheticEvent, type NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryBtn } from './FormControls';
import { CONTENT_MAX_WIDTH, useIsTablet } from './ResponsiveScreen';
import type { TourSlide } from './tourSlides';
import { colors, radius, spacing, type } from '../theme';

interface FeatureCarouselProps {
  slides: TourSlide[];
  onDone: () => void;
  /** Omitted = no Skip link. The replay route exits via the header back button. */
  onSkip?: () => void;
  doneLabel?: string;
}

/**
 * The walkthrough's pager. Presentational only — no storage, no navigation, no
 * API — so it stays testable and obeys the components-take-props rule.
 *
 * **Built on a core-RN FlatList, deliberately.** `react-native-reanimated`,
 * `react-native-gesture-handler` and `react-native-pager-view` are all absent
 * from this app, and each would mean a new native module, a fresh EAS build and
 * a store submission for what amounts to cosmetic parallax.
 */
export default function FeatureCarousel({ slides, onDone, onSkip, doneLabel = 'Get started' }: FeatureCarouselProps) {
  const { width } = useWindowDimensions();
  const isTablet = useIsTablet();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<TourSlide>>(null);
  const [index, setIndex] = useState(0);

  // Seeded from the window so the very first frame is already the right width —
  // the list is never withheld pending a measurement, so there is no blank
  // frame. onLayout is the authority afterwards, and that is what keeps pages
  // aligned through a rotation and inside ResponsiveScreen's tablet cap. A
  // stale width is the classic failure of a hand-rolled pager: two half-slides
  // side by side.
  const [pageWidth, setPageWidth] = useState(() => (isTablet ? Math.min(width, CONTENT_MAX_WIDTH) : width));

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0) setPageWidth(prev => (prev === w ? prev : w));
  }, []);

  const isLast = index >= slides.length - 1;

  const goTo = useCallback((i: number) => {
    // Sets state as well as scrolling, so the dots stay correct even where the
    // momentum callback does not fire (programmatic scroll, zero-velocity release).
    setIndex(i);
    listRef.current?.scrollToIndex({ index: i, animated: true });
  }, []);

  // `pagingEnabled` guarantees a settled scroll lands exactly on a page
  // boundary, so rounding the offset is exact rather than heuristic.
  // onViewableItemsChanged would need a stable ref for both the callback and
  // its viewabilityConfig — RN throws otherwise — and buys nothing over this.
  const handleMomentumEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / pageWidth));
  }, [pageWidth]);

  // Android back steps back through the deck rather than leaving the app
  // mid-tour. On the first slide we return false so the OS does its usual
  // thing — which on the pre-auth intro (the root view, no navigator beneath)
  // correctly exits.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (index > 0) {
        goTo(index - 1);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [index, goTo]);

  // Required for scrollToIndex to be safe on an item the list has not measured.
  const getItemLayout = useCallback(
    (_: ArrayLike<TourSlide> | null | undefined, i: number) =>
      ({ length: pageWidth, offset: pageWidth * i, index: i }),
    [pageWidth]
  );

  const keyExtractor = useCallback((slide: TourSlide) => slide.key, []);

  const renderItem = useCallback(({ item }: { item: TourSlide }) => (
    <View style={[styles.slide, { width: pageWidth }]}>
      <View style={[styles.iconDisc, { backgroundColor: item.tintBg }]}>
        <Ionicons name={item.icon} size={40} color={item.tint} />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.body}>{item.body}</Text>
      <View style={styles.points}>
        {item.points.map(point => (
          <View key={point.text} style={styles.point}>
            <Ionicons name={point.icon} size={18} color={item.tint} style={styles.pointIcon} />
            <Text style={styles.pointText}>{point.text}</Text>
          </View>
        ))}
      </View>
    </View>
  ), [pageWidth]);

  return (
    // The pre-auth intro renders outside NavigationContainer, so there is no
    // header and no inset — without this the title sits under the status bar.
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.topBar}>
        {onSkip ? (
          <TouchableOpacity onPress={onSkip} hitSlop={10} testID="feature-carousel-skip">
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        onMomentumScrollEnd={handleMomentumEnd}
        onLayout={handleLayout}
        testID="feature-carousel-list"
      />

      <View style={styles.footer}>
        <View
          style={styles.dots}
          accessible
          accessibilityLabel={`Step ${index + 1} of ${slides.length}`}
        >
          {slides.map((slide, i) => (
            <View key={slide.key} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <PrimaryBtn
          label={isLast ? doneLabel : 'Next'}
          icon={isLast ? 'checkmark' : 'arrow-forward'}
          onPress={() => (isLast ? onDone() : goTo(index + 1))}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: { height: 44, justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: spacing.xl },
  skip: { fontSize: type.body, fontWeight: '600', color: colors.textMuted },

  slide: { paddingHorizontal: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  iconDisc: {
    width: 92, height: 92, borderRadius: radius.xxl,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xxl,
  },
  title: {
    fontSize: type.display, fontWeight: 'bold', color: colors.textPrimary,
    textAlign: 'center', marginBottom: spacing.md,
  },
  body: {
    fontSize: type.bodyLarge, color: colors.textSecondary, textAlign: 'center',
    lineHeight: 22, marginBottom: spacing.xxl,
  },
  points: { alignSelf: 'stretch', gap: spacing.md },
  point: { flexDirection: 'row', alignItems: 'flex-start' },
  pointIcon: { marginRight: spacing.md, marginTop: 1 },
  pointText: { flex: 1, fontSize: type.body, color: colors.textSecondary, lineHeight: 20 },

  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  dot: { width: 7, height: 7, borderRadius: radius.sm, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 22 },
});
