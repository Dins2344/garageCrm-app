import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Modal, ScrollView,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheetPicker from '../components/BottomSheetPicker';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { getUsers, createUser, updateUser, deleteUser } from '../api/userService';

const ROLE_CONFIG = {
  owner:          { label: 'Owner',          color: '#3b5ff8', bg: '#eff2ff' },
  admin:          { label: 'Admin',           color: '#7c3aed', bg: '#f5f3ff' },
  service_advisor:{ label: 'Service Advisor', color: '#10b981', bg: '#f0fdf4' },
  mechanic:       { label: 'Mechanic',        color: '#f59e0b', bg: '#fef3c7' },
  receptionist:   { label: 'Receptionist',    color: '#0f766e', bg: '#f0fdfa' },
};

const BLANK_FORM = { name: '', email: '', phone: '', password: '', role: 'mechanic' };

function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] || { label: role, color: '#6b7280', bg: '#f3f4f6' };
  return (
    <View style={[styles.roleBadge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.roleBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function StaffModal({ visible, onClose, onSave, editingUser, canSetAdmin }) {
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(editingUser
        ? { name: editingUser.name, email: editingUser.email, phone: editingUser.phone, password: '', role: editingUser.role }
        : BLANK_FORM
      );
    }
  }, [visible, editingUser]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      Toast.show({ type: 'error', text1: 'Name, email and phone are required' });
      return;
    }
    if (!editingUser && form.password.length < 6) {
      Toast.show({ type: 'error', text1: 'Password must be at least 6 characters' });
      return;
    }
    setSaving(true);
    try {
      const payload = { name: form.name, email: form.email, phone: form.phone, role: form.role };
      if (!editingUser || form.password) payload.password = form.password;
      await onSave(payload);
      onClose();
    } catch (e) {
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed to save staff member' });
    } finally {
      setSaving(false);
    }
  };

  const Field = ({ label, value, onChange, placeholder, keyboardType, autoCapitalize, secureTextEntry }) => (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize || 'sentences'}
        secureTextEntry={secureTextEntry}
      />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingUser ? 'Edit Staff Member' : 'Add Staff Member'}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#6b7280" /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Field label="Full Name *" value={form.name} onChange={v => set('name', v)} placeholder="Staff member's name" />
            <Field label="Email *" value={form.email} onChange={v => set('email', v)} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" />
            <Field label="Phone *" value={form.phone} onChange={v => set('phone', v)} placeholder="10-digit phone number" keyboardType="phone-pad" autoCapitalize="none" />
            <Field
              label={editingUser ? 'New Password (leave blank to keep)' : 'Password *'}
              value={form.password}
              onChange={v => set('password', v)}
              placeholder="Min. 6 characters"
              secureTextEntry
              autoCapitalize="none"
            />
            <BottomSheetPicker
              label="Role"
              required
              options={[
                { value: 'mechanic', label: 'Mechanic', icon: 'hammer-outline', color: '#f59e0b' },
                { value: 'service_advisor', label: 'Service Advisor', icon: 'clipboard-outline', color: '#10b981' },
                { value: 'receptionist', label: 'Receptionist', icon: 'desktop-outline', color: '#0f766e' },
                ...(canSetAdmin ? [{ value: 'admin', label: 'Admin', icon: 'shield-outline', color: '#7c3aed' }] : []),
              ]}
              selectedValue={form.role}
              onValueChange={v => set('role', v)}
            />
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>{editingUser ? 'Save Changes' : 'Add Staff'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function StaffScreen() {
  const { user, hasRole } = useAuth();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const canManage = hasRole('owner', 'admin');
  const canSetAdmin = hasRole('owner');

  const [staffSearch, setStaffSearch] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState('all');

  const ROLE_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'mechanic', label: 'Mechanic' },
    { key: 'service_advisor', label: 'Advisor' },
    { key: 'receptionist', label: 'Reception' },
    { key: 'admin', label: 'Admin' },
    { key: 'owner', label: 'Owner' },
  ];

  const fetchStaff = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const { data } = await getUsers();
      setStaff(data);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to load staff' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const filteredStaff = useMemo(() => {
    let list = staff;
    if (staffRoleFilter !== 'all') {
      list = list.filter(u => u.role === staffRoleFilter);
    }
    if (staffSearch.trim()) {
      const q = staffSearch.trim().toLowerCase();
      list = list.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.includes(q)
      );
    }
    return list;
  }, [staff, staffSearch, staffRoleFilter]);

  useEffect(() => { fetchStaff(); }, []);

  const openAdd = () => { setEditingUser(null); setModalVisible(true); };
  const openEdit = (u) => { setEditingUser(u); setModalVisible(true); };

  const handleSave = async (payload) => {
    if (editingUser) {
      await updateUser(editingUser._id, payload);
      Toast.show({ type: 'success', text1: 'Staff member updated!' });
    } else {
      await createUser(payload);
      Toast.show({ type: 'success', text1: 'Staff member added!' });
    }
    fetchStaff();
  };

  const handleToggleActive = (u) => {
    Alert.alert(
      u.isActive ? 'Deactivate Staff' : 'Activate Staff',
      `${u.isActive ? 'Deactivate' : 'Activate'} ${u.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: u.isActive ? 'Deactivate' : 'Activate',
          style: u.isActive ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await updateUser(u._id, { isActive: !u.isActive });
              Toast.show({ type: 'success', text1: `${u.name} ${u.isActive ? 'deactivated' : 'activated'}` });
              fetchStaff();
            } catch { Toast.show({ type: 'error', text1: 'Update failed' }); }
          }
        }
      ]
    );
  };

  const handleDelete = (u) => {
    Alert.alert('Delete Staff', `Permanently delete ${u.name}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteUser(u._id);
            Toast.show({ type: 'success', text1: 'Staff member deleted' });
            fetchStaff();
          } catch { Toast.show({ type: 'error', text1: 'Delete failed' }); }
        }
      }
    ]);
  };

  const renderItem = ({ item }) => {
    const isSelf = item._id === user?._id;
    const isOwner = item.role === 'owner';
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={[styles.avatar, { backgroundColor: ROLE_CONFIG[item.role]?.bg || '#f3f4f6' }]}>
            <Text style={[styles.avatarText, { color: ROLE_CONFIG[item.role]?.color || '#6b7280' }]}>
              {item.name?.charAt(0)?.toUpperCase()}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.staffName}>{item.name}{isSelf ? ' (You)' : ''}</Text>
              <View style={[styles.statusDot, { backgroundColor: item.isActive ? '#10b981' : '#d1d5db' }]} />
            </View>
            <Text style={styles.staffEmail}>{item.email}</Text>
            <Text style={styles.staffPhone}>{item.phone}</Text>
            <RoleBadge role={item.role} />
          </View>
        </View>

        {canManage && !isOwner && !isSelf && (
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}>
              <Ionicons name="pencil-outline" size={16} color="#3b5ff8" />
              <Text style={[styles.actionText, { color: '#3b5ff8' }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggleActive(item)}>
              <Ionicons name={item.isActive ? 'pause-circle-outline' : 'play-circle-outline'} size={16} color={item.isActive ? '#f59e0b' : '#10b981'} />
              <Text style={[styles.actionText, { color: item.isActive ? '#f59e0b' : '#10b981' }]}>
                {item.isActive ? 'Deactivate' : 'Activate'}
              </Text>
            </TouchableOpacity>
            {hasRole('owner') && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                <Text style={[styles.actionText, { color: '#ef4444' }]}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color="#3b5ff8" /></View>
      ) : (
        <FlatList
          data={filteredStaff}
          keyExtractor={i => i._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={() => fetchStaff(true)}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View>
              {/* Search bar */}
              <View style={styles.searchRow}>
                <Ionicons name="search-outline" size={18} color="#9ca3af" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  value={staffSearch}
                  onChangeText={setStaffSearch}
                  placeholder="Search by name, email or phone..."
                  placeholderTextColor="#9ca3af"
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                />
                {staffSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setStaffSearch('')} style={styles.searchClear}>
                    <Ionicons name="close-circle" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Role filter chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScroll}
                contentContainerStyle={styles.chipContainer}
              >
                {ROLE_FILTERS.map(f => (
                  <TouchableOpacity
                    key={f.key}
                    onPress={() => setStaffRoleFilter(f.key)}
                    style={[
                      styles.chip,
                      staffRoleFilter === f.key && styles.chipActive,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.chipText,
                      staffRoleFilter === f.key && styles.chipTextActive,
                    ]}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Count summary */}
              <View style={styles.summary}>
                <Text style={styles.summaryText}>
                  {staffSearch || staffRoleFilter !== 'all'
                    ? `${filteredStaff.length} of ${staff.length} staff shown`
                    : `${staff.length} staff · ${staff.filter(s => s.isActive).length} active`
                  }
                </Text>
                {(staffSearch || staffRoleFilter !== 'all') && (
                  <TouchableOpacity onPress={() => { setStaffSearch(''); setStaffRoleFilter('all'); }}>
                    <Text style={styles.clearText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name={staff.length === 0 ? 'people-outline' : 'search-outline'}
                size={48}
                color="#e5e7eb"
              />
              <Text style={styles.emptyText}>
                {staff.length === 0
                  ? 'No staff members yet'
                  : 'No staff match your search'
                }
              </Text>
              {(staffSearch || staffRoleFilter !== 'all') && (
                <TouchableOpacity
                  onPress={() => { setStaffSearch(''); setStaffRoleFilter('all'); }}
                  style={styles.clearBtn}
                >
                  <Text style={styles.clearBtnText}>Clear filters</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {canManage && (
        <TouchableOpacity style={styles.fab} onPress={openAdd}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      <StaffModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        editingUser={editingUser}
        canSetAdmin={canSetAdmin}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfcfb' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 100 },

  // Search
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 16, marginBottom: 10, paddingHorizontal: 10,
    shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, height: 44, fontSize: 14, color: '#1f2937' },
  searchClear: { padding: 4 },

  // Role chips
  chipScroll: { marginBottom: 10 },
  chipContainer: { gap: 6, paddingRight: 4 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  chipActive: { backgroundColor: '#3b5ff8', borderColor: '#3b5ff8' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  chipTextActive: { color: '#fff' },

  // Summary row
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  summaryText: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  clearText: { fontSize: 13, color: '#3b5ff8', fontWeight: '600' },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  cardTop: { flexDirection: 'row', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20, fontWeight: 'bold' },
  cardInfo: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  staffName: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  staffEmail: { fontSize: 13, color: '#6b7280' },
  staffPhone: { fontSize: 13, color: '#6b7280' },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 160, marginTop: 4 },
  roleBadgeText: { fontSize: 11, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#fdfcfb' },
  actionText: { fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyText: { fontSize: 16, color: '#9ca3af' },
  clearBtn: { marginTop: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, backgroundColor: '#eff2ff' },
  clearBtnText: { fontSize: 14, fontWeight: '700', color: '#3b5ff8' },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#3b5ff8', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#3b5ff8', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginTop: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  modalBody: { padding: 20 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#fdfcfb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, paddingHorizontal: 12, height: 44, fontSize: 15, color: '#1f2937' },

  cancelBtn: { flex: 1, padding: 14, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 16, backgroundColor: '#3b5ff8', alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
});
