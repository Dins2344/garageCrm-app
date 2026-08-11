import React, { useState, useEffect, ComponentProps } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Modal, KeyboardAvoidingView, Platform, KeyboardTypeOptions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { getCustomers, createCustomer } from '../api/customerService';
import { getVehicles, createVehicle } from '../api/vehicleService';
import { getMechanics, getAdvisors } from '../api/userService';
import { createJobCard } from '../api/jobCardService';
import BottomSheetPicker from '../components/BottomSheetPicker';
import type { RootStackScreenProps } from '../types/navigation';
import type { Customer, Vehicle, User, FuelType, ServiceType, ComplaintPriority } from '../types/models';
import { getErrorMessage } from '../utils/errors';

type Props = RootStackScreenProps<'CreateJobCard'>;
type IconName = ComponentProps<typeof Ionicons>['name'];

// ─── Pure-JS Calendar Picker (no native modules — works in Expo Go) ───────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

interface CalendarModalProps {
  visible: boolean;
  selected: Date | null;
  onSelect: (d: Date) => void;
  onClose: () => void;
}

function CalendarModal({ visible, selected, onSelect, onClose }: CalendarModalProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const initial = selected || today;
  const [viewYear,  setViewYear]  = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  const isSelected = (d: number | null) => {
    if (!d || !selected) return false;
    return selected.getDate() === d && selected.getMonth() === viewMonth && selected.getFullYear() === viewYear;
  };
  const isPast = (d: number | null) => {
    if (!d) return false;
    const dt = new Date(viewYear, viewMonth, d);
    return dt < today;
  };

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={cal.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={cal.card} activeOpacity={1}>
          {/* Header */}
          <View style={cal.header}>
            <TouchableOpacity onPress={prevMonth} style={cal.navBtn}>
              <Ionicons name="chevron-back" size={20} color="#374151" />
            </TouchableOpacity>
            <Text style={cal.monthTitle}>{MONTHS[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={cal.navBtn}>
              <Ionicons name="chevron-forward" size={20} color="#374151" />
            </TouchableOpacity>
          </View>
          {/* Day labels */}
          <View style={cal.dayRow}>
            {DAYS.map(d => <Text key={d} style={cal.dayLabel}>{d}</Text>)}
          </View>
          {/* Weeks */}
          {rows.map((row, ri) => (
            <View key={ri} style={cal.dayRow}>
              {row.map((d, ci) => {
                const sel  = isSelected(d);
                const past = isPast(d);
                return (
                  <TouchableOpacity
                    key={ci}
                    style={[cal.cell, sel && cal.cellSelected, (!d || past) && cal.cellDisabled]}
                    onPress={() => {
                      if (!d || past) return;
                      onSelect(new Date(viewYear, viewMonth, d));
                    }}
                    disabled={!d || past}
                  >
                    <Text style={[cal.cellText, sel && cal.cellTextSelected, past && cal.cellTextPast]}>
                      {d || ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
          {/* Actions */}
          <View style={cal.footer}>
            <TouchableOpacity onPress={onClose} style={cal.cancelBtn}>
              <Text style={cal.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const cal = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  card:           { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: 320, shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn:         { padding: 6 },
  monthTitle:     { fontSize: 16, fontWeight: '700', color: '#111827' },
  dayRow:         { flexDirection: 'row', marginBottom: 4 },
  dayLabel:       { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#9ca3af', paddingVertical: 4 },
  cell:           { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 16, margin: 1 },
  cellSelected:   { backgroundColor: '#3b5ff8' },
  cellDisabled:   { opacity: 0.3 },
  cellText:       { fontSize: 14, color: '#111827', fontWeight: '500' },
  cellTextSelected: { color: '#fff', fontWeight: '700' },
  cellTextPast:   { color: '#9ca3af' },
  footer:         { marginTop: 12, alignItems: 'flex-end' },
  cancelBtn:      { paddingHorizontal: 16, paddingVertical: 8 },
  cancelText:     { fontSize: 14, color: '#6b7280', fontWeight: '600' },
});

// ─── Search + Select Modal ────────────────────────────────────────────────────
interface SearchModalProps<T extends { _id: string }> {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: T[];
  onSelect: (item: T) => void;
  renderItem: (item: T) => React.ReactNode;
  searchKeys: (keyof T)[];
}

function SearchModal<T extends { _id: string }>({ visible, onClose, title, items, onSelect, renderItem, searchKeys }: SearchModalProps<T>) {
  const [q, setQ] = useState('');
  const filtered = items.filter(i => searchKeys.some(k => String(i[k] || '').toLowerCase().includes(q.toLowerCase())));
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          <View style={ms.handle} />
          <View style={ms.header}>
            <Text style={ms.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#6b7280" /></TouchableOpacity>
          </View>
          <View style={ms.searchRow}>
            <Ionicons name="search" size={16} color="#9ca3af" />
            <TextInput style={ms.searchInput} value={q} onChangeText={setQ} placeholder="Search..." placeholderTextColor="#9ca3af" autoFocus />
          </View>
          <ScrollView style={ms.list} keyboardShouldPersistTaps="handled">
            {filtered.slice(0, 50).map(item => (
              <TouchableOpacity key={item._id} style={ms.option} onPress={() => { onSelect(item); onClose(); setQ(''); }}>
                {renderItem(item)}
              </TouchableOpacity>
            ))}
            {filtered.length === 0 && <Text style={ms.empty}>No results found</Text>}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginTop: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  title: { fontSize: 17, fontWeight: 'bold', color: '#111827' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, backgroundColor: '#fdfcfb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, fontSize: 15, color: '#1f2937' },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  option: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 32, fontSize: 14 },
});

// ─── Shared form field ────────────────────────────────────────────────────────
interface FProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboard?: KeyboardTypeOptions;
  cap?: 'none' | 'sentences' | 'words' | 'characters';
  required?: boolean;
}

function F({ label, value, onChange, placeholder, keyboard, cap, required }: FProps) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}{required ? ' *' : ''}</Text>
      <TextInput style={s.input} value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor="#9ca3af" keyboardType={keyboard || 'default'}
        autoCapitalize={cap || 'sentences'} />
    </View>
  );
}

// ─── Selected card display ────────────────────────────────────────────────────
interface SelectedCardProps {
  icon: IconName;
  title: string;
  subtitle?: string;
  onClear: () => void;
  color?: string;
}

function SelectedCard({ icon, title, subtitle, onClear, color = '#3b5ff8' }: SelectedCardProps) {
  return (
    <View style={[s.selectedCard, { borderColor: `${color}30` }]}>
      <View style={[s.selectedIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.selectedTitle}>{title}</Text>
        {subtitle ? <Text style={s.selectedSub}>{subtitle}</Text> : null}
      </View>
      <TouchableOpacity onPress={onClear} style={s.clearBtn}>
        <Ionicons name="close-circle" size={20} color="#9ca3af" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Tab toggle: Existing / New ───────────────────────────────────────────────
interface TabToggleProps {
  value: number;
  onChange: (i: number) => void;
  labels: string[];
}

function TabToggle({ value, onChange, labels }: TabToggleProps) {
  return (
    <View style={s.tabs}>
      {labels.map((l, i) => (
        <TouchableOpacity key={i} style={[s.tab, value === i && s.tabActive]} onPress={() => onChange(i)}>
          <Text style={[s.tabText, value === i && s.tabTextActive]}>{l}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

interface ComplaintDraft {
  description: string;
  priority: ComplaintPriority;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CreateJobCardScreen({ navigation }: Props) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Data lists
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [mechanics, setMechanics] = useState<User[]>([]);
  const [advisors, setAdvisors] = useState<User[]>([]);

  // Search modals
  const [showCustModal, setShowCustModal] = useState(false);
  const [showVehModal, setShowVehModal] = useState(false);

  // Customer
  const [custTab, setCustTab] = useState(0); // 0=existing, 1=new
  const [selCustomer, setSelCustomer] = useState<Customer | null>(null);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');

  // Vehicle
  const [vehTab, setVehTab] = useState(0); // 0=existing, 1=new
  const [selVehicle, setSelVehicle] = useState<Vehicle | null>(null);
  const [newPlate, setNewPlate] = useState('');
  const [newMake, setNewMake] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newYear, setNewYear] = useState('');
  const [newFuel, setNewFuel] = useState<FuelType>('petrol');

  // Work details
  const [serviceType, setServiceType] = useState<ServiceType>('service');
  const [advisorId, setAdvisorId] = useState('');
  const [mechanicId, setMechanicId] = useState('');
  // Multiple complaints — same shape as the web app
  const [complaints, setComplaints] = useState<ComplaintDraft[]>([{ description: '', priority: 'medium' }]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [odometerAtIntake, setOdometerAtIntake] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  useEffect(() => {
    getCustomers({ limit: 500 }).then(r => setCustomers(r.data || [])).catch(() => {});
    getVehicles({ limit: 500 }).then(r => setVehicles(r.data || [])).catch(() => {});
    getMechanics().then(setMechanics).catch(() => {});
    getAdvisors().then(setAdvisors).catch(() => {});
  }, []);

  // When customer changes in existing mode, filter vehicles by that customer
  const customerVehicles = selCustomer
    ? vehicles.filter(v => (typeof v.customer === 'object' ? v.customer?._id : v.customer) === selCustomer._id)
    : vehicles;
  // ── Complaint helpers ──
  const addComplaint = () =>
    setComplaints(prev => [...prev, { description: '', priority: 'medium' }]);

  const removeComplaint = (index: number) =>
    setComplaints(prev => prev.filter((_, i) => i !== index));

  const updateComplaint = (index: number, field: keyof ComplaintDraft, value: string) =>
    setComplaints(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

  const PRIORITY_OPTIONS: { value: ComplaintPriority; label: string; color: string }[] = [
    { value: 'low',    label: 'Low',    color: '#10b981' },
    { value: 'medium', label: 'Medium', color: '#f59e0b' },
    { value: 'high',   label: 'High',   color: '#ef4444' },
    { value: 'urgent', label: 'Urgent', color: '#7c3aed' },
  ];

  const handleNext = () => {
    if (custTab === 0 && !selCustomer) { Toast.show({ type: 'error', text1: 'Please select a customer' }); return; }
    if (custTab === 1 && (!newCustName.trim() || !newCustPhone.trim())) { Toast.show({ type: 'error', text1: 'Customer name and phone are required' }); return; }
    if (vehTab === 0 && !selVehicle) { Toast.show({ type: 'error', text1: 'Please select a vehicle' }); return; }
    if (vehTab === 1 && (!newPlate.trim() || !newMake.trim() || !newModel.trim())) { Toast.show({ type: 'error', text1: 'License plate, make and model are required' }); return; }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!advisorId) { Toast.show({ type: 'error', text1: 'Please assign a Service Advisor' }); return; }
    const validComplaints = complaints.filter(c => c.description.trim());
    if (validComplaints.length === 0) { Toast.show({ type: 'error', text1: 'Please add at least one complaint' }); return; }

    setLoading(true);
    try {
      let customerId: string, vehicleId: string;

      if (custTab === 0) {
        customerId = selCustomer!._id;
      } else {
        const { data } = await createCustomer({ name: newCustName.trim(), phone: newCustPhone.trim(), email: newCustEmail.trim() });
        customerId = data._id;
      }

      if (vehTab === 0) {
        vehicleId = selVehicle!._id;
      } else {
        const vp: Partial<Vehicle> & { customer: string } = {
          licensePlate: newPlate.trim().toUpperCase(), make: newMake.trim(), model: newModel.trim(),
          customer: customerId, fuelType: newFuel,
          year: newYear ? parseInt(newYear, 10) : undefined,
        };
        const { data } = await createVehicle(vp);
        vehicleId = data._id;
      }

      await createJobCard({
        serviceType,
        vehicle: vehicleId,
        customer: customerId,
        assignedAdvisor: advisorId || undefined,
        assignedMechanic: mechanicId || undefined,
        complaints: validComplaints,
        odometerAtIntake: odometerAtIntake ? parseInt(odometerAtIntake, 10) : undefined,
        expectedDeliveryDate: expectedDeliveryDate ? expectedDeliveryDate.toISOString() : undefined,
        internalNotes: internalNotes.trim() || undefined,
      });

      Toast.show({ type: 'success', text1: '✅ Job Card Created!' });
      navigation.goBack();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e, 'Failed to create Job Card') });
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>New Job Card</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Step Pills */}
        <View style={s.stepRow}>
          {['Customer & Vehicle', 'Work Details'].map((l, i) => (
            <View key={i} style={s.stepWrap}>
              <View style={[s.stepDot, step > i + 1 ? s.stepDone : step === i + 1 ? s.stepActive : s.stepPending]}>
                {step > i + 1
                  ? <Ionicons name="checkmark" size={13} color="#fff" />
                  : <Text style={s.stepNum}>{i + 1}</Text>}
              </View>
              <Text style={[s.stepLabel, step === i + 1 && { color: '#3b5ff8' }]}>{l}</Text>
              {i === 0 && <View style={[s.stepLine, step > 1 && { backgroundColor: '#3b5ff8' }]} />}
            </View>
          ))}
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
          {step === 1 ? (
            <>
              {/* ── CUSTOMER ── */}
              <View style={s.card}>
                <Text style={s.cardTitle}>👤 Customer</Text>
                <TabToggle value={custTab} onChange={t => { setCustTab(t); setSelCustomer(null); }} labels={['Existing Customer', 'New Customer']} />

                {custTab === 0 ? (
                  selCustomer ? (
                    <SelectedCard icon="person" title={selCustomer.name} subtitle={selCustomer.phone} onClear={() => setSelCustomer(null)} />
                  ) : (
                    <TouchableOpacity style={s.selectBtn} onPress={() => setShowCustModal(true)}>
                      <Ionicons name="search" size={18} color="#3b5ff8" />
                      <Text style={s.selectBtnText}>Search & select customer...</Text>
                    </TouchableOpacity>
                  )
                ) : (
                  <>
                    <F label="Full Name" value={newCustName} onChange={setNewCustName} placeholder="John Doe" required />
                    <F label="Phone" value={newCustPhone} onChange={setNewCustPhone} placeholder="9876543210" keyboard="phone-pad" cap="none" required />
                    <F label="Email" value={newCustEmail} onChange={setNewCustEmail} placeholder="email@example.com (optional)" keyboard="email-address" cap="none" />
                  </>
                )}
              </View>

              {/* ── VEHICLE ── */}
              <View style={s.card}>
                <Text style={s.cardTitle}>🚗 Vehicle</Text>
                <TabToggle value={vehTab} onChange={t => { setVehTab(t); setSelVehicle(null); }} labels={['Existing Vehicle', 'New Vehicle']} />

                {vehTab === 0 ? (
                  selVehicle ? (
                    <SelectedCard icon="car-sport" title={selVehicle.licensePlate} subtitle={`${selVehicle.make} ${selVehicle.model}`} onClear={() => setSelVehicle(null)} color="#10b981" />
                  ) : (
                    <TouchableOpacity style={s.selectBtn} onPress={() => setShowVehModal(true)}>
                      <Ionicons name="search" size={18} color="#3b5ff8" />
                      <Text style={s.selectBtnText}>
                        {selCustomer ? `Search vehicles for ${selCustomer.name}...` : 'Search & select vehicle...'}
                      </Text>
                    </TouchableOpacity>
                  )
                ) : (
                  <>
                    <F label="License Plate" value={newPlate} onChange={v => setNewPlate(v.toUpperCase())} placeholder="KA01AB1234" cap="characters" required />
                    <View style={s.rowFields}>
                      <View style={{ flex: 1 }}><F label="Make" value={newMake} onChange={setNewMake} placeholder="Honda" required /></View>
                      <View style={{ width: 12 }} />
                      <View style={{ flex: 1 }}><F label="Model" value={newModel} onChange={setNewModel} placeholder="City" required /></View>
                    </View>
                    <View style={s.rowFields}>
                      <View style={{ flex: 1 }}><F label="Year" value={newYear} onChange={setNewYear} placeholder="2024" keyboard="numeric" cap="none" /></View>
                      <View style={{ width: 12 }} />
                      <View style={{ flex: 1 }}>
                        <BottomSheetPicker
                          label="Fuel Type"
                          options={[
                            { value: 'petrol', label: 'Petrol' },
                            { value: 'diesel', label: 'Diesel' },
                            { value: 'cng', label: 'CNG' },
                            { value: 'electric', label: 'Electric' },
                            { value: 'hybrid', label: 'Hybrid' },
                          ]}
                          selectedValue={newFuel}
                          onValueChange={v => setNewFuel(v as FuelType)}
                        />
                      </View>
                    </View>
                  </>
                )}
              </View>

              <TouchableOpacity style={s.primaryBtn} onPress={handleNext} activeOpacity={0.85}>
                <Text style={s.primaryBtnText}>Next: Work Details</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* ── WORK DETAILS ── */}
              <View style={s.card}>
                <Text style={s.cardTitle}>🔧 Service Details</Text>

                <BottomSheetPicker
                  label="Service Type"
                  required
                  options={[
                    { value: 'service', label: 'Periodic Service', icon: 'build-outline', color: '#3b5ff8' },
                    { value: 'repair',  label: 'General Repair',   icon: 'construct-outline', color: '#f59e0b' },
                    { value: 'accident', label: 'Accident Repair', icon: 'warning-outline', color: '#ef4444' },
                  ]}
                  selectedValue={serviceType}
                  onValueChange={v => setServiceType(v as ServiceType)}
                />

                <View style={{ height: 14 }} />
                <BottomSheetPicker
                  label="Service Advisor *"
                  required
                  searchable
                  placeholder="Select advisor..."
                  options={advisors.map(a => ({ value: a._id, label: a.name, icon: 'person-outline' as const }))}
                  selectedValue={advisorId}
                  onValueChange={setAdvisorId}
                />

                <View style={{ height: 14 }} />
                <BottomSheetPicker
                  label="Assign Mechanic (Optional)"
                  searchable
                  placeholder="Unassigned"
                  options={mechanics.map(m => ({ value: m._id, label: m.name, icon: 'hammer-outline' as const }))}
                  selectedValue={mechanicId}
                  onValueChange={setMechanicId}
                />

                {/* Odometer + Expected Delivery Date */}
                <View style={[s.rowFields, { marginTop: 14 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>Odometer (km)</Text>
                    <TextInput
                      style={s.input}
                      value={odometerAtIntake}
                      onChangeText={setOdometerAtIntake}
                      keyboardType="numeric"
                      placeholder="e.g. 42000"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.label}>Expected Delivery</Text>
                    <TouchableOpacity
                      style={[s.input, s.dateTrigger]}
                      onPress={() => setShowDatePicker(true)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="calendar-outline" size={16} color={expectedDeliveryDate ? '#1f2937' : '#9ca3af'} />
                      <Text style={{ fontSize: 14, color: expectedDeliveryDate ? '#1f2937' : '#9ca3af', flex: 1 }}>
                        {expectedDeliveryDate
                          ? expectedDeliveryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                          : 'Select date'}
                      </Text>
                      {expectedDeliveryDate && (
                        <TouchableOpacity onPress={() => setExpectedDeliveryDate(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name="close-circle" size={16} color="#9ca3af" />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* ── Custom Date Picker Modal ── */}
              <CalendarModal
                visible={showDatePicker}
                selected={expectedDeliveryDate}
                onSelect={(d) => { setExpectedDeliveryDate(d); setShowDatePicker(false); }}
                onClose={() => setShowDatePicker(false)}
              />

              {/* ── COMPLAINTS ── */}
              <View style={s.card}>
                <View style={s.complaintHeader}>
                  <Text style={s.cardTitle}>⚠️ Customer Complaints *</Text>
                  <TouchableOpacity style={s.addComplaintBtn} onPress={addComplaint}>
                    <Ionicons name="add" size={16} color="#3b5ff8" />
                    <Text style={s.addComplaintText}>Add</Text>
                  </TouchableOpacity>
                </View>

                {complaints.map((c, i) => {
                  const cfg = PRIORITY_OPTIONS.find(p => p.value === c.priority) || PRIORITY_OPTIONS[1];
                  return (
                    <View key={i} style={s.complaintCard}>
                      <View style={s.complaintTop}>
                        <Text style={s.complaintNum}>#{i + 1}</Text>
                        {/* Priority cycle button */}
                        <TouchableOpacity
                          style={[s.priorityBadge, { backgroundColor: `${cfg.color}18`, borderColor: `${cfg.color}40` }]}
                          onPress={() => {
                            const idx = PRIORITY_OPTIONS.findIndex(p => p.value === c.priority);
                            const next = PRIORITY_OPTIONS[(idx + 1) % PRIORITY_OPTIONS.length];
                            updateComplaint(i, 'priority', next.value);
                          }}
                        >
                          <Text style={[s.priorityText, { color: cfg.color }]}>{cfg.label}</Text>
                          <Ionicons name="swap-horizontal" size={12} color={cfg.color} />
                        </TouchableOpacity>
                        {complaints.length > 1 && (
                          <TouchableOpacity onPress={() => removeComplaint(i)} style={s.removeComplaintBtn}>
                            <Ionicons name="trash-outline" size={16} color="#ef4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                      <TextInput
                        style={[s.input, { height: 72, textAlignVertical: 'top', marginTop: 8 }]}
                        value={c.description}
                        onChangeText={v => updateComplaint(i, 'description', v)}
                        multiline
                        placeholder="Describe the complaint or service needed..."
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                  );
                })}
              </View>

              {/* ── INTERNAL NOTES ── */}
              <View style={s.card}>
                <Text style={s.cardTitle}>📝 Internal Notes</Text>
                <TextInput
                  style={[s.input, { height: 80, textAlignVertical: 'top' }]}
                  value={internalNotes}
                  onChangeText={setInternalNotes}
                  multiline
                  placeholder="Any internal instructions or notes (not visible to customer)..."
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Summary */}
              <View style={s.summaryCard}>
                <Text style={s.summaryTitle}>Summary</Text>
                <View style={s.summaryRow}>
                  <Ionicons name="person-outline" size={15} color="#6b7280" />
                  <Text style={s.summaryText}>{custTab === 0 ? selCustomer?.name : (newCustName || '—')}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Ionicons name="car-outline" size={15} color="#6b7280" />
                  <Text style={s.summaryText}>{vehTab === 0 ? `${selVehicle?.licensePlate} · ${selVehicle?.make} ${selVehicle?.model}` : ((newPlate || newMake || newModel) ? `${newPlate} · ${newMake} ${newModel}` : '—')}</Text>
                </View>
              </View>

              <View style={s.btnRow}>
                <TouchableOpacity style={s.backBtn2} onPress={() => setStep(1)}>
                  <Ionicons name="arrow-back" size={18} color="#374151" />
                  <Text style={s.backBtn2Text}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.primaryBtn, { flex: 2, marginTop: 0 }, loading && { opacity: 0.65 }]}
                  onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
                  {loading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={s.primaryBtnText}>Create Job Card</Text></>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>

        {/* Search Modals */}
        <SearchModal<Customer>
          visible={showCustModal}
          onClose={() => setShowCustModal(false)}
          title="Select Customer"
          items={customers}
          searchKeys={['name', 'phone']}
          onSelect={c => { setSelCustomer(c); setSelVehicle(null); }}
          renderItem={c => (
            <>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>{c.name}</Text>
              <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{c.phone}{c.email ? ` · ${c.email}` : ''}</Text>
            </>
          )}
        />
        <SearchModal<Vehicle>
          visible={showVehModal}
          onClose={() => setShowVehModal(false)}
          title="Select Vehicle"
          items={customerVehicles}
          searchKeys={['licensePlate', 'make', 'model']}
          onSelect={v => setSelVehicle(v)}
          renderItem={v => (
            <>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', letterSpacing: 0.5 }}>{v.licensePlate}</Text>
              <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                {v.make} {v.model}{v.year ? ` (${v.year})` : ''} · {(typeof v.customer === 'object' ? v.customer?.name : '') || ''}
              </Text>
            </>
          )}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfcfb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 54 : 16, paddingBottom: 14, paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  // Steps
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  stepWrap: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' },
  stepActive: { backgroundColor: '#3b5ff8' },
  stepDone: { backgroundColor: '#10b981' },
  stepPending: { backgroundColor: '#e5e7eb' },
  stepNum: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  stepLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginLeft: 6, marginRight: 4, flexShrink: 1 },
  stepLine: { flex: 1, height: 2, backgroundColor: '#e5e7eb', marginHorizontal: 4 },
  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  // Card
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 14 },
  // Tabs
  tabs: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 16, padding: 3, marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 16 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#3b5ff8' },
  // Select button
  selectBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: '#3b5ff8', borderStyle: 'dashed', borderRadius: 16, padding: 14 },
  selectBtnText: { fontSize: 14, color: '#3b5ff8', fontWeight: '500' },
  // Selected card
  selectedCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 16, padding: 12 },
  selectedIcon: { width: 38, height: 38, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  selectedTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  selectedSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  clearBtn: { padding: 4 },
  // Form
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#fdfcfb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, paddingHorizontal: 12, height: 44, fontSize: 15, color: '#1f2937' },

  rowFields: { flexDirection: 'row' },
  // Date picker trigger button (looks like an input)
  dateTrigger: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 12 },
  // Summary
  summaryCard: { backgroundColor: '#f0f9ff', borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#bae6fd' },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: '#0369a1', marginBottom: 8 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  summaryText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  // Buttons
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3b5ff8', borderRadius: 16, paddingVertical: 15, marginTop: 4, shadowColor: '#3b5ff8', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  backBtn2: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 15, paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#f3f4f6' },
  backBtn2Text: { fontSize: 15, fontWeight: '600', color: '#374151' },
  // Complaints
  complaintHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  addComplaintBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#3b5ff8', borderStyle: 'dashed', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 },
  addComplaintText: { fontSize: 13, color: '#3b5ff8', fontWeight: '600' },
  complaintCard: { backgroundColor: '#fdfcfb', borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#f3f4f6' },
  complaintTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  complaintNum: { fontSize: 12, fontWeight: '700', color: '#9ca3af', minWidth: 20 },
  priorityBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  priorityText: { fontSize: 12, fontWeight: '700' },
  removeComplaintBtn: { marginLeft: 'auto', padding: 4 },
});
