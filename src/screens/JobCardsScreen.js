import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getJobCards } from '../api/jobCardService';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

const PAGE_LIMIT = 10;

export default function JobCardsScreen({ navigation }) {
  const [jobCards, setJobCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
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
      const { data } = await getJobCards({ search, page: currentPage, limit: PAGE_LIMIT });

      setHasMore(data.length === PAGE_LIMIT);

      if (currentPage === 1) {
        setJobCards(data);
      } else {
        setJobCards(prev => [...prev, ...data]);
      }
    } catch (error) {
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
    }, [search])
  );

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return '#3b82f6';
      case 'estimation_sent': return '#f59e0b';
      case 'approved': return '#8b5cf6';
      case 'in_progress': return '#ec4899';
      case 'ready_for_pickup': return '#10b981';
      case 'delivered': return '#6b7280';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const renderItem = ({ item }) => (
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
          <Ionicons name="car-outline" size={16} color="#6b7280" />
          <Text style={styles.bodyText}>{item.vehicle?.licensePlate} ({item.vehicle?.make})</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="person-outline" size={16} color="#6b7280" />
          <Text style={styles.bodyText}>{item.customer?.name} - {item.customer?.phone}</Text>
        </View>
        <View style={[styles.row, { marginTop: 8 }]}>
          <Text style={styles.priceText}>
            Est: {item.estimation?.grandTotal ? `₹${item.estimation.grandTotal.toLocaleString('en-IN')}` : 'Pending'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search job cards..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9ca3af"
        />
      </View>

      {loading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b5ff8" />
        </View>
      ) : (
        <FlatList
          data={jobCards}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 20 }} color="#3b5ff8" /> : null}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="clipboard-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No job cards found</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateJobCard')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdfcfb',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#1f2937',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
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
    color: '#3b5ff8',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 160,
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
    color: '#4b5563',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
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
    color: '#6b7280',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b5ff8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b5ff8',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  }
});
