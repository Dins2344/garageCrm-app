import React, { type ComponentProps } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface Props {
  icon: IconName;
  /** Announced by screen readers and used to find it in tests — the button has no visible text. */
  label: string;
  onPress: () => void;
}

/** An icon action for a navigation header's `headerRight`. */
export default function HeaderIconButton({ icon, label, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={s.button}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  button: { paddingHorizontal: spacing.md },
});
