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
import SampleDataBanner from '../components/SampleDataBanner';
import ResponsiveScreen, { SHEET_MAX_WIDTH } from '../components/ResponsiveScreen';
import { TAB_BAR_CLEARANCE } from '../components/FloatingTabBar';
import type { MainTabScreenProps } from '../types/navigation';
import type { Garage, Role } from '../types/models';
import { colors, palette, radius } from '../theme';

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

/** A single outstanding-work row in the "Needs Attention" block. */
interface AttentionItem {
  key: string;
  show: boolean;
  icon: IconName;
  color: string;
  title: string;
  subtitle: string;
  /** Omitted when the app has nowhere to send the user for this item. */
  onPress?: () => void;
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
          <Ionicons name="business" size={16} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.branchSwitcherLabel}>Active Branch</Text>
          <Text style={styles.branchSwitcherName} numberOfLines={1}>{activeGarage?.name || 'Select branch'}</Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={colors.textFaint} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Switch Branch</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
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
                    <Ionicons name={isActive ? 'radio-button-on' : 'radio-button-off'} size={20} color={isActive ? colors.primary : colors.textFaint} />
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
  const { activeGarageId, activeGarage, garages, switchGarage, locale, refreshGarage } = useGarage();

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
          <ActivityIndicator size="large" color={colors.primary} />
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

  // A full grid rather than a trimmed one: tapping a big labelled tile is the
  // fastest way into a section even when the dock also has it, and the row
  // wraps, so extra entries cost nothing but a second line.
  const quickActions: ShortcutItem[] = [
    { label: 'New Job Card', icon: 'add-circle', color: colors.primary, bg: colors.primarySoft, onPress: () => navigation.navigate('CreateJobCard'), roles: ['owner', 'admin', 'service_advisor'] },
    { label: 'Job Cards', icon: 'clipboard', color: palette.violet500, bg: palette.violet50, onPress: () => navigation.navigate('JobCards') },
    { label: 'Vehicles', icon: 'car-sport', color: colors.success, bg: palette.green50, onPress: () => navigation.navigate('Vehicles') },
    { label: 'Customers', icon: 'people', color: colors.warning, bg: colors.warningSoft, onPress: () => navigation.navigate('Customers'), roles: ['owner', 'admin', 'service_advisor', 'receptionist'] },
    { label: 'Invoices', icon: 'document-text', color: palette.pink500, bg: palette.pink50, onPress: () => navigation.navigate('Invoices') },
    { label: 'Dashboard', icon: 'bar-chart', color: palette.sky500, bg: palette.sky50, onPress: () => navigation.navigate('Dashboard') },
    { label: 'Staff', icon: 'people-circle', color: palette.cyan500, bg: palette.cyan50, onPress: () => navigation.navigate('Staff'), roles: ['owner', 'admin'] },
    { label: 'Settings', icon: 'settings', color: colors.textMuted, bg: colors.surfaceMuted, onPress: () => navigation.navigate('Settings') },
  ];

  const visibleQuickActions = quickActions.filter(item => !item.roles || hasRole(...item.roles));

  // ── Needs Attention ──
  // The things a garage actually has to DO today, gathered into one block near
  // the top. Each row is only rendered when its count is non-zero, and the
  // whole section disappears when there's nothing outstanding — an empty
  // "0 pending" row is noise, not information.
  const readyForPickup = stats?.overview?.readyForPickup || 0;
  const unpaidCount = stats?.unpaid?.count || 0;
  const unpaidTotal = stats?.unpaid?.total || 0;
  const nextReminderDate = stats?.upcomingReminders
    ?.map(r => r.nextServiceDate)
    .filter(Boolean)
    .sort()[0];

  // Annotated on the literal, not on the .filter() result: the contextual type
  // is what narrows `icon` to Ionicons' name union instead of plain string.
  const allAttentionItems: AttentionItem[] = [
    {
      key: 'estimations',
      show: pendingEstimations > 0,
      icon: 'alert-circle',
      color: colors.warning,
      title: `${pendingEstimations} estimation${pendingEstimations > 1 ? 's' : ''} awaiting approval`,
      subtitle: 'Follow up so the work can start',
      onPress: () => navigation.navigate('JobCards'),
    },
    {
      key: 'pickup',
      show: readyForPickup > 0,
      icon: 'checkmark-done-circle',
      color: colors.success,
      title: `${readyForPickup} vehicle${readyForPickup > 1 ? 's' : ''} ready for pickup`,
      subtitle: 'Let the customer know it’s done',
      onPress: () => navigation.navigate('JobCards'),
    },
    {
      key: 'unpaid',
      show: unpaidCount > 0,
      icon: 'card',
      color: colors.danger,
      title: `${unpaidCount} unpaid invoice${unpaidCount > 1 ? 's' : ''}`,
      subtitle: `${formatCurrency(unpaidTotal)} outstanding`,
      onPress: () => navigation.navigate('Invoices'),
    },
    {
      key: 'reminders',
      show: remindersCount > 0,
      icon: 'calendar',
      color: palette.violet500,
      title: `${remindersCount} service${remindersCount > 1 ? 's' : ''} due soon`,
      // No destination: there is no reminders screen in the app yet, and a row
      // that looks tappable but goes nowhere is worse than a plain one.
      subtitle: nextReminderDate
        ? `Next on ${fmtDate(nextReminderDate, locale, { day: 'numeric', month: 'short' })}`
        : 'Reach out to these customers',
    },
  ];
  const attentionItems = allAttentionItems.filter(item => item.show);

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
          <Text style={styles.greetingSmall}>{getGreeting()}, {user?.name?.split(' ')[0]}</Text>
          <Text style={styles.greetingBold} numberOfLines={1}>{activeGarageName || 'Your Garage'}</Text>
        </View>
        <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Settings')} activeOpacity={0.8}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {/* Above the fold, unlike WebAppBanner below: this one explains the
          numbers directly under it, so it is useless further down the page. */}
      <SampleDataBanner
        visible={activeGarage?.hasSampleData === true}
        onRemoved={() => { refreshGarage(); fetchDashboard(); }}
      />

      {/* ── Branch switcher (owners only) ── */}
      {hasRole('owner') && (
        <BranchSwitcher garages={garages} activeGarageId={activeGarageId} onSwitch={switchGarage} />
      )}

      {/* ── Needs Attention ──
          The first thing under the header, because "what do I have to do
          today?" is the question someone opens the app to ask.

          This replaced a separate "Today's Status" hero that derived its
          headline from the same pendingEstimations/activeJobCards figures —
          so the screen stated the same fact twice, in two different visual
          styles, one directly above the other. The all-clear branch below is
          what that hero contributed that this block didn't. */}
      {attentionItems.length === 0 ? (
        <View style={styles.allClearCard} testID="all-clear">
          <View style={[styles.attentionIcon, { backgroundColor: palette.successWash }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.attentionTitle}>All clear</Text>
            <Text style={styles.attentionSub}>
              {activeJobCards > 0
                ? `${activeJobCards} job${activeJobCards > 1 ? 's' : ''} in progress, nothing waiting on you`
                : 'Nothing needs your attention right now'}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.attentionCard} testID="needs-attention">
          <Text style={styles.attentionHeading}>Needs Attention</Text>
          {attentionItems.map((item, index) => {
            const rowStyle = [
              styles.attentionRow,
              index === attentionItems.length - 1 && styles.attentionRowLast,
            ];
            const body = (
              <>
                <View style={[styles.attentionIcon, { backgroundColor: `${item.color}18` }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.attentionTitle}>{item.title}</Text>
                  <Text style={styles.attentionSub}>{item.subtitle}</Text>
                </View>
                {/* Chevron only where tapping actually goes somewhere. */}
                {item.onPress && <Ionicons name="chevron-forward" size={18} color={palette.grayBorderSoft} />}
              </>
            );

            return item.onPress ? (
              <TouchableOpacity key={item.key} style={rowStyle} activeOpacity={0.6} onPress={item.onPress}>
                {body}
              </TouchableOpacity>
            ) : (
              <View key={item.key} style={rowStyle}>{body}</View>
            );
          })}
        </View>
      )}

      {/* ── Quick Actions ── */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.shortcutRow} testID="quick-actions">
        {visibleQuickActions.map(item => (
          <TouchableOpacity key={item.label} style={styles.shortcutItem} activeOpacity={0.7} onPress={item.onPress}>
            <View style={[styles.shortcutIconWrap, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={24} color={item.color} />
            </View>
            <Text style={styles.shortcutLabel} numberOfLines={1}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Today ──
          Only figures about TODAY. Pending estimations used to sit in this
          grid as well, which meant the same number was on screen three times:
          in the status card, here, and again in the overview list below. */}
      <Text style={styles.sectionTitle}>Today</Text>
      <View style={styles.statsGrid}>
        <TouchableOpacity
          style={[styles.statCard, { borderLeftColor: colors.info, borderLeftWidth: 4 }]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('JobCards')}
        >
          <Text style={styles.statLabel}>Active Job Cards</Text>
          <Text style={styles.statValue}>{activeJobCards}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statCard, { borderLeftColor: palette.violet500, borderLeftWidth: 4 }]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('JobCards')}
        >
          <Text style={styles.statLabel}>New Jobs Today</Text>
          <Text style={styles.statValue}>{stats?.overview?.todayJobCards || 0}</Text>
        </TouchableOpacity>
        <View style={[styles.statCard, { borderLeftColor: colors.success, borderLeftWidth: 4 }]}>
          <Text style={styles.statLabel}>Today's Revenue</Text>
          <Text style={styles.statValue}>{formatCurrency(stats?.revenue?.today)}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: colors.warning, borderLeftWidth: 4 }]}>
          <Text style={styles.statLabel}>This Month</Text>
          <Text style={styles.statValue}>{formatCurrency(stats?.revenue?.month)}</Text>
        </View>
      </View>

      {/* ── Business totals ──
          Slow-moving reference numbers, so they sit last: useful to glance at,
          never the reason someone opened the app. */}
      <View style={styles.totalsRow}>
        <TouchableOpacity
          style={styles.totalItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Customers')}
        >
          <Ionicons name="people-outline" size={18} color={colors.textMuted} />
          <Text style={styles.totalValue}>{formatNumber(stats?.overview?.totalCustomers, locale)}</Text>
          <Text style={styles.totalLabel}>Customers</Text>
        </TouchableOpacity>
        <View style={styles.totalDivider} />
        <TouchableOpacity
          style={styles.totalItem}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Vehicles')}
        >
          <Ionicons name="car-outline" size={18} color={colors.textMuted} />
          <Text style={styles.totalValue}>{formatNumber(stats?.overview?.totalVehicles, locale)}</Text>
          <Text style={styles.totalLabel}>Vehicles</Text>
        </TouchableOpacity>
      </View>

      {/* Moved below the fold: it's a cross-sell, and it used to sit above
          Quick Actions, pushing the actual work down the screen. */}
      <WebAppBanner />
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
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.textMuted,
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
    color: colors.textMuted,
    fontWeight: '500',
  },
  greetingBold: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  avatarText: {
    color: colors.textOnPrimary,
    fontSize: 17,
    fontWeight: 'bold',
  },

  // Branch switcher (owners only)
  branchSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    height: 56,
    marginBottom: 16,
  },
  branchSwitcherIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  branchSwitcherLabel: {
    fontSize: 11,
    color: colors.textFaint,
    fontWeight: '600',
  },
  branchSwitcherName: {
    fontSize: 14,
    color: colors.textPrimary,
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
    backgroundColor: colors.surface,
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
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.textPrimary,
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
    borderRadius: radius.md,
    marginVertical: 2,
  },
  branchOptionActive: {
    backgroundColor: colors.primarySoftAlt,
  },
  branchOptionText: {
    flex: 1,
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  branchOptionTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },


  // Section titles
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
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
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Needs Attention
  // Replaces the old single-purpose reminder card. That one was a solid amber
  // block that shouted louder than the status hero above it while being the
  // only thing on the screen you couldn't tap; this is a neutral card whose
  // rows carry their own colour, so several can coexist without competing.
  attentionCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: palette.boneCool,
    shadowColor: colors.shadowAmbient,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  // Same shell as attentionCard but a single centred row and no heading — a
  // quiet "nothing to do" state shouldn't take as much room as a list of work.
  allClearCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: palette.boneCool,
    shadowColor: colors.shadowAmbient,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  attentionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  attentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.boneAlt,
  },
  attentionRowLast: {
    borderBottomWidth: 0,
  },
  attentionIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attentionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  attentionSub: {
    fontSize: 12,
    color: colors.textFaint,
    marginTop: 2,
  },

  // Business totals
  totalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.boneCool,
    paddingVertical: 16,
    marginBottom: 20,
  },
  totalItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  totalDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: palette.boneCool,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  totalLabel: {
    fontSize: 12,
    color: colors.textFaint,
    fontWeight: '600',
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.shadowAmbient,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textStrong,
  },
});
