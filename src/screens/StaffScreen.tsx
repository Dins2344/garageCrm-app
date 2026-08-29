import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Modal, ScrollView,
  TextInput, KeyboardAvoidingView, Platform, ListRenderItem,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useForm, useController, type Control, type FieldValues, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ControlledPicker } from '../components/FormControls';
import Toast from 'react-native-toast-message';
import { toastConfig } from '../components/toastConfig';
import { useAuth } from '../context/AuthContext';
import { useGarage } from '../context/GarageContext';
import { getUsers, createUser, updateUser, deleteUser } from '../api/userService';
import ResponsiveScreen, { SHEET_MAX_WIDTH } from '../components/ResponsiveScreen';
import type { RootStackScreenProps } from '../types/navigation';
import type { User, Role } from '../types/models';
import { staffSchema, type StaffFormValues } from '../utils/validation';
import { getErrorMessage } from '../utils/errors';
import { colors, palette, radius } from '../theme';

type Props = RootStackScreenProps<'Staff'>;

const ROLE_CONFIG: Record<Role, { label: string; color: string; bg: string }> = {
  owner:          { label: 'Owner',          color: colors.primary, bg: colors.primarySoft },
  admin:          { label: 'Admin',           color: palette.violet600, bg: palette.violet50 },
  service_advisor:{ label: 'Service Advisor', color: colors.success, bg: palette.green50 },
  mechanic:       { label: 'Mechanic',        color: colors.warning, bg: palette.amber100 },
  receptionist:   { label: 'Receptionist',    color: palette.teal700, bg: palette.teal50 },
};

const BLANK_FORM: StaffFormValues = { name: '', email: '', phone: '', password: '', role: 'mechanic' };

function RoleBadge({ role }: { role: Role }) {
  const cfg = ROLE_CONFIG[role] || { label: role, color: colors.textMuted, bg: colors.surfaceMuted };
  return (
    <View style={[styles.roleBadge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.roleBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

interface FieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences';
  secureTextEntry?: boolean;
}

// Two things about this component are load-bearing:
//
// 1. It is at module scope, not inside StaffModal. A component defined in
//    another component's render body gets a new type identity every re-render,
//    so React unmounts and remounts its TextInput on every keystroke — losing
//    all but the first character typed.
// 2. It binds through `useController`, not `register`. A TextInput has no DOM
//    ref and emits no native change event, so `register` typechecks here and
//    then never sees a keystroke.
function Field<T extends FieldValues>({ control, name, label, placeholder, keyboardType, autoCapitalize, secureTextEntry }: FieldProps<T>) {
  const { field, fieldState } = useController({ control, name });
  const invalid = !!fieldState.error;
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={[styles.input, invalid && styles.inputError]}
        value={field.value == null ? '' : String(field.value)}
        onChangeText={field.onChange}
        onBlur={field.onBlur}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize || 'sentences'}
        secureTextEntry={secureTextEntry}
      />
      {invalid ? <Text style={styles.fieldError}>{fieldState.error?.message}</Text> : null}
    </View>
  );
}

interface StaffModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (payload: Partial<User> & { password?: string }) => Promise<void>;
  editingUser: User | null;
  canSetAdmin: boolean;
}

function StaffModal({ visible, onClose, onSave, editingUser, canSetAdmin }: StaffModalProps) {
  // The phone placeholder has to follow the garage's country — a UK garage
  // adding staff was being shown an Indian 10-digit example.
  const { locale } = useGarage();
  const {
    control, handleSubmit, reset, setError,
    formState: { isSubmitting },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: BLANK_FORM,
  });

  useEffect(() => {
    if (visible) {
      reset(editingUser
        ? { name: editingUser.name, email: editingUser.email, phone: editingUser.phone, password: '', role: editingUser.role }
        : BLANK_FORM
      );
    }
  }, [visible, editingUser, reset]);

  const handleSave = async (values: StaffFormValues) => {
    // `staffSchema` allows a blank password so the *edit* form can leave it
    // unchanged. Creating a staff member is the one case where it is required,
    // and that depends on a prop the schema cannot see — so it is checked here
    // and reported on the field, not through a toast.
    if (!editingUser && !values.password) {
      setError('password', { message: 'Password must be at least 6 characters' });
      return;
    }
    try {
      // `role` is a plain string on the schema (the option list is built at
      // the picker, not in validation.ts), so it is narrowed to Role here.
      const payload: Partial<User> & { password?: string } = {
        name: values.name, email: values.email, phone: values.phone, role: values.role as Role,
      };
      if (!editingUser || values.password) payload.password = values.password;
      await onSave(payload);
      onClose();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e, 'Failed to save staff member') });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingUser ? 'Edit Staff Member' : 'Add Staff Member'}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.textMuted} /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Field control={control} name="name" label="Full Name *" placeholder="Staff member's name" />
            <Field control={control} name="email" label="Email *" placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" />
            <Field control={control} name="phone" label="Phone *" placeholder={locale.phoneExample} keyboardType="phone-pad" autoCapitalize="none" />
            <Field
              control={control}
              name="password"
              label={editingUser ? 'New Password (leave blank to keep)' : 'Password *'}
              placeholder="Min. 6 characters"
              secureTextEntry
              autoCapitalize="none"
            />
            <ControlledPicker
              control={control}
              name="role"
              label="Role"
              required
              options={[
                { value: 'mechanic', label: 'Mechanic', icon: 'hammer-outline', color: colors.warning },
                { value: 'service_advisor', label: 'Service Advisor', icon: 'clipboard-outline', color: colors.success },
                { value: 'receptionist', label: 'Receptionist', icon: 'desktop-outline', color: palette.teal700 },
                ...(canSetAdmin ? [{ value: 'admin', label: 'Admin', icon: 'shield-outline' as const, color: palette.violet600 }] : []),
              ]}
            />
          </ScrollView>
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, isSubmitting && { opacity: 0.6 }]} onPress={handleSubmit(handleSave)} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color={colors.textOnPrimary} size="small" /> : <Text style={styles.saveBtnText}>{editingUser ? 'Save Changes' : 'Add Staff'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      {/* Modal-scoped Toast — RN's Modal renders in its own native layer above
          the app root, so the root <Toast/> in App.tsx is hidden behind it.
          Mounting a second instance here makes it the active one (by mount
          order) while this modal is open; it falls back to the root instance
          once this one unmounts. See react-native-toast-message's docs on
          showing a Toast inside a Modal. */}
      <Toast config={toastConfig} />
    </Modal>
  );
}

export default function StaffScreen(_props: Props) {
  const { user, hasRole } = useAuth();
  const { activeGarageId } = useGarage();
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

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
    } catch {
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

  useEffect(() => { fetchStaff(); }, [fetchStaff, activeGarageId]);

  const openAdd = () => { setEditingUser(null); setModalVisible(true); };
  const openEdit = (u: User) => { setEditingUser(u); setModalVisible(true); };

  const handleSave = async (payload: Partial<User> & { password?: string }) => {
    if (editingUser) {
      await updateUser(editingUser._id, payload);
      Toast.show({ type: 'success', text1: 'Staff member updated!' });
    } else {
      await createUser(payload as Required<Pick<User, 'name' | 'email' | 'phone' | 'role'>> & { password: string });
      Toast.show({ type: 'success', text1: 'Staff member added!' });
    }
    fetchStaff();
  };

  const handleToggleActive = (u: User) => {
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

  const handleDelete = (u: User) => {
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

  // Wrapped in useCallback so FlatList doesn't get a new renderItem identity
  // on every keystroke in the search box — see CONTRIBUTING.md Performance Conventions.
  const renderItem: ListRenderItem<User> = useCallback(({ item }) => {
    const isSelf = item._id === user?._id;
    const isOwner = item.role === 'owner';
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={[styles.avatar, { backgroundColor: ROLE_CONFIG[item.role]?.bg || colors.surfaceMuted }]}>
            <Text style={[styles.avatarText, { color: ROLE_CONFIG[item.role]?.color || colors.textMuted }]}>
              {item.name?.charAt(0)?.toUpperCase()}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.staffName}>{item.name}{isSelf ? ' (You)' : ''}</Text>
              <View style={[styles.statusDot, { backgroundColor: item.isActive ? colors.success : colors.borderStrong }]} />
            </View>
            <Text style={styles.staffEmail}>{item.email}</Text>
            <Text style={styles.staffPhone}>{item.phone}</Text>
            <RoleBadge role={item.role} />
          </View>
        </View>

        {canManage && !isOwner && !isSelf && (
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}>
              <Ionicons name="pencil-outline" size={16} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggleActive(item)}>
              <Ionicons name={item.isActive ? 'pause-circle-outline' : 'play-circle-outline'} size={16} color={item.isActive ? colors.warning : colors.success} />
              <Text style={[styles.actionText, { color: item.isActive ? colors.warning : colors.success }]}>
                {item.isActive ? 'Deactivate' : 'Activate'}
              </Text>
            </TouchableOpacity>
            {hasRole('owner') && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, canManage, hasRole]);

  const keyExtractor = useCallback((item: User) => item._id, []);

  return (
    <ResponsiveScreen>
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={filteredStaff}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={() => fetchStaff(true)}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View>
              {/* Search bar */}
              <View style={styles.searchRow}>
                <Ionicons name="search-outline" size={18} color={colors.textFaint} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  value={staffSearch}
                  onChangeText={setStaffSearch}
                  placeholder="Search by name, email or phone..."
                  placeholderTextColor={colors.textFaint}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                />
                {staffSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setStaffSearch('')} style={styles.searchClear}>
                    <Ionicons name="close-circle" size={18} color={colors.textFaint} />
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
                color={colors.border}
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

      {/* The FAB is icon-only, so it needs a label: without one a screen reader
          announces an unnamed button. Matches `add-customer-fab` on
          CustomersScreen. */}
      {canManage && (
        <TouchableOpacity
          style={styles.fab}
          onPress={openAdd}
          testID="add-staff-fab"
          accessibilityLabel="Add staff member"
        >
          <Ionicons name="add" size={28} color={colors.textOnPrimary} />
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
    </ResponsiveScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 100 },

  // Search
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong,
    borderRadius: radius.lg, marginBottom: 10, paddingHorizontal: 10,
    shadowColor: colors.shadowAmbient, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, height: 44, fontSize: 14, color: colors.textStrong },
  searchClear: { padding: 4 },

  // Role chips
  chipScroll: { marginBottom: 10 },
  chipContainer: { gap: 6, paddingRight: 4 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.xl,
    backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.textOnPrimary },

  // Summary row
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  summaryText: { fontSize: 13, color: colors.textFaint, fontWeight: '500' },
  clearText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, marginBottom: 12,
    shadowColor: colors.shadowAmbient, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  cardTop: { flexDirection: 'row', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: radius.lg, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20, fontWeight: 'bold' },
  cardInfo: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  staffName: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  staffEmail: { fontSize: 13, color: colors.textMuted },
  staffPhone: { fontSize: 13, color: colors.textMuted },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, marginTop: 4 },
  roleBadgeText: { fontSize: 11, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.surfaceMuted },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.lg, backgroundColor: colors.background },
  actionText: { fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyText: { fontSize: 16, color: colors.textFaint },
  clearBtn: { marginTop: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.lg, backgroundColor: colors.primarySoft },
  clearBtnText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: radius.xxl,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', width: '100%', maxWidth: SHEET_MAX_WIDTH },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  modalBody: { padding: 20 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: colors.surfaceMuted },
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.lg, paddingHorizontal: 12, height: 44, fontSize: 15, color: colors.textStrong },
  inputError: { borderColor: colors.danger },
  fieldError: { fontSize: 12, color: colors.danger, marginTop: 5 },

  cancelBtn: { flex: 1, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  saveBtn: { flex: 1, padding: 14, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: 'bold', color: colors.textOnPrimary },
});
