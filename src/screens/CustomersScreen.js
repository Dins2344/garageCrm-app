import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { getCustomers } from '../api/customerService';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

export default function CustomersScreen() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCustomers = async (currentPage = 1, shouldRefresh = false) => {
    try {
      if (shouldRefresh) setRefreshing(true);
      const { data } = await getCustomers({ 
        search, 
        page: currentPage, 
        limit: 15 
      });
      if (currentPage === 1) {
        setCustomers(data);
      } else {
        setCustomers([...customers, ...data]);
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to load customers' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const onRefresh = () => {
    setPage(1);
    fetchCustomers(1, true);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.nameText}>{item.name}</Text>
        <Text style={styles.spentText}>₹{(item.totalSpent || 0).toLocaleString('en-IN')}</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.row}>
          <Ionicons name="call-outline" size={16} color="#6b7280" />
          <Text style={styles.bodyText}>{item.phone}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="car-outline" size={16} color="#6b7280" />
          <Text style={styles.bodyText}>{item.vehicles?.length || 0} vehicles</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="location-outline" size={16} color="#6b7280" />
          <Text style={styles.bodyText}>{item.address?.city || 'No city provided'}</Text>
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
          placeholder="Search by name or phone..."
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
          data={customers}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEndReached={() => {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchCustomers(nextPage);
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No customers found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  spentText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
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
  }
});
