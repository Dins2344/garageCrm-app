import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Platform, StatusBar, ListRenderItem
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getInvoices } from '../api/invoiceService';
import Toast from 'react-native-toast-message';
import ResponsiveScreen from '../components/ResponsiveScreen';
import type { RootStackScreenProps } from '../types/navigation';
import type { Invoice, PaymentStatus } from '../types/models';

type Props = RootStackScreenProps<'Invoices'>;

const PAYMENT_CONFIG: Record<PaymentStatus, { label: string; bg: string; text: string; dot: string }> = {
  paid:    { label: 'Paid',    bg: '#dcfce7', text: '#166534', dot: '#16a34a' },
  unpaid:  { label: 'Unpaid',  bg: '#fff7ed', text: '#9a3412', dot: '#f97316' },
  partial: { label: 'Partial', bg: '#eff6ff', text: '#1e40af', dot: '#3b82f6' },
};

const LIMIT = 20;

export default function InvoicesScreen({ navigation }: Props) {
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
    }, [search, filter])
  );

  const onRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    fetchInvoices(true);
  };

  const fmt = (n?: number) =>
    '₹' + (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fmtDate = (d?: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

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
            <Ionicons name="person-outline" size={13} color="#9ca3af" />
            <Text style={s.metaText} numberOfLines={1}>
              {customer?.name || '—'}
            </Text>
          </View>
          <View style={s.metaItem}>
            <Ionicons name="car-outline" size={13} color="#9ca3af" />
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
            <Ionicons name="checkmark-circle" size={22} color="#16a34a" />
          )}
        </View>
      </TouchableOpacity>
    );
  }, [navigation]);

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
        <Ionicons name="search-outline" size={17} color="#9ca3af" style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Search invoice or customer..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#9ca3af" />
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
        <Ionicons name="document-text-outline" size={56} color="#d1d5db" />
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
        <ActivityIndicator size="small" color="#3b5ff8" />
      </View>
    );
  };

  return (
    <ResponsiveScreen>
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Invoices</Text>
          <Text style={s.headerSub}>Billing & payments</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {loading && !refreshing ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color="#3b5ff8" />
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b5ff8" />
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
  container: { flex: 1, backgroundColor: '#fdfcfb' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 24) + 10,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  headerSub: { fontSize: 12, color: '#9ca3af', marginTop: 1 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#6b7280', fontSize: 14 },

  list: { padding: 16, paddingBottom: 40 },

  // Search
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12,
    shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', paddingVertical: 0 },

  // Filter tabs
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  filterTabActive: { backgroundColor: '#3b5ff8', borderColor: '#3b5ff8' },
  filterTabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  filterTabTextActive: { color: '#fff' },

  countText: { fontSize: 12, color: '#9ca3af', marginBottom: 10 },

  // Invoice Card
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#f3f4f6',
    shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTopLeft: {},
  invoiceNo: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  dateText: { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },

  divider: { height: 1, backgroundColor: '#f3f4f6', marginBottom: 10 },

  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  metaText: { fontSize: 12, color: '#374151', flex: 1 },

  amountRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fdfcfb', padding: 10, borderRadius: 16,
  },
  amountLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  amountValue: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  dueLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  dueValue: { fontSize: 15, fontWeight: 'bold', color: '#ef4444' },

  // Empty state
  emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },
});
