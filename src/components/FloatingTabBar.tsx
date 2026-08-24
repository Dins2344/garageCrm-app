import React, { ComponentProps } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, palette } from '../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const ACTIVE = colors.primary;
const INACTIVE = colors.textFaint;

/**
 * Vertical space the floating dock occupies, worst-case (tallest home
 * indicator). Tab screens use this to keep FABs above the dock and to pad
 * scrollable content so the last row isn't trapped behind it — the dock is
 * absolutely positioned, so it reserves no layout space of its own.
 */
export const TAB_BAR_CLEARANCE = 130;

// Icon + label per tab route. Keeping this here (rather than in each screen's
// options) keeps the whole dock's appearance in one place.
const TAB_META: Record<string, { label: string; icon: IconName; iconFocused: IconName }> = {
  JobCards:  { label: 'Job Cards', icon: 'clipboard-outline',    iconFocused: 'clipboard' },
  Vehicles:  { label: 'Vehicles',  icon: 'car-sport-outline',    iconFocused: 'car-sport' },
  Home:      { label: 'Home',      icon: 'home-outline',         iconFocused: 'home' },
  Dashboard: { label: 'Dashboard', icon: 'stats-chart-outline',  iconFocused: 'stats-chart' },
  More:      { label: 'More',      icon: 'menu-outline',         iconFocused: 'menu' },
};

/**
 * Custom floating "dock" tab bar.
 *
 * Built as a custom `tabBar` renderer rather than styling the built-in one
 * via `tabBarStyle`: the library composes its own `position`/`padding`/height
 * styles around the user style, which made reliably insetting the bar from
 * the screen edges fragile. Owning the whole view removes that ambiguity.
 *
 * Because it's absolutely positioned, it no longer reserves layout space —
 * scrollable tab screens carry extra bottom padding, and FABs are lifted, to
 * clear it (see HomeScreen / JobCardsScreen / VehiclesScreen / MoreScreen).
 */
export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.dock,
        // Sit above the gesture bar / home indicator rather than under it.
        { bottom: Math.max(insets.bottom, 12) + 8 },
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const meta = TAB_META[route.name];
        const { options } = descriptors[route.key];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? meta?.label}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tab}
            activeOpacity={0.7}
          >
            {/* Active state is carried by icon fill + color alone (no
                background pill) — the filled variant plus the blue tint on
                icon and label is enough emphasis. */}
            <Ionicons
              name={focused ? (meta?.iconFocused ?? 'ellipse') : (meta?.icon ?? 'ellipse-outline')}
              size={22}
              color={focused ? ACTIVE : INACTIVE}
            />
            <Text
              style={[styles.label, focused ? styles.labelActive : styles.labelInactive]}
              numberOfLines={1}
            >
              {meta?.label ?? route.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    borderRadius: 24,
    // Clean white surface, separated from the near-white page
    // (colors.background) by the app's signature indigo shadow
    // (colors.shadowAmbient — used on every card here)
    // plus a cool hairline border, rather than a muddy grey fill. A tinted
    // shadow reads as premium where a flat grey one reads as generic.
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: palette.boneCooler,
    paddingHorizontal: 6,
    shadowColor: colors.shadowAmbient,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.1,
  },
  labelActive: {
    color: ACTIVE,
    fontWeight: '800',
  },
  labelInactive: {
    color: INACTIVE,
    fontWeight: '600',
  },
});
