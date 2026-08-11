import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { getDashboardStats, DashboardStats } from '../api/dashboardService';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';
import WebAppBanner from '../components/WebAppBanner';
import type { MainTabScreenProps } from '../types/navigation';

type Props = MainTabScreenProps<'Dashboard'>;

export default function DashboardScreen(_props: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  const fetchDashboard = async () => {
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

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b5ff8" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  const formatCurrency = (amount?: number) => {
    return `₹${(amount || 0).toLocaleString('en-IN')}`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Good Day, {user?.name?.split(' ')[0]} 👋</Text>
        <Text style={styles.subtitle}>Here is your garage overview</Text>
      </View>

      <WebAppBanner />

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderLeftColor: '#3b82f6', borderLeftWidth: 4 }]}>
          <Text style={styles.statLabel}>Active Job Cards</Text>
          <Text style={styles.statValue}>{stats?.overview?.activeJobCards || 0}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#10b981', borderLeftWidth: 4 }]}>
          <Text style={styles.statLabel}>Today's Revenue</Text>
          <Text style={styles.statValue}>{formatCurrency(stats?.revenue?.today)}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#8b5cf6', borderLeftWidth: 4 }]}>
          <Text style={styles.statLabel}>Monthly Revenue</Text>
          <Text style={styles.statValue}>{formatCurrency(stats?.revenue?.month)}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#f59e0b', borderLeftWidth: 4 }]}>
          <Text style={styles.statLabel}>Pending Estimations</Text>
          <Text style={styles.statValue}>{stats?.overview?.pendingEstimations || 0}</Text>
        </View>
      </View>

      {/* Quick Overview List */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Overview</Text>
        <View style={styles.listItem}>
          <Text style={styles.listLabel}>Total Customers</Text>
          <Text style={styles.listValue}>{stats?.overview?.totalCustomers || 0}</Text>
        </View>
        <View style={styles.listItem}>
          <Text style={styles.listLabel}>Total Vehicles</Text>
          <Text style={styles.listValue}>{stats?.overview?.totalVehicles || 0}</Text>
        </View>
        <View style={styles.listItem}>
          <Text style={styles.listLabel}>Today's New Jobs</Text>
          <Text style={styles.listValue}>{stats?.overview?.todayJobCards || 0}</Text>
        </View>
        <View style={[styles.listItem, { borderBottomWidth: 0 }]}>
          <Text style={styles.listLabel}>In Progress</Text>
          <Text style={styles.listValue}>{stats?.overview?.inProgressJobs || 0}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdfcfb',
    padding: 16,
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
  header: {
    marginBottom: 20,
    marginTop: 8,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
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
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#6366f1',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  listLabel: {
    fontSize: 15,
    color: '#4b5563',
  },
  listValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  }
});
