import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { getCustomers, createCustomer } from '../api/customerService';
import { getVehicles, createVehicle } from '../api/vehicleService';
import { getMechanics, getAdvisors } from '../api/userService';
import { createJobCard } from '../api/jobCardService';

// ─── Search + Select Modal ────────────────────────────────────────────────────
function SearchModal({ visible, onClose, title, items, onSelect, renderItem, searchKeys }) {
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
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, fontSize: 15, color: '#1f2937' },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  option: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 32, fontSize: 14 },
});

// ─── Shared form field ────────────────────────────────────────────────────────
function F({ label, value, onChange, placeholder, keyboard, cap, required }) {
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
function SelectedCard({ icon, title, subtitle, onClear, color = '#3b5ff8' }) {
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
function TabToggle({ value, onChange, labels }) {
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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CreateJobCardScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Data lists
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [advisors, setAdvisors] = useState([]);

  // Search modals
  const [showCustModal, setShowCustModal] = useState(false);
  const [showVehModal, setShowVehModal] = useState(false);

  // Customer
  const [custTab, setCustTab] = useState(0); // 0=existing, 1=new
  const [selCustomer, setSelCustomer] = useState(null);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');

  // Vehicle
  const [vehTab, setVehTab] = useState(0); // 0=existing, 1=new
  const [selVehicle, setSelVehicle] = useState(null);
  const [newPlate, setNewPlate] = useState('');
  const [newMake, setNewMake] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newYear, setNewYear] = useState('');
  const [newFuel, setNewFuel] = useState('petrol');

  // Work details
  const [serviceType, setServiceType] = useState('service');
  const [advisorId, setAdvisorId] = useState('');
  const [mechanicId, setMechanicId] = useState('');
  const [complaint, setComplaint] = useState('');

  useEffect(() => {
    getCustomers({ limit: 500 }).then(r => setCustomers(r.data || [])).catch(() => {});
    getVehicles({ limit: 500 }).then(r => setVehicles(r.data || [])).catch(() => {});
    getMechanics().then(setMechanics).catch(() => {});
    getAdvisors().then(setAdvisors).catch(() => {});
  }, []);

  // When customer changes in existing mode, filter vehicles by that customer
  const customerVehicles = selCustomer
    ? vehicles.filter(v => v.customer?._id === selCustomer._id || v.customer === selCustomer._id)
    : vehicles;

  const handleNext = () => {
    if (custTab === 0 && !selCustomer) { Toast.show({ type: 'error', text1: 'Please select a customer' }); return; }
    if (custTab === 1 && (!newCustName.trim() || !newCustPhone.trim())) { Toast.show({ type: 'error', text1: 'Customer name and phone are required' }); return; }
    if (vehTab === 0 && !selVehicle) { Toast.show({ type: 'error', text1: 'Please select a vehicle' }); return; }
    if (vehTab === 1 && (!newPlate.trim() || !newMake.trim() || !newModel.trim())) { Toast.show({ type: 'error', text1: 'License plate, make and model are required' }); return; }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!advisorId) { Toast.show({ type: 'error', text1: 'Please assign a Service Advisor' }); return; }
    setLoading(true);
    try {
      let customerId, vehicleId;

      if (custTab === 0) {
        customerId = selCustomer._id;
      } else {
        const { data } = await createCustomer({ name: newCustName.trim(), phone: newCustPhone.trim(), email: newCustEmail.trim() });
        customerId = data._id;
      }

      if (vehTab === 0) {
        vehicleId = selVehicle._id;
      } else {
        const vp = { licensePlate: newPlate.trim().toUpperCase(), make: newMake.trim(), model: newModel.trim(), customer: customerId, fuelType: newFuel };
        if (newYear) vp.year = parseInt(newYear);
        const { data } = await createVehicle(vp);
        vehicleId = data._id;
      }

      await createJobCard({
        serviceType,
        vehicle: vehicleId,
        customer: customerId,
        assignedAdvisor: advisorId || undefined,
        assignedMechanic: mechanicId || undefined,
        complaints: complaint.trim() ? [{ description: complaint.trim(), priority: 'medium' }] : [],
      });

      Toast.show({ type: 'success', text1: '✅ Job Card Created!' });
      navigation.goBack();
    } catch (e) {
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed to create Job Card' });
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
                        <Text style={s.label}>Fuel Type</Text>
                        <View style={s.pickerWrap}>
                          <Picker selectedValue={newFuel} onValueChange={setNewFuel} style={{ height: 44 }}>
                            <Picker.Item label="Petrol" value="petrol" />
                            <Picker.Item label="Diesel" value="diesel" />
                            <Picker.Item label="CNG" value="cng" />
                            <Picker.Item label="Electric" value="electric" />
                            <Picker.Item label="Hybrid" value="hybrid" />
                          </Picker>
                        </View>
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

                <Text style={s.label}>Service Type *</Text>
                <View style={s.pickerWrap}>
                  <Picker selectedValue={serviceType} onValueChange={setServiceType} style={{ height: 44 }}>
                    <Picker.Item label="Periodic Service" value="service" />
                    <Picker.Item label="General Repair" value="repair" />
                    <Picker.Item label="Accident Repair" value="accident" />
                  </Picker>
                </View>

                <View style={{ height: 14 }} />
                <Text style={s.label}>Service Advisor *</Text>
                <View style={s.pickerWrap}>
                  <Picker selectedValue={advisorId} onValueChange={setAdvisorId} style={{ height: 44 }}>
                    <Picker.Item label="Select advisor..." value="" />
                    {advisors.map(a => <Picker.Item key={a._id} label={a.name} value={a._id} />)}
                  </Picker>
                </View>

                <View style={{ height: 14 }} />
                <Text style={s.label}>Assign Mechanic (Optional)</Text>
                <View style={s.pickerWrap}>
                  <Picker selectedValue={mechanicId} onValueChange={setMechanicId} style={{ height: 44 }}>
                    <Picker.Item label="Unassigned" value="" />
                    {mechanics.map(m => <Picker.Item key={m._id} label={m.name} value={m._id} />)}
                  </Picker>
                </View>

                <View style={{ height: 14 }} />
                <Text style={s.label}>Primary Complaint</Text>
                <TextInput style={[s.input, { height: 88, textAlignVertical: 'top' }]}
                  value={complaint} onChangeText={setComplaint} multiline placeholder="Describe the issue..." placeholderTextColor="#9ca3af" />
              </View>

              {/* Summary */}
              <View style={s.summaryCard}>
                <Text style={s.summaryTitle}>Summary</Text>
                <View style={s.summaryRow}>
                  <Ionicons name="person-outline" size={15} color="#6b7280" />
                  <Text style={s.summaryText}>{custTab === 0 ? selCustomer?.name : newCustName || '—'}</Text>
                </View>
                <View style={s.summaryRow}>
                  <Ionicons name="car-outline" size={15} color="#6b7280" />
                  <Text style={s.summaryText}>{vehTab === 0 ? `${selVehicle?.licensePlate} · ${selVehicle?.make} ${selVehicle?.model}` : `${newPlate} · ${newMake} ${newModel}` || '—'}</Text>
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
        <SearchModal
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
        <SearchModal
          visible={showVehModal}
          onClose={() => setShowVehModal(false)}
          title="Select Vehicle"
          items={customerVehicles}
          searchKeys={['licensePlate', 'make', 'model']}
          onSelect={v => setSelVehicle(v)}
          renderItem={v => (
            <>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', letterSpacing: 0.5 }}>{v.licensePlate}</Text>
              <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{v.make} {v.model}{v.year ? ` (${v.year})` : ''} · {v.customer?.name || ''}</Text>
            </>
          )}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
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
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 14 },
  // Tabs
  tabs: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 10, padding: 3, marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabTextActive: { color: '#3b5ff8' },
  // Select button
  selectBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: '#3b5ff8', borderStyle: 'dashed', borderRadius: 10, padding: 14 },
  selectBtnText: { fontSize: 14, color: '#3b5ff8', fontWeight: '500' },
  // Selected card
  selectedCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 10, padding: 12 },
  selectedIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  selectedTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  selectedSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  clearBtn: { padding: 4 },
  // Form
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 15, color: '#1f2937' },
  pickerWrap: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, overflow: 'hidden' },
  rowFields: { flexDirection: 'row' },
  // Summary
  summaryCard: { backgroundColor: '#f0f9ff', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#bae6fd' },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: '#0369a1', marginBottom: 8 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  summaryText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  // Buttons
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#3b5ff8', borderRadius: 12, paddingVertical: 15, marginTop: 4, shadowColor: '#3b5ff8', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  backBtn2: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 15, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#f3f4f6' },
  backBtn2Text: { fontSize: 15, fontWeight: '600', color: '#374151' },
});
