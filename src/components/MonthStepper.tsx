import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { currentMonthKey, monthLabel, shiftMonth } from '../utils/months';
import { colors, radius } from '../theme';

interface MonthStepperProps {
  /** YYYY-MM */
  value: string;
  onChange: (month: string) => void;
  locale: string;
  /** Months after this one are not offered; defaults to the current month. */
  max?: string;
}

/**
 * Step through months one at a time. Two arrows and a label rather than a
 * date range picker, because "this month, last month, the one before" is
 * the whole question an owner asks of their figures.
 */
export default function MonthStepper({ value, onChange, locale, max = currentMonthKey() }: MonthStepperProps) {
  const atMax = value >= max;
  return (
    <View style={styles.row} testID="month-stepper">
      <TouchableOpacity
        style={styles.btn}
        onPress={() => onChange(shiftMonth(value, -1))}
        accessibilityRole="button"
        accessibilityLabel="Previous month"
        testID="month-prev"
      >
        <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
      <Text style={styles.label} testID="month-label">{monthLabel(value, locale)}</Text>
      <TouchableOpacity
        style={[styles.btn, atMax && styles.btnDisabled]}
        onPress={() => onChange(shiftMonth(value, 1))}
        disabled={atMax}
        accessibilityRole="button"
        accessibilityLabel="Next month"
        accessibilityState={{ disabled: atMax }}
        testID="month-next"
      >
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
  },
  btn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  btnDisabled: { opacity: 0.35 },
  label: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
});
