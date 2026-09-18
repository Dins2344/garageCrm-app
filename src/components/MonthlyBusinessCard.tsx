import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getMonthlyMetrics } from '../api/dashboardService';
import { useGarage } from '../context/GarageContext';
import { useDebounce } from '../hooks/useDebounce';
import { formatMoney } from '../utils/format';
import { currentMonthKey } from '../utils/months';
import { EXPENSE_CATEGORY_LABEL } from '../utils/expenseOptions';
import MonthStepper from './MonthStepper';
import { Skeleton } from './Skeleton';
import type { MonthlyMetrics } from '../types/models';
import type { RootStackParamList } from '../types/navigation';
import { colors, palette, radius } from '../theme';

/** Whole-percent change against last month; null when last month was zero. */
const changeVsPrevious = (current: number, previous: number): number | null => {
  if (!previous) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
};

function Delta({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) {
  const pct = changeVsPrevious(current, previous);
  if (pct === null) return <Text style={styles.deltaMuted}>No figure last month</Text>;
  // For expenses, up is the bad direction.
  const good = invert ? pct <= 0 : pct >= 0;
  return (
    <View style={styles.deltaRow}>
      <Ionicons name={pct >= 0 ? 'trending-up-outline' : 'trending-down-outline'} size={13} color={good ? palette.emerald700 : colors.danger} />
      <Text style={[styles.delta, { color: good ? palette.emerald700 : colors.danger }]}>
        {pct > 0 ? '+' : ''}{pct}% vs last month
      </Text>
    </View>
  );
}

/**
 * The month's business figures on the Dashboard tab: revenue, services,
 * expenses, net profit, each against last month, and where the expenses
 * went. Owner/admin only; the caller gates it and the API refuses others.
 */
export default function MonthlyBusinessCard() {
  const { locale, activeGarageId } = useGarage();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [month, setMonth] = useState(currentMonthKey());
  // Ten taps on the arrow are one request, for the month the taps end on.
  const debouncedMonth = useDebounce(month, 350);
  const [metrics, setMetrics] = useState<MonthlyMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMonthlyMetrics(debouncedMonth)
      .then(res => { if (!cancelled) setMetrics(res.data); })
      .catch(() => { if (!cancelled) Toast.show({ type: 'error', text1: 'Failed to load monthly figures' }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedMonth, activeGarageId]);

  const money = (n: number) => formatMoney(n, locale);
  const profitPositive = (metrics?.netProfit ?? 0) >= 0;

  return (
    <View style={styles.card} testID="monthly-business">
      <View style={styles.header}>
        <Text style={styles.cardTitle}>Business this month</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Expenses')} accessibilityRole="button" testID="manage-expenses">
          <Text style={styles.link}>Expenses</Text>
        </TouchableOpacity>
      </View>
      <MonthStepper value={month} onChange={setMonth} locale={locale.locale} />

      {loading && !metrics ? (
        <View style={styles.grid} testID="monthly-skeleton">
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={styles.tile}>
              <Skeleton width={80} height={12} />
              <Skeleton width={110} height={20} style={{ marginTop: 10 }} />
            </View>
          ))}
        </View>
      ) : metrics && (
        <>
          <View style={styles.grid}>
            <View style={styles.tile} testID="metric-revenue">
              <View style={[styles.tileIcon, { backgroundColor: `${colors.success}15` }]}>
                <Ionicons name="cash-outline" size={16} color={colors.success} />
              </View>
              <Text style={styles.tileLabel}>Total revenue</Text>
              <Text style={styles.tileValue}>{money(metrics.revenue)}</Text>
              <Delta current={metrics.revenue} previous={metrics.previous.revenue} />
            </View>
            <View style={styles.tile} testID="metric-services">
              <View style={[styles.tileIcon, { backgroundColor: `${colors.info}15` }]}>
                <Ionicons name="checkmark-done-outline" size={16} color={colors.info} />
              </View>
              <Text style={styles.tileLabel}>Services completed</Text>
              <Text style={styles.tileValue}>{metrics.services}</Text>
              <Delta current={metrics.services} previous={metrics.previous.services} />
            </View>
            <View style={styles.tile} testID="metric-expenses">
              <View style={[styles.tileIcon, { backgroundColor: `${colors.danger}15` }]}>
                <Ionicons name="wallet-outline" size={16} color={colors.danger} />
              </View>
              <Text style={styles.tileLabel}>Total expenses</Text>
              <Text style={styles.tileValue}>{money(metrics.expenses)}</Text>
              <Delta current={metrics.expenses} previous={metrics.previous.expenses} invert />
            </View>
            <View style={styles.tile} testID="metric-profit">
              <View style={[styles.tileIcon, { backgroundColor: `${profitPositive ? palette.emerald700 : colors.danger}15` }]}>
                <Ionicons name={profitPositive ? 'trending-up-outline' : 'trending-down-outline'} size={16} color={profitPositive ? palette.emerald700 : colors.danger} />
              </View>
              <Text style={styles.tileLabel}>{profitPositive ? 'Net profit' : 'Net loss'}</Text>
              <Text style={[styles.tileValue, !profitPositive && { color: colors.danger }]}>{money(Math.abs(metrics.netProfit))}</Text>
              <Delta current={metrics.netProfit} previous={metrics.previous.netProfit} />
            </View>
          </View>

          {metrics.expensesByCategory.length > 0 && (
            <View style={styles.breakdown}>
              <Text style={styles.breakdownTitle}>Where the money went</Text>
              {metrics.expensesByCategory.map(row => {
                const share = metrics.expenses ? Math.round((row.total / metrics.expenses) * 100) : 0;
                return (
                  <View key={row.category} style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel} numberOfLines={1}>{EXPENSE_CATEGORY_LABEL[row.category] || row.category}</Text>
                    <View style={styles.barTrack}><View style={[styles.barFill, { width: `${share}%` }]} /></View>
                    <Text style={styles.breakdownValue}>{money(row.total)}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, marginBottom: 16,
    shadowColor: colors.shadowAmbient, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  link: { fontSize: 13, fontWeight: '700', color: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  tile: { width: '48%', flexGrow: 1, backgroundColor: colors.background, borderRadius: radius.md, padding: 12 },
  tileIcon: { width: 28, height: 28, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileLabel: { fontSize: 12, color: colors.textMuted },
  tileValue: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginTop: 4 },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  delta: { fontSize: 11, fontWeight: '600' },
  deltaMuted: { fontSize: 11, color: colors.textFaint, marginTop: 6 },
  breakdown: { marginTop: 16 },
  breakdownTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  breakdownLabel: { width: 110, fontSize: 12, color: colors.textSecondary },
  barTrack: { flex: 1, height: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: colors.danger },
  breakdownValue: { width: 90, textAlign: 'right', fontSize: 12, fontWeight: '700', color: colors.textPrimary },
});
