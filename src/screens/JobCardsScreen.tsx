import React, { useState, useCallback, useRef } from 'react';
import { formatMoney } from '../utils/format';
import { View, Text, StyleSheet, FlatList, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, ListRenderItem } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getJobCards } from '../api/jobCardService';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useGarage } from '../context/GarageContext';
import ResponsiveScreen from '../components/ResponsiveScreen';
import { TAB_BAR_CLEARANCE } from '../components/FloatingTabBar';
import type { MainTabScreenProps } from '../types/navigation';
import type { JobCard, JobStatus } from '../types/models';
import { colors, palette, radius } from '../theme';

const PAGE_LIMIT = 10;

type Props = MainTabScreenProps<'JobCards'>;

const STATUS_COLORS: Partial<Record<JobStatus, string>> = {
  new: colors.info,
  estimation_sent: colors.warning,
  approved: palette.violet500,
  in_progress: palette.pink500,
  ready_for_pickup: colors.success,
  delivered: colors.textMuted,
  cancelled: colors.danger,
};

// The filter chips, in workflow order. Values match backend/types/domain.ts.
const STATUS_FILTERS: { value: JobStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'estimation_sent', label: 'Estimation Sent' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'quality_check', label: 'Quality Check' },
  { value: 'ready_for_pickup', label: 'Ready for Pickup' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function JobCardsScreen({ navigation }: Props) {
  const { activeGarageId, locale } = useGarage();
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  // Any number of statuses; [] means all. Sent comma-joined — the API matches any of them.
  const [statuses, setStatuses] = useState<JobStatus[]>([]);
  const [page, setPage] = useState(1);
  const isFetchingMore = useRef(false);

  const fetchJobCards = async (currentPage = 1, isRefresh = false) => {
    if (currentPage > 1 && isFetchingMore.current) return;

    if (currentPage > 1) {
      isFetchingMore.current = true;
      setLoadingMore(true);
    } else if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { data } = await getJobCards({
        search,
        status: statuses.join(',') || undefined,
        page: currentPage,
        limit: PAGE_LIMIT
      });

      setHasMore(data.length === PAGE_LIMIT);

      if (currentPage === 1) {
        setJobCards(data);
      } else {
        setJobCards(prev => [...prev, ...data]);
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load job cards' });
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      isFetchingMore.current = false;
    }
  };

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      setHasMore(true);
      fetchJobCards(1);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, statuses, activeGarageId])
  );

  const toggleStatus = (value: JobStatus) =>
    setStatuses(prev => (prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]));

  const onRefresh = () => {
    setPage(1);
    setHasMore(true);
    fetchJobCards(1, true);
  };

  const handleLoadMore = () => {
    if (!hasMore || isFetchingMore.current || loadingMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchJobCards(nextPage);
  };

  const getStatusColor = (status?: JobStatus) => (status && STATUS_COLORS[status]) || colors.textMuted;

  // Wrapped in useCallback so FlatList doesn't get a new renderItem identity
  // on every keystroke in the search box — see CONTRIBUTING.md Performance Conventions.
  const renderItem: ListRenderItem<JobCard> = useCallback(({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('JobCardDetail', { id: item._id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.jobNumber}>{item.jobCardNumber}</Text>
        <View style={[styles.badge, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
          <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>
            {item.status?.replace(/_/g, ' ').toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.row}>
          <Ionicons name="car-outline" size={16} color={colors.textMuted} />
          <Text style={styles.bodyText}>
            {typeof item.vehicle === 'object' ? `${item.vehicle?.licensePlate} (${item.vehicle?.make})` : ''}
          </Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="person-outline" size={16} color={colors.textMuted} />
          <Text style={styles.bodyText}>
            {typeof item.customer === 'object' ? `${item.customer?.name} - ${item.customer?.phone}` : ''}
          </Text>
        </View>
        <View style={[styles.row, { marginTop: 8 }]}>
          <Text style={styles.priceText}>
            Est: {item.estimation?.grandTotal ? formatMoney(item.estimation.grandTotal, locale) : 'Pending'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  ), [navigation, locale]);

  const keyExtractor = useCallback((item: JobCard) => item._id, []);

  return (
    <ResponsiveScreen>
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textFaint} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search job cards..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={colors.textFaint}
        />
      </View>

      {/* Multi-select: each chip toggles on its own; "All" clears them. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipRow}
        keyboardShouldPersistTaps="handled"
        testID="status-filter"
      >
        <TouchableOpacity
          style={[styles.chip, statuses.length === 0 && styles.chipOn]}
          onPress={() => setStatuses([])}
          accessibilityRole="button"
          accessibilityState={{ selected: statuses.length === 0 }}
          testID="status-chip-all"
        >
          <Text style={[styles.chipText, statuses.length === 0 && styles.chipTextOn]} numberOfLines={1}>All</Text>
        </TouchableOpacity>
        {STATUS_FILTERS.map(({ value, label }) => {
          const on = statuses.includes(value);
          return (
            <TouchableOpacity
              key={value}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => toggleStatus(value)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              testID={`status-chip-${value}`}
            >
              {on && <Ionicons name="checkmark" size={14} color={colors.textOnPrimary} />}
              <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={jobCards}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 20 }} color={colors.primary} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="clipboard-outline" size={48} color={colors.borderStrong} />
              <Text style={styles.emptyText}>No job cards found</Text>
              {statuses.length > 0 && (
                <Text style={styles.emptyHint}>Try a different status filter</Text>
              )}
            </View>
          }
        />
      )}

      {/* Icon-only, so it needs both: the label is what a screen reader
          announces instead of "button", and the testID is how the E2E flows
          reach it. Matches add-customer-fab in CustomersScreen. */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateJobCard')}
        testID="add-job-card-fab"
        accessibilityLabel="New job card"
      >
        <Ionicons name="add" size={28} color={colors.textOnPrimary} />
      </TouchableOpacity>
    </View>
    </ResponsiveScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: colors.textStrong,
  },
  // ScrollView defaults to flexGrow 1 / flexShrink 1. Left alone, the list
  // below (which grows) squashes this row until the chips are clipped.
  chipScroll: { flexGrow: 0, flexShrink: 0 },
  chipRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: 'center',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    // Never squeezed to fit the row: the row scrolls, the chips do not shrink.
    flexShrink: 0,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  chipOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    // Android adds font padding that clips descenders at this size.
    includeFontPadding: false,
  },
  chipTextOn: {
    color: colors.textOnPrimary,
  },
  listContainer: {
    paddingHorizontal: 16,
    // Extra clearance for the floating dock tab bar (absolute-positioned,
    // so it no longer reserves its own space in the layout).
    paddingBottom: TAB_BAR_CLEARANCE + 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.shadowAmbient, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  jobNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardBody: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bodyText: {
    fontSize: 14,
    color: palette.gray600,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textMuted,
  },
  emptyHint: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textFaint,
  },
  fab: {
    position: 'absolute',
    // Sits above the floating dock tab bar instead of the screen edge.
    bottom: TAB_BAR_CLEARANCE,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: radius.xxl,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  }
});
