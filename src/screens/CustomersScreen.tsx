import React, { useState, useEffect, useCallback } from 'react';
import { formatMoney } from '../utils/format';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, Modal, ScrollView, KeyboardAvoidingView, Platform, Alert,
  KeyboardTypeOptions, ListRenderItem
} from 'react-native';
import { useForm, useController, type Control, type FieldValues, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../api/customerService';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { toastConfig } from '../components/toastConfig';
import { useAuth } from '../context/AuthContext';
import { useGarage } from '../context/GarageContext';
import ResponsiveScreen, { SHEET_MAX_WIDTH } from '../components/ResponsiveScreen';
import type { RootStackScreenProps } from '../types/navigation';
import type { Customer } from '../types/models';
import { customerSchema, type CustomerFormValues } from '../utils/validation';
import { getErrorMessage } from '../utils/errors';
import { colors, palette, radius } from '../theme';

type Props = RootStackScreenProps<'Customers'>;

const BLANK: CustomerFormValues = { name: '', phone: '', email: '', notes: '', address: { street: '', city: '', state: '', pincode: '' } };

interface FProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  keyboard?: KeyboardTypeOptions;
  cap?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
}

// Two things about this component are load-bearing:
//
// 1. It is at module scope, not inside CustomerModal. A component defined in
//    another component's render body gets a new type identity every re-render,
//    so React unmounts and remounts its TextInput on every keystroke — losing
//    all but the first character typed.
// 2. It binds through `useController`, not `register`. A TextInput has no DOM
//    ref and emits no native change event, so `register` typechecks here and
//    then never sees a keystroke. Same reason as ControlledField in
//    components/FormControls.tsx.
function F<T extends FieldValues>({ control, name, label, placeholder, keyboard, cap, multiline }: FProps<T>) {
  const { field, fieldState } = useController({ control, name });
  const value = field.value == null ? '' : String(field.value);
  const invalid = !!fieldState.error;
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      {multiline ? (
        <TextInput accessibilityLabel={label} style={[s.input, invalid && s.inputError, { height: 72, textAlignVertical: 'top' }]} value={value}
          onChangeText={field.onChange} onBlur={field.onBlur}
          placeholder={placeholder} placeholderTextColor={colors.textFaint} multiline />
      ) : (
        <TextInput accessibilityLabel={label} style={[s.input, invalid && s.inputError]} value={value} onChangeText={field.onChange} onBlur={field.onBlur}
          placeholder={placeholder} placeholderTextColor={colors.textFaint} keyboardType={keyboard || 'default'}
          autoCapitalize={cap || 'sentences'} />
      )}
      {invalid ? <Text style={s.fieldError}>{fieldState.error?.message}</Text> : null}
    </View>
  );
}

interface CustomerModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (form: CustomerFormValues) => Promise<void>;
  editing: Customer | null;
}

function CustomerModal({ visible, onClose, onSave, editing }: CustomerModalProps) {
  // The postal rule follows the garage's country, so the schema is built from
  // the live locale rather than a fixed one — a UK garage must be able to
  // enter "SW1A 1AA".
  const { locale } = useGarage();
  const {
    control, handleSubmit, reset,
    formState: { isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema(locale)),
    defaultValues: BLANK,
  });

  useEffect(() => {
    if (visible) {
      reset(editing ? {
        name: editing.name || '', phone: editing.phone || '', email: editing.email || '',
        notes: editing.notes || '',
        address: {
          street: editing.address?.street || '', city: editing.address?.city || '',
          state: editing.address?.state || '', pincode: editing.address?.pincode || '',
        },
      } : BLANK);
    }
  }, [visible, editing, reset]);

  const handleSave = async (values: CustomerFormValues) => {
    try {
      await onSave(values);
      onClose();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e, 'Failed to save customer') });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{editing ? 'Edit Customer' : 'Add Customer'}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.textMuted} /></TouchableOpacity>
          </View>
          <ScrollView style={s.sheetBody} keyboardShouldPersistTaps="handled">
            <F control={control} name="name" label="Full Name *" placeholder="John Doe" />
            <F control={control} name="phone" label="Phone Number *" placeholder={locale.phoneExample} keyboard="phone-pad" cap="none" />
            <F control={control} name="email" label="Email" placeholder="customer@email.com (optional)" keyboard="email-address" cap="none" />
            <View style={s.row}>
              <View style={{ flex: 1 }}><F control={control} name="address.city" label="City" placeholder="City" /></View>
              <View style={{ width: 12 }} />
              {/* Label, keypad and example all follow the garage's country —
                  this used to be hardcoded to an Indian pincode. */}
              <View style={{ flex: 1 }}>
                <F control={control} name="address.pincode" label={locale.postalLabel} placeholder={locale.postalLabel}
                  keyboard={locale.postalInputMode === 'numeric' ? 'numeric' : 'default'} cap="characters" />
              </View>
            </View>
            <F control={control} name="notes" label="Notes" placeholder="Any notes..." multiline />
          </ScrollView>
          <View style={s.footer}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.saveBtn, isSubmitting && { opacity: 0.6 }]} onPress={handleSubmit(handleSave)} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color={colors.textOnPrimary} size="small" /> : <Text style={s.saveBtnText}>{editing ? 'Update' : 'Add Customer'}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      {/* Modal-scoped Toast — see StaffModal in StaffScreen.tsx for why this
          is needed (RN's Modal renders above the app-root Toast in App.tsx). */}
      <Toast config={toastConfig} />
    </Modal>
  );
}

export default function CustomersScreen(_props: Props) {
  const { hasRole } = useAuth();
  const { activeGarageId, locale } = useGarage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const canManage = hasRole('owner', 'admin', 'service_advisor', 'receptionist');
  const canDelete = hasRole('owner', 'admin');

  const fetchCustomers = useCallback(async (currentPage = 1, refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const { data } = await getCustomers({ search, page: currentPage, limit: 15 });
      setCustomers(prev => currentPage === 1 ? data : [...prev, ...data]);
    } catch { Toast.show({ type: 'error', text1: 'Failed to load customers' }); }
    finally { setLoading(false); setRefreshing(false); }
  }, [search]);

  // Re-fetch when the screen comes into focus, matching InvoicesScreen and
  // DashboardScreen. Customers is a *tab*, so React Navigation keeps it mounted
  // once visited — without this, the vehicle count each row shows stays as it
  // was when the tab first loaded. Reassigning a vehicle's owner over on the
  // Vehicles tab would then look like it had not worked until an app restart.
  useFocusEffect(
    useCallback(() => {
      setPage(1);
      setLoading(true);
      fetchCustomers(1);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, activeGarageId])
  );

  const handleSave = async (form: CustomerFormValues) => {
    if (editing) {
      await updateCustomer(editing._id, form);
      Toast.show({ type: 'success', text1: 'Customer updated!' });
    } else {
      await createCustomer(form);
      Toast.show({ type: 'success', text1: 'Customer added!' });
    }
    fetchCustomers(1);
  };

  const handleDelete = (c: Customer) => {
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

  // Wrapped in useCallback so FlatList doesn't get a new renderItem identity
  // on every keystroke in the search box — see CONTRIBUTING.md Performance Conventions.
  const renderItem: ListRenderItem<Customer> = useCallback(({ item: c }) => (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.avatarWrap}>
          <Text style={s.avatarText}>{c.name?.charAt(0)?.toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.customerName}>{c.name}</Text>
          <Text style={s.customerSub}>{c.phone}{c.email ? ` · ${c.email}` : ''}</Text>
        </View>
        <Text style={s.spentText}>{formatMoney(c.totalSpent, locale)}</Text>
      </View>
      <View style={s.cardFooter}>
        <View style={s.metaChip}><Ionicons name="car-outline" size={13} color={colors.textMuted} /><Text style={s.metaChipText}>{c.vehicles?.length || 0} vehicles</Text></View>
        {c.address?.city ? <View style={s.metaChip}><Ionicons name="location-outline" size={13} color={colors.textMuted} /><Text style={s.metaChipText}>{c.address.city}</Text></View> : null}
        {canManage && (
          <View style={s.actions}>
            <TouchableOpacity style={s.actionBtn} onPress={() => { setEditing(c); setModalVisible(true); }}>
              <Ionicons name="pencil-outline" size={15} color={colors.primary} />
            </TouchableOpacity>
            {canDelete && (
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: palette.red100 }]} onPress={() => handleDelete(c)}>
                <Ionicons name="trash-outline" size={15} color={colors.danger} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [canManage, canDelete]);

  const keyExtractor = useCallback((item: Customer) => item._id, []);

  return (
    <ResponsiveScreen>
    <View style={s.container}>
      <View style={s.searchBox}>
        <Ionicons name="search" size={20} color={colors.textFaint} style={{ marginRight: 8 }} />
        <TextInput style={s.searchInput} placeholder="Search by name or phone..." value={search}
          onChangeText={setSearch} placeholderTextColor={colors.textFaint} />
        {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={colors.textFaint} /></TouchableOpacity> : null}
      </View>

      {loading ? (
        <View style={s.loading}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList data={customers} keyExtractor={keyExtractor} renderItem={renderItem}
          contentContainerStyle={s.list} refreshing={refreshing}
          onRefresh={() => { setPage(1); fetchCustomers(1, true); }}
          onEndReached={() => { const n = page + 1; setPage(n); fetchCustomers(n); }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={52} color={colors.border} />
              <Text style={s.emptyTitle}>No Customers Found</Text>
              <Text style={s.emptySub}>{search ? 'Try a different search' : 'Add your first customer'}</Text>
            </View>
          }
        />
      )}

      {canManage && (
        <TouchableOpacity
          style={s.fab}
          onPress={() => { setEditing(null); setModalVisible(true); }}
          testID="add-customer-fab"
          accessibilityLabel="Add customer"
        >
          <Ionicons name="add" size={28} color={colors.textOnPrimary} />
        </TouchableOpacity>
      )}

      <CustomerModal visible={modalVisible} onClose={() => setModalVisible(false)} onSave={handleSave} editing={editing} />
    </View>
    </ResponsiveScreen>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, margin: 16, marginBottom: 8, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 12 },
  searchInput: { flex: 1, height: 44, fontSize: 15, color: colors.textStrong },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, marginBottom: 10, shadowColor: colors.shadowAmbient, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatarWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
  customerName: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  customerSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  spentText: { fontSize: 15, fontWeight: 'bold', color: colors.success },
  cardFooter: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceMuted, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  metaChipText: { fontSize: 12, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  actionBtn: { width: 30, height: 30, borderRadius: radius.lg, backgroundColor: colors.primarySoft, justifyContent: 'center', alignItems: 'center' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: colors.textSecondary },
  emptySub: { fontSize: 13, color: colors.textFaint },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: radius.xxl, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  // Modal
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', width: '100%', maxWidth: SHEET_MAX_WIDTH },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted },
  sheetTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  sheetBody: { padding: 20 },
  footer: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: colors.surfaceMuted },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.lg, paddingHorizontal: 12, height: 44, fontSize: 15, color: colors.textStrong },
  inputError: { borderColor: colors.danger },
  fieldError: { fontSize: 12, color: colors.danger, marginTop: 5 },
  row: { flexDirection: 'row' },
  cancelBtn: { flex: 1, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  saveBtn: { flex: 1.5, padding: 14, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: 'bold', color: colors.textOnPrimary },
});
