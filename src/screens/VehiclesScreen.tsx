import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, Modal, ScrollView, KeyboardAvoidingView, Platform, Alert,
  KeyboardTypeOptions, ListRenderItem
} from 'react-native';
import BottomSheetPicker from '../components/BottomSheetPicker';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { toastConfig } from '../components/toastConfig';
import { getVehicles, createVehicle, updateVehicle, deleteVehicle } from '../api/vehicleService';
import { getCustomers } from '../api/customerService';
import { useAuth } from '../context/AuthContext';
import { useGarage } from '../context/GarageContext';
import ResponsiveScreen, { SHEET_MAX_WIDTH } from '../components/ResponsiveScreen';
import { TAB_BAR_CLEARANCE } from '../components/FloatingTabBar';
import type { MainTabScreenProps } from '../types/navigation';
import type { Customer, Vehicle, FuelType } from '../types/models';
import { getErrorMessage } from '../utils/errors';
import { colors, palette, radius } from '../theme';

type Props = MainTabScreenProps<'Vehicles'>;

const FUEL_COLOR: Partial<Record<FuelType, string>> = { petrol: colors.danger, diesel: colors.info, electric: colors.success, hybrid: palette.violet500, cng: colors.warning };

interface VehicleForm {
  licensePlate: string;
  make: string;
  model: string;
  year: string;
  color: string;
  fuelType: FuelType;
  customer: string;
}

const BLANK: VehicleForm = { licensePlate: '', make: '', model: '', year: '', color: '', fuelType: 'petrol', customer: '' };

// ─── Customer Search Picker ────────────────────────────────────────────────────
interface CustomerPickerProps {
  customers: Customer[];
  value: string;
  onChange: (id: string) => void;
}

function CustomerPicker({ customers, value, onChange }: CustomerPickerProps) {
  const [query, setQuery] = useState('');
  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query)
  );
  const selected = customers.find(c => c._id === value);

  return (
    <View>
      <View style={s.searchRow}>
        <Ionicons name="search" size={16} color={colors.textFaint} style={{ marginRight: 6 }} />
        <TextInput style={s.searchInput} value={query} onChangeText={setQuery}
          placeholder="Search customer by name or phone..." placeholderTextColor={colors.textFaint} />
      </View>
      <ScrollView style={s.customerList} nestedScrollEnabled>
        {filtered.slice(0, 30).map(c => (
          <TouchableOpacity key={c._id} style={[s.customerOption, value === c._id && s.customerSelected]}
            onPress={() => { onChange(c._id); setQuery(''); }}>
            <Text style={[s.customerOptionName, value === c._id && { color: colors.primary }]}>{c.name}</Text>
            <Text style={s.customerOptionPhone}>{c.phone}</Text>
          </TouchableOpacity>
        ))}
        {filtered.length === 0 && <Text style={s.noCustomer}>No customers found</Text>}
      </ScrollView>
      {selected && (
        <View style={s.selectedChip}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={s.selectedChipText}>{selected.name} · {selected.phone}</Text>
          <TouchableOpacity onPress={() => onChange('')}><Ionicons name="close-circle" size={14} color={colors.textFaint} /></TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
interface VehicleModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (payload: Partial<Vehicle> & { customer: string }) => Promise<void>;
  editing: Vehicle | null;
  customers: Customer[];
}

interface FProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboard?: KeyboardTypeOptions;
  cap?: 'none' | 'sentences' | 'words' | 'characters';
}

// Defined at module scope, not inside VehicleModal — a component defined
// inside another component's render body gets a new type identity on every
// re-render, which makes React unmount+remount its TextInput on every
// keystroke (losing all but the first typed character). See CONTRIBUTING.md
// Performance Conventions.
function F({ label, value, onChange, placeholder, keyboard, cap }: FProps) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={s.input} value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={colors.textFaint} keyboardType={keyboard || 'default'}
        autoCapitalize={cap || 'sentences'} />
    </View>
  );
}

function VehicleModal({ visible, onClose, onSave, editing, customers }: VehicleModalProps) {
  const [form, setForm] = useState<VehicleForm>(BLANK);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof VehicleForm>(k: K, v: VehicleForm[K]) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (visible) {
      setForm(editing ? {
        licensePlate: editing.licensePlate || '',
        make: editing.make || '',
        model: editing.model || '',
        year: editing.year ? String(editing.year) : '',
        color: editing.color || '',
        fuelType: editing.fuelType || 'petrol',
        customer: (typeof editing.customer === 'object' ? editing.customer?._id : editing.customer) || '',
      } : BLANK);
    }
  }, [visible, editing]);

  const handleSave = async () => {
    if (!form.licensePlate.trim() || !form.make.trim() || !form.model.trim()) {
      Toast.show({ type: 'error', text1: 'License plate, make and model are required' }); return;
    }
    if (!form.customer) {
      Toast.show({ type: 'error', text1: 'Please select a customer owner' }); return;
    }
    setSaving(true);
    try {
      const payload: Partial<Vehicle> & { customer: string; year?: number } = {
        ...form,
        licensePlate: form.licensePlate.toUpperCase(),
        year: form.year ? parseInt(form.year, 10) : undefined,
      };
      await onSave(payload);
      onClose();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e, 'Failed to save vehicle') });
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{editing ? 'Edit Vehicle' : 'Add Vehicle'}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.textMuted} /></TouchableOpacity>
          </View>
          <ScrollView style={s.sheetBody} keyboardShouldPersistTaps="handled" nestedScrollEnabled>

            <Text style={s.sectionLabel}>Owner</Text>
            <CustomerPicker customers={customers} value={form.customer} onChange={v => set('customer', v)} />

            <View style={s.divider} />

            <F label="License Plate *" value={form.licensePlate} onChange={v => set('licensePlate', v.toUpperCase())}
              placeholder="KA01AB1234" cap="characters" />

            <View style={s.row}>
              <View style={{ flex: 1 }}><F label="Make *" value={form.make} onChange={v => set('make', v)} placeholder="Honda, Maruti..." /></View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}><F label="Model *" value={form.model} onChange={v => set('model', v)} placeholder="City, Swift..." /></View>
            </View>

            <View style={s.row}>
              <View style={{ flex: 1 }}><F label="Year" value={form.year} onChange={v => set('year', v)} placeholder="2024" keyboard="numeric" cap="none" /></View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}><F label="Color" value={form.color} onChange={v => set('color', v)} placeholder="White, Black..." /></View>
            </View>

            <BottomSheetPicker
              label="Fuel Type"
              options={[
                { value: 'petrol', label: 'Petrol', color: colors.danger },
                { value: 'diesel', label: 'Diesel', color: colors.info },
                { value: 'cng', label: 'CNG', color: colors.warning },
                { value: 'electric', label: 'Electric', color: colors.success },
                { value: 'hybrid', label: 'Hybrid', color: palette.violet500 },
              ]}
              selectedValue={form.fuelType}
              onValueChange={v => set('fuelType', v as FuelType)}
            />
          </ScrollView>
          <View style={s.footer}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color={colors.textOnPrimary} size="small" /> : <Text style={s.saveBtnText}>{editing ? 'Update' : 'Add Vehicle'}</Text>}
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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function VehiclesScreen({ navigation }: Props) {
  const { hasRole } = useAuth();
  const { activeGarageId } = useGarage();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);

  const canManage = hasRole('owner', 'admin', 'service_advisor', 'receptionist');
  const canDelete = hasRole('owner', 'admin');

  const fetchVehicles = useCallback(async (currentPage = 1, refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const { data } = await getVehicles({ search, page: currentPage, limit: 15 });
      setVehicles(prev => currentPage === 1 ? data : [...prev, ...data]);
    } catch { Toast.show({ type: 'error', text1: 'Failed to load vehicles' }); }
    finally { setLoading(false); setRefreshing(false); }
  }, [search]);

  useEffect(() => { setPage(1); setLoading(true); fetchVehicles(1); }, [fetchVehicles, activeGarageId]);

  useEffect(() => {
    getCustomers({ limit: 500 }).then(r => setCustomers(r.data || [])).catch(() => {});
  }, [activeGarageId]);

  const handleSave = async (payload: Partial<Vehicle> & { customer: string }) => {
    if (editing) {
      await updateVehicle(editing._id, payload);
      Toast.show({ type: 'success', text1: 'Vehicle updated!' });
    } else {
      await createVehicle(payload);
      Toast.show({ type: 'success', text1: 'Vehicle added!' });
    }
    fetchVehicles(1);
  };

  const handleDelete = (v: Vehicle) => {
    Alert.alert('Delete Vehicle', `Delete ${v.licensePlate}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try { await deleteVehicle(v._id); Toast.show({ type: 'success', text1: 'Vehicle deleted' }); fetchVehicles(1); }
          catch { Toast.show({ type: 'error', text1: 'Failed to delete' }); }
        }
      }
    ]);
  };

  // Wrapped in useCallback so FlatList doesn't get a new renderItem identity
  // on every keystroke in the search box — see CONTRIBUTING.md Performance Conventions.
  const renderItem: ListRenderItem<Vehicle> = useCallback(({ item: v }) => {
    const fuel = (v.fuelType?.toLowerCase() || 'petrol') as FuelType;
    const fuelColor = FUEL_COLOR[fuel] || colors.textMuted;
    const owner = typeof v.customer === 'object' ? v.customer : null;
    return (
      <TouchableOpacity style={s.card} activeOpacity={0.8}
        onPress={() => navigation.navigate('VehicleDetail', { id: v._id })}>
        <View style={s.cardTop}>
          <View style={s.vehicleIcon}><Ionicons name="car-sport-outline" size={24} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.plate}>{v.licensePlate}</Text>
            <Text style={s.makeModel}>{v.make} {v.model}{v.year ? ` (${v.year})` : ''}</Text>
          </View>
          <View style={[s.fuelBadge, { backgroundColor: `${fuelColor}18` }]}>
            <Text style={[s.fuelText, { color: fuelColor }]}>{fuel}</Text>
          </View>
        </View>
        <View style={s.divider} />
        <View style={s.cardFooter}>
          <View style={s.metaRow}>
            <Ionicons name="person-outline" size={13} color={colors.textFaint} />
            <Text style={s.metaText}>{owner?.name || 'No owner'}</Text>
          </View>
          {v.color && <View style={s.metaRow}><Ionicons name="color-palette-outline" size={13} color={colors.textFaint} /><Text style={s.metaText}>{v.color}</Text></View>}
          {canManage && (
            <View style={s.actionGroup}>
              <TouchableOpacity style={s.actionBtn} onPress={() => { setEditing(v); setModalVisible(true); }}>
                <Ionicons name="pencil-outline" size={15} color={colors.primary} />
              </TouchableOpacity>
              {canDelete && (
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: palette.red100 }]} onPress={() => handleDelete(v)}>
                  <Ionicons name="trash-outline" size={15} color={colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, canManage, canDelete]);

  const keyExtractor = useCallback((item: Vehicle) => item._id, []);

  return (
    <ResponsiveScreen>
    <View style={s.container}>
      <View style={s.searchBox}>
        <Ionicons name="search" size={20} color={colors.textFaint} style={{ marginRight: 8 }} />
        <TextInput style={s.searchInput2} placeholder="Search plate, make or model..." value={search}
          onChangeText={setSearch} placeholderTextColor={colors.textFaint} />
        {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={colors.textFaint} /></TouchableOpacity> : null}
      </View>

      {loading ? (
        <View style={s.loading}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList data={vehicles} keyExtractor={keyExtractor} renderItem={renderItem}
          contentContainerStyle={s.list} refreshing={refreshing}
          onRefresh={() => { setPage(1); fetchVehicles(1, true); }}
          onEndReached={() => { const n = page + 1; setPage(n); fetchVehicles(n); }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="car-outline" size={52} color={colors.border} />
              <Text style={s.emptyTitle}>No Vehicles Found</Text>
              <Text style={s.emptySub}>{search ? 'Try a different search' : 'Add your first vehicle'}</Text>
            </View>
          }
        />
      )}

      {canManage && (
        <TouchableOpacity style={s.fab} onPress={() => { setEditing(null); setModalVisible(true); }}>
          <Ionicons name="add" size={28} color={colors.textOnPrimary} />
        </TouchableOpacity>
      )}

      <VehicleModal visible={modalVisible} onClose={() => setModalVisible(false)}
        onSave={handleSave} editing={editing} customers={customers} />
    </View>
    </ResponsiveScreen>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, margin: 16, marginBottom: 8, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12 },
  searchInput2: { flex: 1, height: 44, fontSize: 15, color: colors.textStrong },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: TAB_BAR_CLEARANCE + 20 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 14, marginBottom: 10, shadowColor: colors.shadowAmbient, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  vehicleIcon: { width: 44, height: 44, borderRadius: radius.lg, backgroundColor: colors.primarySoft, justifyContent: 'center', alignItems: 'center' },
  plate: { fontSize: 17, fontWeight: 'bold', color: colors.textPrimary, letterSpacing: 0.5 },
  makeModel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  fuelBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill },
  fuelText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  divider: { height: 1, backgroundColor: colors.surfaceMuted, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: colors.textMuted },
  actionGroup: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  actionBtn: { width: 30, height: 30, borderRadius: radius.lg, backgroundColor: colors.primarySoft, justifyContent: 'center', alignItems: 'center' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: colors.textSecondary },
  emptySub: { fontSize: 13, color: colors.textFaint },
  fab: { position: 'absolute', bottom: TAB_BAR_CLEARANCE, right: 24, width: 56, height: 56, borderRadius: radius.xxl, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  // Modal
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', width: '100%', maxWidth: SHEET_MAX_WIDTH },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted },
  sheetTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  sheetBody: { padding: 20 },
  footer: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: colors.surfaceMuted },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 12, height: 44, fontSize: 15, color: colors.textStrong },

  row: { flexDirection: 'row' },
  cancelBtn: { flex: 1, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  saveBtn: { flex: 1.5, padding: 14, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: 'bold', color: colors.textOnPrimary },
  // Customer picker
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 10, height: 42, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 14, color: colors.textStrong },
  customerList: { maxHeight: 160, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, marginBottom: 8 },
  customerOption: { padding: 10, borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted },
  customerSelected: { backgroundColor: colors.primarySoft },
  customerOptionName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  customerOptionPhone: { fontSize: 12, color: colors.textMuted },
  noCustomer: { padding: 12, textAlign: 'center', color: colors.textFaint, fontSize: 13 },
  selectedChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: palette.green50, borderWidth: 1, borderColor: palette.green200, borderRadius: radius.lg, paddingHorizontal: 10, paddingVertical: 6 },
  selectedChipText: { flex: 1, fontSize: 13, color: palette.emerald700, fontWeight: '500' },
});
