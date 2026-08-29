import React, { useState, useCallback } from 'react';
import { formatMoney, formatDate } from '../utils/format';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Platform, StatusBar, ListRenderItem
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getInvoices } from '../api/invoiceService';
import Toast from 'react-native-toast-message';
import { useGarage } from '../context/GarageContext';
import ResponsiveScreen from '../components/ResponsiveScreen';
import type { RootStackScreenProps } from '../types/navigation';
import type { Invoice, PaymentStatus } from '../types/models';
import { colors, palette, radius } from '../theme';

type Props = RootStackScreenProps<'Invoices'>;

const PAYMENT_CONFIG: Record<PaymentStatus, { label: string; bg: string; text: string; dot: string }> = {
  paid:    { label: 'Paid',    bg: palette.green100, text: palette.emerald700, dot: palette.emerald600 },
  unpaid:  { label: 'Unpaid',  bg: palette.orange50, text: palette.orange800, dot: palette.orange500 },
  partial: { label: 'Partial', bg: colors.infoSoft, text: palette.blue700, dot: colors.info },
};

const LIMIT = 20;

export default function InvoicesScreen({ navigation }: Props) {
  const { activeGarageId, locale } = useGarage();
  const [invoices, setInvoices]     = useState<Invoice[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState('all'); // all | unpaid | partial | paid
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]       = useState(true);

  const fetchInvoices = useCallback(async (reset = false) => {
    const currentPage = reset ? 1 : page;
    if (!reset && !hasMore) return;

    if (reset) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = {
        page: currentPage,
        limit: LIMIT,
        ...(search.trim() && { search: search.trim() }),
        ...(filter !== 'all' && { paymentStatus: filter }),
      };
      const res = await getInvoices(params);
      const data = res.data || [];

      if (reset) {
        setInvoices(data);
        setPage(2);
      } else {
        setInvoices(prev => [...prev, ...data]);
        setPage(p => p + 1);
      }

      setTotal(res.total || 0);
      setHasMore(data.length === LIMIT);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load invoices' });
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [page, hasMore, search, filter]);

  // Re-fetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setHasMore(true);
      fetchInvoices(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, filter, activeGarageId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    fetchInvoices(true);
  };

  const fmt = useCallback((n?: number) =>
    formatMoney(n, locale), [locale]);

  const fmtDate = useCallback((d?: string) =>
    d ? formatDate(d, locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '—', [locale]);

  // Wrapped in useCallback so FlatList doesn't get a new renderItem identity
  // on every keystroke in the search box — see CONTRIBUTING.md Performance Conventions.
  const renderItem: ListRenderItem<Invoice> = useCallback(({ item }) => {
    const cfg = PAYMENT_CONFIG[item.paymentStatus] || PAYMENT_CONFIG.unpaid;
    const balance = item.grandTotal - (item.amountPaid || 0);
    const customer = typeof item.customer === 'object' ? item.customer : null;
    const vehicle = typeof item.vehicle === 'object' ? item.vehicle : null;

    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => navigation.navigate('InvoiceViewer', { invoiceId: item._id })}
        activeOpacity={0.75}
      >
        {/* Top row */}
        <View style={s.cardTop}>
          <View style={s.cardTopLeft}>
            <Text style={s.invoiceNo}>{item.invoiceNumber}</Text>
            <Text style={s.dateText}>{fmtDate(item.createdAt)}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
            <View style={[s.statusDot, { backgroundColor: cfg.dot }]} />
            <Text style={[s.statusText, { color: cfg.text }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={s.divider} />

        {/* Customer & Vehicle */}
        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Ionicons name="person-outline" size={13} color={colors.textFaint} />
            <Text style={s.metaText} numberOfLines={1}>
              {customer?.name || '—'}
            </Text>
          </View>
          <View style={s.metaItem}>
            <Ionicons name="car-outline" size={13} color={colors.textFaint} />
            <Text style={s.metaText} numberOfLines={1}>
              {vehicle?.licensePlate || '—'}
            </Text>
          </View>
        </View>

        {/* Amounts */}
        <View style={s.amountRow}>
          <View>
            <Text style={s.amountLabel}>Total Amount</Text>
            <Text style={s.amountValue}>{fmt(item.grandTotal)}</Text>
          </View>
          {item.paymentStatus !== 'paid' && balance > 0 && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.dueLabel}>Balance Due</Text>
              <Text style={s.dueValue}>{fmt(balance)}</Text>
            </View>
          )}
          {item.paymentStatus === 'paid' && (
            <Ionicons name="checkmark-circle" size={22} color={palette.emerald600} />
          )}
        </View>
      </TouchableOpacity>
    );
  }, [navigation, fmt, fmtDate]);

  const keyExtractor = useCallback((item: Invoice) => item._id, []);

  const FILTERS = [
    { key: 'all',     label: 'All' },
    { key: 'unpaid',  label: 'Unpaid' },
    { key: 'partial', label: 'Partial' },
    { key: 'paid',    label: 'Paid' },
  ];

  const renderHeader = () => (
    <View>
      {/* Search */}
      <View style={s.searchBox}>
        <Ionicons name="search-outline" size={17} color={colors.textFaint} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search invoice or customer..."
          placeholderTextColor={colors.textFaint}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textFaint} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={s.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.filterTab, filter === f.key && s.filterTabActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.7}
          >
            <Text style={[s.filterTabText, filter === f.key && s.filterTabTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Count */}
      {!loading && (
        <Text style={s.countText}>{total} invoice{total !== 1 ? 's' : ''} found</Text>
      )}
    </View>
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={s.emptyContainer}>
        <Ionicons name="document-text-outline" size={56} color={colors.borderStrong} />
        <Text style={s.emptyTitle}>No Invoices Found</Text>
        <Text style={s.emptySubtitle}>
          {search || filter !== 'all'
            ? 'Try adjusting your search or filter'
            : 'Invoices are created automatically when you close a job card'}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingVertical: 16, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  return (
    <ResponsiveScreen>
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Invoices</Text>
          <Text style={s.headerSub}>Billing & payments</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {loading && !refreshing ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingText}>Loading invoices...</Text>
        </View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          onEndReached={() => fetchInvoices(false)}
          onEndReachedThreshold={0.4}
        />
      )}
    </View>
    </ResponsiveScreen>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 24) + 10,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  headerSub: { fontSize: 12, color: colors.textFaint, marginTop: 1 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: colors.textMuted, fontSize: 14 },

  list: { padding: 16, paddingBottom: 40 },

  // Search
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.borderStrong, marginBottom: 12,
    shadowColor: colors.shadowAmbient, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary, paddingVertical: 0 },

  // Filter tabs
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.xl,
    backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border,
  },
  filterTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterTabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  filterTabTextActive: { color: colors.textOnPrimary },

  countText: { fontSize: 12, color: colors.textFaint, marginBottom: 10 },

  // Invoice Card
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: colors.surfaceMuted,
    shadowColor: colors.shadowAmbient, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTopLeft: {},
  invoiceNo: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  dateText: { fontSize: 11, color: colors.textFaint, marginTop: 2 },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.xl,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },

  divider: { height: 1, backgroundColor: colors.surfaceMuted, marginBottom: 10 },

  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  metaText: { fontSize: 12, color: colors.textSecondary, flex: 1 },

  amountRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.background, padding: 10, borderRadius: radius.lg,
  },
  amountLabel: { fontSize: 11, color: colors.textFaint, marginBottom: 2 },
  amountValue: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  dueLabel: { fontSize: 11, color: colors.textFaint, marginBottom: 2 },
  dueValue: { fontSize: 15, fontWeight: 'bold', color: colors.danger },

  // Empty state
  emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textSecondary, marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: colors.textFaint, textAlign: 'center', lineHeight: 20 },
});
