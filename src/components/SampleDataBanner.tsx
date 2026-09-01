import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRemoveSampleData } from '../hooks/useRemoveSampleData';
import { colors, palette, radius } from '../theme';

interface RemoveButtonProps {
  /** Refetch whatever told the caller sample data existed. */
  onRemoved: () => void;
}

/**
 * The Remove control on its own, so Settings can offer the same action without
 * the banner's explanatory copy wrapped around it.
 */
export function SampleDataRemoveButton({ onRemoved }: RemoveButtonProps) {
  const { removing, confirmAndRemove } = useRemoveSampleData(onRemoved);

  return (
    <TouchableOpacity
      onPress={confirmAndRemove}
      disabled={removing}
      style={s.removeBtn}
      activeOpacity={0.7}
      testID="sample-data-remove"
      accessibilityLabel="Remove sample data"
    >
      {removing
        ? <ActivityIndicator size="small" color={colors.warning} />
        : <Text style={s.removeText}>Remove</Text>}
    </TouchableOpacity>
  );
}

interface Props extends RemoveButtonProps {
  /** True while the current garage still holds seeded rows. */
  visible: boolean;
}

/**
 * Tells the owner the numbers on screen are demo data, and offers to clear it.
 *
 * **Deliberately not dismissible**, unlike `WebAppBanner`. A dismissible banner
 * gets waved away on day one and the sample rows then sit in the customer list
 * unlabelled forever, which is how someone ends up phoning "Rahul Sharma". This
 * one leaves when the data actually leaves. Settings carries the same action for
 * anyone who arrives at it later.
 */
export default function SampleDataBanner({ visible, onRemoved }: Props) {
  if (!visible) return null;

  return (
    <View style={s.banner} testID="sample-data-banner">
      <View style={s.iconWrap}>
        <Ionicons name="flask-outline" size={20} color={colors.warning} />
      </View>
      <View style={s.textWrap}>
        <Text style={s.title}>Sample data</Text>
        <Text style={s.subtitle}>Example records so you can look around. Remove them when you are ready.</Text>
      </View>
      <SampleDataRemoveButton onRemoved={onRemoved} />
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.amber100,
    marginBottom: 16,
    padding: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: palette.amber100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  removeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    // An operable control takes the control-edge token, not the divider one.
    borderColor: colors.borderStrong,
    minWidth: 76,
    alignItems: 'center',
  },
  removeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.warning,
  },
});
