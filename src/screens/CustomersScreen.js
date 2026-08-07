import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, Modal, ScrollView, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../api/customerService';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';

const BLANK = { name: '', phone: '', email: '', notes: '', address: { street: '', city: '', state: '', pincode: '' } };

function CustomerModal({ visible, onClose, onSave, editing }) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setAddr = (k, v) => setForm(f => ({ ...f, address: { ...f.address, [k]: v } }));

  useEffect(() => {
    if (visible) {
      setForm(editing ? {
        name: editing.name || '', phone: editing.phone || '', email: editing.email || '',
        notes: editing.notes || '',
        address: editing.address || { street: '', city: '', state: '', pincode: '' }
      } : BLANK);
    }
  }, [visible, editing]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      Toast.show({ type: 'error', text1: 'Name and phone are required' }); return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed to save customer' });
    } finally { setSaving(false); }
  };

  const F = ({ label, value, onChange, placeholder, keyboard, cap, multiline }) => (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      {multiline ? (
        <TextInput style={[s.input, { height: 72, textAlignVertical: 'top' }]} value={value} onChangeText={onChange}
          placeholder={placeholder} placeholderTextColor="#9ca3af" multiline />
      ) : (
        <TextInput style={s.input} value={value} onChangeText={onChange} placeholder={placeholder}
          placeholderTextColor="#9ca3af" keyboardType={keyboard || 'default'}
          autoCapitalize={cap || 'sentences'} />
      )}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{editing ? 'Edit Customer' : 'Add Customer'}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#6b7280" /></TouchableOpacity>
          </View>
          <ScrollView style={s.sheetBody} keyboardShouldPersistTaps="handled">
            <F label="Full Name *" value={form.name} onChange={v => set('name', v)} placeholder="John Doe" />
            <F label="Phone Number *" value={form.phone} onChange={v => set('phone', v)} placeholder="9876543210" keyboard="phone-pad" cap="none" />
            <F label="Email" value={form.email} onChange={v => set('email', v)} placeholder="customer@email.com (optional)" keyboard="email-address" cap="none" />
            <View style={s.row}>
              <View style={{ flex: 1 }}><F label="City" value={form.address.city} onChange={v => setAddr('city', v)} placeholder="City" /></View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}><F label="Pincode" value={form.address.pincode} onChange={v => setAddr('pincode', v)} placeholder="560001" keyboard="numeric" cap="none" /></View>
            </View>
            <F label="Notes" value={form.notes} onChange={v => set('notes', v)} placeholder="Any notes..." multiline />
          </ScrollView>
          <View style={s.footer}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>{editing ? 'Update' : 'Add Customer'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function CustomersScreen() {
  const { hasRole } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);

  const canManage = hasRole('owner', 'admin', 'service_advisor', 'receptionist');
  const canDelete = hasRole('owner', 'admin');

  const fetchCustomers = useCallback(async (currentPage = 1, refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const { data } = await getCustomers({ search, page: currentPage, limit: 15 });
      setCustomers(currentPage === 1 ? data : prev => [...prev, ...data]);
    } catch { Toast.show({ type: 'error', text1: 'Failed to load customers' }); }
    finally { setLoading(false); setRefreshing(false); }
  }, [search]);

  useEffect(() => { setPage(1); setLoading(true); fetchCustomers(1); }, [search]);

  const handleSave = async (form) => {
    if (editing) {
      await updateCustomer(editing._id, form);
      Toast.show({ type: 'success', text1: 'Customer updated!' });
    } else {
      await createCustomer(form);
      Toast.show({ type: 'success', text1: 'Customer added!' });
    }
    fetchCustomers(1);
  };

  const handleDelete = (c) => {
    Alert.alert('Delete Customer', `Delete ${c.name}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try { await deleteCustomer(c._id); Toast.show({ type: 'success', text1: 'Customer deleted' }); fetchCustomers(1); }
          catch { Toast.show({ type: 'error', text1: 'Failed to delete' }); }
        }
      }
    ]);
  };

  const renderItem = ({ item: c }) => (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.avatarWrap}>
          <Text style={s.avatarText}>{c.name?.charAt(0)?.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.customerName}>{c.name}</Text>
          <Text style={s.customerSub}>{c.phone}{c.email ? ` · ${c.email}` : ''}</Text>
        </View>
        <Text style={s.spentText}>₹{(c.totalSpent || 0).toLocaleString('en-IN')}</Text>
      </View>
      <View style={s.cardFooter}>
        <View style={s.metaChip}><Ionicons name="car-outline" size={13} color="#6b7280" /><Text style={s.metaChipText}>{c.vehicles?.length || 0} vehicles</Text></View>
        {c.address?.city ? <View style={s.metaChip}><Ionicons name="location-outline" size={13} color="#6b7280" /><Text style={s.metaChipText}>{c.address.city}</Text></View> : null}
        {canManage && (
          <View style={s.actions}>
            <TouchableOpacity style={s.actionBtn} onPress={() => { setEditing(c); setModalVisible(true); }}>
              <Ionicons name="pencil-outline" size={15} color="#3b5ff8" />
            </TouchableOpacity>
            {canDelete && (
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#fee2e2' }]} onPress={() => handleDelete(c)}>
                <Ionicons name="trash-outline" size={15} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      <View style={s.searchBox}>
        <Ionicons name="search" size={20} color="#9ca3af" style={{ marginRight: 8 }} />
        <TextInput style={s.searchInput} placeholder="Search by name or phone..." value={search}
          onChangeText={setSearch} placeholderTextColor="#9ca3af" />
        {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color="#9ca3af" /></TouchableOpacity> : null}
      </View>

      {loading ? (
        <View style={s.loading}><ActivityIndicator size="large" color="#3b5ff8" /></View>
      ) : (
        <FlatList data={customers} keyExtractor={i => i._id} renderItem={renderItem}
          contentContainerStyle={s.list} refreshing={refreshing}
          onRefresh={() => { setPage(1); fetchCustomers(1, true); }}
          onEndReached={() => { const n = page + 1; setPage(n); fetchCustomers(n); }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={52} color="#e5e7eb" />
              <Text style={s.emptyTitle}>No Customers Found</Text>
              <Text style={s.emptySub}>{search ? 'Try a different search' : 'Add your first customer'}</Text>
            </View>
          }
        />
      )}

      {canManage && (
        <TouchableOpacity style={s.fab} onPress={() => { setEditing(null); setModalVisible(true); }}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      <CustomerModal visible={modalVisible} onClose={() => setModalVisible(false)} onSave={handleSave} editing={editing} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfcfb' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 16, marginBottom: 8, borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12 },
  searchInput: { flex: 1, height: 44, fontSize: 15, color: '#1f2937' },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatarWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#eff2ff', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#3b5ff8' },
  customerName: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  customerSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  spentText: { fontSize: 15, fontWeight: 'bold', color: '#10b981' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 160 },
  metaChipText: { fontSize: 12, color: '#6b7280' },
  actions: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  actionBtn: { width: 30, height: 30, borderRadius: 16, backgroundColor: '#eff2ff', justifyContent: 'center', alignItems: 'center' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: '#374151' },
  emptySub: { fontSize: 13, color: '#9ca3af' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#3b5ff8', justifyContent: 'center', alignItems: 'center', shadowColor: '#3b5ff8', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  // Modal
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginTop: 12 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  sheetTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  sheetBody: { padding: 20 },
  footer: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#fdfcfb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, paddingHorizontal: 12, height: 44, fontSize: 15, color: '#1f2937' },
  row: { flexDirection: 'row' },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  saveBtn: { flex: 1.5, padding: 14, borderRadius: 16, backgroundColor: '#3b5ff8', alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
});
