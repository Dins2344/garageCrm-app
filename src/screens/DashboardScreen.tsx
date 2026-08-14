import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getDashboardStats, DashboardStats } from '../api/dashboardService';
import { useGarage } from '../context/GarageContext';
import Toast from 'react-native-toast-message';
import ResponsiveScreen from '../components/ResponsiveScreen';
import { TAB_BAR_CLEARANCE } from '../components/FloatingTabBar';
import type { MainTabScreenProps } from '../types/navigation';

type Props = MainTabScreenProps<'Dashboard'>;

// Mirrors StatusStepper's color scheme so a job status means the same
// color everywhere in the app.
const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  estimation_sent: 'Estimation Sent',
  approved: 'Approved',
  in_progress: 'In Progress',
  quality_check: 'Quality Check',
  ready_for_pickup: 'Ready for Pickup',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  new: '#3b82f6',
  estimation_sent: '#f59e0b',
  approved: '#8b5cf6',
  in_progress: '#ec4899',
  quality_check: '#06b6d4',
  ready_for_pickup: '#10b981',
  delivered: '#6b7280',
  cancelled: '#ef4444',
};

const BAR_MAX_HEIGHT = 110;

export default function DashboardScreen(_props: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { activeGarageId } = useGarage();

  const fetchStats = async () => {
    try {
      const { data } = await getDashboardStats();
      setStats(data);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load dashboard' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refetch on focus so the charts are current every time the tab is opened,
  // not just on first mount — same rationale as HomeScreen.
  useFocusEffect(
    useCallback(() => {
      fetchStats();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeGarageId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return (
      <ResponsiveScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b5ff8" />
          <Text style={styles.loadingText}>Loading Dashboard...</Text>
        </View>
      </ResponsiveScreen>
    );
  }

  const formatCurrency = (amount?: number) => `₹${(amount || 0).toLocaleString('en-IN')}`;

  const weeklyRevenue = stats?.weeklyRevenue || [];
  const maxWeekly = Math.max(1, ...weeklyRevenue.map(d => d.revenue));

  const statusEntries = Object.entries(stats?.jobStatusBreakdown || {}).filter(([, count]) => count > 0);
  const maxStatusCount = Math.max(1, ...statusEntries.map(([, count]) => count));

  const staffAchievement = [...(stats?.staffAchievement || [])]
    .sort((a, b) => b.totalLabor - a.totalLabor)
    .slice(0, 6);
  const maxStaffLabor = Math.max(1, ...staffAchievement.map(s => s.totalLabor));

  return (
    <ResponsiveScreen>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* ── Weekly Revenue ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Weekly Revenue</Text>
          {weeklyRevenue.length === 0 ? (
            <Text style={styles.emptyText}>No revenue data yet</Text>
          ) : (
            <View style={styles.barChartRow}>
              {weeklyRevenue.map((d, i) => {
                const barHeight = Math.max(4, (d.revenue / maxWeekly) * BAR_MAX_HEIGHT);
                return (
                  <View key={i} style={styles.barCol}>
                    <Text style={styles.barValue} numberOfLines={1}>
                      {d.revenue > 0 ? `₹${Math.round(d.revenue / 1000)}k` : ''}
                    </Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.bar, { height: barHeight }]} />
                    </View>
                    <Text style={styles.barLabel}>{d.label}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Job Status Breakdown ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Job Status Breakdown</Text>
          {statusEntries.length === 0 ? (
            <Text style={styles.emptyText}>No job cards yet</Text>
          ) : (
            statusEntries.map(([status, count]) => (
              <View key={status} style={styles.hBarRow}>
                <Text style={styles.hBarLabel} numberOfLines={1}>{STATUS_LABELS[status] || status}</Text>
                <View style={styles.hBarTrack}>
                  <View style={[
                    styles.hBarFill,
                    { width: `${(count / maxStatusCount) * 100}%`, backgroundColor: STATUS_COLORS[status] || '#3b5ff8' }
                  ]} />
                </View>
                <Text style={styles.hBarValue}>{count}</Text>
              </View>
            ))
          )}
        </View>

        {/* ── Staff Performance ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Staff Performance</Text>
          {staffAchievement.length === 0 ? (
            <Text style={styles.emptyText}>No completed jobs yet</Text>
          ) : (
            staffAchievement.map(s => (
              <View key={s._id} style={styles.staffRow}>
                <View style={styles.staffHeader}>
                  <Text style={styles.staffName} numberOfLines={1}>{s.staffName}</Text>
                  <Text style={styles.staffValue}>{formatCurrency(s.totalLabor)}</Text>
                </View>
                <View style={styles.hBarTrack}>
                  <View style={[
                    styles.hBarFill,
                    { width: `${(s.totalLabor / maxStaffLabor) * 100}%`, backgroundColor: '#3b5ff8' }
                  ]} />
                </View>
                <Text style={styles.staffMeta}>{s.jobCount} job{s.jobCount !== 1 ? 's' : ''}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </ResponsiveScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdfcfb',
  },
  content: {
    padding: 16,
    // Extra clearance for the floating dock tab bar.
    paddingBottom: TAB_BAR_CLEARANCE + 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#6366f1',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 20,
  },

  // Weekly revenue bar chart
  barChartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barValue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3b5ff8',
    marginBottom: 4,
  },
  barTrack: {
    width: 18,
    height: BAR_MAX_HEIGHT,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 18,
    borderRadius: 6,
    backgroundColor: '#3b5ff8',
  },
  barLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
    marginTop: 8,
  },

  // Horizontal bars (job status / staff)
  hBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  hBarLabel: {
    width: 96,
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '600',
  },
  hBarTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f3f4f6',
    overflow: 'hidden',
  },
  hBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  hBarValue: {
    width: 28,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'right',
  },

  // Staff performance
  staffRow: {
    marginBottom: 16,
  },
  staffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  staffName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  staffValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#3b5ff8',
  },
  staffMeta: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
});
