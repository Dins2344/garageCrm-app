import React, { useState, useCallback, ComponentProps } from 'react';
import { formatMoney, formatNumber, formatDate as fmtDate } from '../utils/format';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity,
  Modal, SafeAreaView, StatusBar, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getDashboardStats, DashboardStats } from '../api/dashboardService';
import { useAuth } from '../context/AuthContext';
import { useGarage } from '../context/GarageContext';
import Toast from 'react-native-toast-message';
import WebAppBanner from '../components/WebAppBanner';
import ResponsiveScreen, { SHEET_MAX_WIDTH } from '../components/ResponsiveScreen';
import { TAB_BAR_CLEARANCE } from '../components/FloatingTabBar';
import type { MainTabScreenProps } from '../types/navigation';
import type { Garage, Role } from '../types/models';

type Props = MainTabScreenProps<'Home'>;
type IconName = ComponentProps<typeof Ionicons>['name'];

interface ShortcutItem {
  label: string;
  icon: IconName;
  color: string;
  bg: string;
  onPress: () => void;
  roles?: Role[];
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

interface BranchSwitcherProps {
  garages: Garage[];
  activeGarageId: string | null;
  onSwitch: (garageId: string) => void;
}

// Defined at module scope — see the identical note elsewhere in this app
// (e.g. AddBranchModal in SettingsScreen.tsx): a component defined inside
// another component's render body loses state on every re-render.
function BranchSwitcher({ garages, activeGarageId, onSwitch }: BranchSwitcherProps) {
  const [visible, setVisible] = useState(false);
  const activeGarage = garages.find(g => g._id === activeGarageId);

  return (
    <>
      <TouchableOpacity style={styles.branchSwitcher} activeOpacity={0.7} onPress={() => setVisible(true)}>
        <View style={styles.branchSwitcherIcon}>
          <Ionicons name="business" size={16} color="#3b5ff8" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.branchSwitcherLabel}>Active Branch</Text>
          <Text style={styles.branchSwitcherName} numberOfLines={1}>{activeGarage?.name || 'Select branch'}</Text>
        </View>
        <Ionicons name="chevron-down" size={18} color="#9ca3af" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Switch Branch</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled">
              {garages.map(g => {
                const isActive = g._id === activeGarageId;
                return (
                  <TouchableOpacity
                    key={g._id}
                    style={[styles.branchOption, isActive && styles.branchOptionActive]}
                    onPress={() => { onSwitch(g._id); setVisible(false); }}
                    activeOpacity={0.6}
                  >
                    <Ionicons name={isActive ? 'radio-button-on' : 'radio-button-off'} size={20} color={isActive ? '#3b5ff8' : '#9ca3af'} />
                    <Text style={[styles.branchOptionText, isActive && styles.branchOptionTextActive]} numberOfLines={1}>
                      {g.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function HomeScreen({ navigation }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user, hasRole } = useAuth();
  const { activeGarageId, garages, switchGarage, locale } = useGarage();

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

  // Refetch every time the screen comes into focus (not just on mount), so
  // "Today's Status" and the stats reflect anything done elsewhere in the app
  // — e.g. creating a job card or approving an estimation — the moment the
  // user lands back on Home. Same pattern as JobCardsScreen/InvoicesScreen.
  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeGarageId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  if (loading) {
    return (
      <ResponsiveScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b5ff8" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </ResponsiveScreen>
    );
  }

  const formatCurrency = (amount?: number) => formatMoney(amount, locale);

  const activeGarageName = garages.find(g => g._id === activeGarageId)?.name;
  const pendingEstimations = stats?.overview?.pendingEstimations || 0;
  const activeJobCards = stats?.overview?.activeJobCards || 0;
  const remindersCount = stats?.upcomingReminders?.length || 0;

  // The hero status card adapts to what actually needs attention right now,
  // rather than showing a static/generic message.
  let statusTitle = 'All Clear';
  let statusMessage = 'No active jobs right now — a great time to catch up.';
  let statusIcon: IconName = 'checkmark-circle';
  if (pendingEstimations > 0) {
    statusTitle = 'Action Needed';
    statusMessage = `${pendingEstimations} estimation${pendingEstimations > 1 ? 's' : ''} awaiting your approval`;
    statusIcon = 'alert-circle';
  } else if (activeJobCards > 0) {
    statusTitle = 'All Good';
    statusMessage = `${activeJobCards} active job${activeJobCards > 1 ? 's' : ''} in progress`;
    statusIcon = 'construct';
  }

  const quickActions: ShortcutItem[] = [
    { label: 'New Job Card', icon: 'add-circle', color: '#3b5ff8', bg: '#eff2ff', onPress: () => navigation.navigate('CreateJobCard'), roles: ['owner', 'admin', 'service_advisor'] },
    { label: 'Job Cards', icon: 'clipboard', color: '#8b5cf6', bg: '#f5f3ff', onPress: () => navigation.navigate('JobCards') },
    { label: 'Vehicles', icon: 'car-sport', color: '#10b981', bg: '#f0fdf4', onPress: () => navigation.navigate('Vehicles') },
    { label: 'Customers', icon: 'people', color: '#f59e0b', bg: '#fffbeb', onPress: () => navigation.navigate('Customers'), roles: ['owner', 'admin', 'service_advisor', 'receptionist'] },
  ];

  const manageActions: ShortcutItem[] = [
    { label: 'Invoices', icon: 'document-text', color: '#ec4899', bg: '#fdf2f8', onPress: () => navigation.navigate('Invoices') },
    { label: 'Staff', icon: 'people-circle', color: '#06b6d4', bg: '#ecfeff', onPress: () => navigation.navigate('Staff'), roles: ['owner', 'admin'] },
    { label: 'Settings', icon: 'settings', color: '#6b7280', bg: '#f3f4f6', onPress: () => navigation.navigate('Settings') },
  ];

  const visibleQuickActions = quickActions.filter(item => !item.roles || hasRole(...item.roles));
  const visibleManageActions = manageActions.filter(item => !item.roles || hasRole(...item.roles));

  return (
    <ResponsiveScreen>
    <SafeAreaView style={styles.safeArea}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* ── Header ── */}
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetingSmall}>{getGreeting()}, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.greetingBold} numberOfLines={1}>{activeGarageName || 'Your Garage'}</Text>
        </View>
        <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Settings')} activeOpacity={0.8}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Branch switcher (owners only) ── */}
      {hasRole('owner') && (
        <BranchSwitcher garages={garages} activeGarageId={activeGarageId} onSwitch={switchGarage} />
      )}

      {/* ── Status hero card ── */}
      <View style={styles.statusCard}>
        <View style={styles.statusCircle1} />
        <View style={styles.statusCircle2} />
        <View style={{ flex: 1 }}>
          <Text style={styles.statusLabel}>Today's Status</Text>
          <Text style={styles.statusTitle}>{statusTitle}</Text>
          <Text style={styles.statusMessage}>{statusMessage}</Text>
        </View>
        <View style={styles.statusIconWrap}>
          <Ionicons name={statusIcon} size={36} color="#fff" />
        </View>
      </View>

      <WebAppBanner />

      {/* ── Quick Actions ── */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.shortcutRow}>
        {visibleQuickActions.map(item => (
          <TouchableOpacity key={item.label} style={styles.shortcutItem} activeOpacity={0.7} onPress={item.onPress}>
            <View style={[styles.shortcutIconWrap, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={24} color={item.color} />
            </View>
            <Text style={styles.shortcutLabel} numberOfLines={1}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Manage ── */}
      {visibleManageActions.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Manage</Text>
          <View style={styles.shortcutRow}>
            {visibleManageActions.map(item => (
              <TouchableOpacity key={item.label} style={styles.shortcutItem} activeOpacity={0.7} onPress={item.onPress}>
                <View style={[styles.shortcutIconWrap, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon} size={24} color={item.color} />
                </View>
                <Text style={styles.shortcutLabel} numberOfLines={1}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* ── Reminders nudge ── */}
      {remindersCount > 0 && (
        <View style={styles.reminderCard}>
          <View style={styles.reminderIconWrap}>
            <Ionicons name="calendar" size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reminderTitle}>{remindersCount} Service{remindersCount > 1 ? 's' : ''} Due Soon</Text>
            <Text style={styles.reminderSub}>Reach out to these customers for their next service</Text>
          </View>
        </View>
      )}

      {/* ── Stats ── */}
      <Text style={styles.sectionTitle}>Snapshot</Text>
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderLeftColor: '#3b82f6', borderLeftWidth: 4 }]}>
          <Text style={styles.statLabel}>Active Job Cards</Text>
          <Text style={styles.statValue}>{activeJobCards}</Text>
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
          <Text style={styles.statValue}>{pendingEstimations}</Text>
        </View>
      </View>

      {/* ── Quick Overview list ── */}
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
    </SafeAreaView>
    </ResponsiveScreen>
  );
}

const styles = StyleSheet.create({
  // SafeAreaView handles the top inset natively on iOS; Android's SafeAreaView
  // is a no-op, so it needs the status bar height added manually — same
  // pattern as InvoiceViewerScreen's header.
  safeArea: {
    flex: 1,
    backgroundColor: '#fdfcfb',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
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

  // Header
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  greetingSmall: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  greetingBold: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3b5ff8',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },

  // Branch switcher (owners only)
  branchSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 56,
    marginBottom: 16,
  },
  branchSwitcherIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#eff2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  branchSwitcherLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
  },
  branchSwitcherName: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '700',
    marginTop: 1,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    width: '100%',
    maxWidth: SHEET_MAX_WIDTH,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    alignSelf: 'center',
    marginTop: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
  },
  sheetList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  branchOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginVertical: 2,
  },
  branchOptionActive: {
    backgroundColor: '#eef2ff',
  },
  branchOptionText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  branchOptionTextActive: {
    color: '#3b5ff8',
    fontWeight: '700',
  },

  // Status hero card
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b5ff8',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#3b5ff8', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  statusCircle1: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)', top: -60, right: -40,
  },
  statusCircle2: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)', bottom: -30, left: -20,
  },
  statusLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  statusMessage: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    lineHeight: 18,
  },
  statusIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },

  // Section titles
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    marginTop: 4,
  },

  // Shortcuts
  shortcutRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  shortcutItem: {
    width: 74,
    alignItems: 'center',
  },
  shortcutIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  shortcutLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },

  // Reminder card
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f59e0b',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  reminderIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  reminderSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },

  // Stats grid
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

  // Quick Overview card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
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
