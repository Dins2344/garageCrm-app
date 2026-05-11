import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { getJobCard, saveJobCardEstimation } from '../api/jobCardService';
import { getInventoryItems } from '../api/inventoryService';
import BottomSheetPicker from '../components/BottomSheetPicker';

export default function EstimationEditorScreen({ route, navigation }) {
  const { id } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [jobCard, setJobCard] = useState(null);
  const [inventory, setInventory] = useState([]);

  const [parts, setParts] = useState([]);
  const [labor, setLabor] = useState([]);
  const [discount, setDiscount] = useState('0');
  const [taxRate, setTaxRate] = useState('18');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [jcRes, invRes] = await Promise.all([
        getJobCard(id),
        getInventoryItems({ limit: 1000 }).catch(() => ({ data: [] })),
      ]);
      const jc = jcRes.data;
      setJobCard(jc);
      setInventory(invRes.data || []);

      // Populate from existing estimation
      if (jc.estimation) {
        setParts((jc.estimation.parts || []).map(p => ({
          partName: p.partName || '',
          quantity: String(p.quantity || 1),
          unitPrice: String(p.unitPrice || 0),
          inventoryItem: p.inventoryItem || '',
        })));
        setLabor((jc.estimation.labor || []).map(l => ({
          description: l.description || '',
          hours: String(l.hours || 1),
          ratePerHour: String(l.ratePerHour || 500),
        })));
        setDiscount(String(jc.estimation.discount || 0));
        setTaxRate(String(jc.estimation.taxRate || 18));
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to load data' });
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // ── Parts handlers ──
  const addPart = () => {
    setParts([...parts, { partName: '', quantity: '1', unitPrice: '0', inventoryItem: '' }]);
  };

  const updatePart = (index, field, value) => {
    const updated = [...parts];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-fill from inventory
    if (field === 'inventoryItem' && value) {
      const item = inventory.find(i => i._id === value);
      if (item) {
        updated[index].partName = item.partName;
        updated[index].unitPrice = String(item.sellingPrice || item.unitPrice || 0);
      }
    }
    setParts(updated);
  };

  const removePart = (index) => {
    Alert.alert('Remove Part', 'Delete this part from the estimation?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setParts(parts.filter((_, i) => i !== index)) }
    ]);
  };

  // ── Labor handlers ──
  const addLabor = () => {
    setLabor([...labor, { description: '', hours: '1', ratePerHour: '500' }]);
  };

  const updateLabor = (index, field, value) => {
    const updated = [...labor];
    updated[index] = { ...updated[index], [field]: value };
    setLabor(updated);
  };

  const removeLabor = (index) => {
    Alert.alert('Remove Labor', 'Delete this labor item?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setLabor(labor.filter((_, i) => i !== index)) }
    ]);
  };

  // ── Totals calculation (matches web logic exactly) ──
  const partsTotal = parts.reduce((sum, p) => sum + (parseFloat(p.quantity) || 0) * (parseFloat(p.unitPrice) || 0), 0);
  const laborTotal = labor.reduce((sum, l) => sum + (parseFloat(l.hours) || 0) * (parseFloat(l.ratePerHour) || 0), 0);
  const subtotal = partsTotal + laborTotal;
  const disc = parseFloat(discount) || 0;
  const tax = parseFloat(taxRate) || 0;
  const taxAmount = ((subtotal - disc) * tax) / 100;
  const grandTotal = subtotal - disc + taxAmount;

  // ── Save ──
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        parts: parts.map(p => ({
          partName: p.partName,
          quantity: parseFloat(p.quantity) || 0,
          unitPrice: parseFloat(p.unitPrice) || 0,
          inventoryItem: p.inventoryItem || undefined,
        })),
        labor: labor.map(l => ({
          description: l.description,
          hours: parseFloat(l.hours) || 0,
          ratePerHour: parseFloat(l.ratePerHour) || 0,
        })),
        discount: disc,
        taxRate: tax,
      };
      await saveJobCardEstimation(id, payload);
      Toast.show({ type: 'success', text1: 'Estimation saved!' });
      navigation.goBack();
    } catch (e) {
      Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed to save estimation' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color="#3b5ff8" />
      </View>
    );
  }

  const fmt = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

  const inventoryOptions = inventory.map(i => ({
    value: i._id,
    label: `${i.partName} — ₹${i.sellingPrice || i.unitPrice} (Stock: ${i.quantity})`,
  }));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={s.headerTitle}>Edit Estimation</Text>
            <Text style={s.headerSub}>{jobCard?.jobCardNumber}</Text>
          </View>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={[s.saveHeaderBtn, saving && { opacity: 0.5 }]}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveHeaderText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">

          {/* ── PARTS SECTION ── */}
          <View style={s.sectionHeader}>
            <Ionicons name="cube-outline" size={18} color="#3b5ff8" />
            <Text style={s.sectionTitle}>Parts</Text>
            <TouchableOpacity onPress={addPart} style={s.addBtn}>
              <Ionicons name="add" size={16} color="#3b5ff8" />
              <Text style={s.addBtnText}>Add Part</Text>
            </TouchableOpacity>
          </View>

          {parts.length === 0 && (
            <View style={s.emptyState}>
              <Ionicons name="cube-outline" size={32} color="#e5e7eb" />
              <Text style={s.emptyText}>No parts added yet</Text>
            </View>
          )}

          {parts.map((part, i) => (
            <View key={i} style={s.itemCard}>
              {/* Inventory lookup */}
              <BottomSheetPicker
                label="From Inventory (optional)"
                placeholder="Select from inventory..."
                searchable
                options={inventoryOptions}
                selectedValue={part.inventoryItem}
                onValueChange={v => updatePart(i, 'inventoryItem', v)}
              />

              <View style={{ height: 10 }} />
              <View style={s.fieldRow}>
                <View style={{ flex: 2 }}>
                  <Text style={s.fieldLabel}>Part Name</Text>
                  <TextInput
                    style={s.input}
                    value={part.partName}
                    onChangeText={v => updatePart(i, 'partName', v)}
                    placeholder="Part name"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>

              <View style={s.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Qty</Text>
                  <TextInput
                    style={s.input}
                    value={part.quantity}
                    onChangeText={v => updatePart(i, 'quantity', v)}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Unit Price (₹)</Text>
                  <TextInput
                    style={s.input}
                    value={part.unitPrice}
                    onChangeText={v => updatePart(i, 'unitPrice', v)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                  <Text style={s.fieldLabel}>Total</Text>
                  <View style={s.totalBox}>
                    <Text style={s.totalText}>{fmt((parseFloat(part.quantity) || 0) * (parseFloat(part.unitPrice) || 0))}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity onPress={() => removePart(i)} style={s.removeBtn}>
                <Ionicons name="trash-outline" size={14} color="#ef4444" />
                <Text style={s.removeBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* ── LABOR SECTION ── */}
          <View style={[s.sectionHeader, { marginTop: 24 }]}>
            <Ionicons name="construct-outline" size={18} color="#f59e0b" />
            <Text style={s.sectionTitle}>Labor</Text>
            <TouchableOpacity onPress={addLabor} style={s.addBtn}>
              <Ionicons name="add" size={16} color="#3b5ff8" />
              <Text style={s.addBtnText}>Add Labor</Text>
            </TouchableOpacity>
          </View>

          {labor.length === 0 && (
            <View style={s.emptyState}>
              <Ionicons name="construct-outline" size={32} color="#e5e7eb" />
              <Text style={s.emptyText}>No labor items added yet</Text>
            </View>
          )}

          {labor.map((l, i) => (
            <View key={i} style={s.itemCard}>
              <View style={s.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Description</Text>
                  <TextInput
                    style={s.input}
                    value={l.description}
                    onChangeText={v => updateLabor(i, 'description', v)}
                    placeholder="Labor description"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>

              <View style={s.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Hours</Text>
                  <TextInput
                    style={s.input}
                    value={l.hours}
                    onChangeText={v => updateLabor(i, 'hours', v)}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Rate/Hr (₹)</Text>
                  <TextInput
                    style={s.input}
                    value={l.ratePerHour}
                    onChangeText={v => updateLabor(i, 'ratePerHour', v)}
                    keyboardType="numeric"
                    placeholder="500"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                  <Text style={s.fieldLabel}>Total</Text>
                  <View style={s.totalBox}>
                    <Text style={s.totalText}>{fmt((parseFloat(l.hours) || 0) * (parseFloat(l.ratePerHour) || 0))}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity onPress={() => removeLabor(i)} style={s.removeBtn}>
                <Ionicons name="trash-outline" size={14} color="#ef4444" />
                <Text style={s.removeBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* ── DISCOUNT & TAX ── */}
          <View style={[s.sectionHeader, { marginTop: 24 }]}>
            <Ionicons name="calculator-outline" size={18} color="#10b981" />
            <Text style={s.sectionTitle}>Discount & Tax</Text>
          </View>

          <View style={s.itemCard}>
            <View style={s.fieldRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Discount (₹)</Text>
                <TextInput
                  style={s.input}
                  value={discount}
                  onChangeText={setDiscount}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              <View style={{ width: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>Tax Rate (%)</Text>
                <TextInput
                  style={s.input}
                  value={taxRate}
                  onChangeText={setTaxRate}
                  keyboardType="numeric"
                  placeholder="18"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>
          </View>

          {/* ── LIVE TOTALS ── */}
          <View style={s.totalsCard}>
            <Text style={s.totalsTitle}>ESTIMATION SUMMARY</Text>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Parts Total</Text>
              <Text style={s.totalsValue}>{fmt(partsTotal)}</Text>
            </View>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Labor Total</Text>
              <Text style={s.totalsValue}>{fmt(laborTotal)}</Text>
            </View>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Subtotal</Text>
              <Text style={s.totalsValue}>{fmt(subtotal)}</Text>
            </View>
            {disc > 0 && (
              <View style={s.totalsRow}>
                <Text style={[s.totalsLabel, { color: '#10b981' }]}>Discount</Text>
                <Text style={[s.totalsValue, { color: '#10b981' }]}>-{fmt(disc)}</Text>
              </View>
            )}
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Tax ({tax}%)</Text>
              <Text style={s.totalsValue}>{fmt(taxAmount)}</Text>
            </View>
            <View style={s.totalsDivider} />
            <View style={s.totalsRow}>
              <Text style={s.grandLabel}>Grand Total</Text>
              <Text style={s.grandValue}>{fmt(grandTotal)}</Text>
            </View>
          </View>

          {/* Save button at bottom */}
          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={s.saveBtnText}>Save Estimation</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 54 : 16, paddingBottom: 14, paddingHorizontal: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#111827' },
  headerSub: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  saveHeaderBtn: {
    backgroundColor: '#3b5ff8', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7,
  },
  saveHeaderText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Section headers
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12,
  },
  sectionTitle: { flex: 1, fontSize: 14, fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#3b5ff8', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5, borderStyle: 'dashed',
  },
  addBtnText: { fontSize: 13, color: '#3b5ff8', fontWeight: '600' },

  // Item cards
  itemCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 1, borderWidth: 1, borderColor: '#f3f4f6',
  },
  fieldRow: { flexDirection: 'row', marginBottom: 8 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: {
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8,
    paddingHorizontal: 10, height: 40, fontSize: 14, color: '#1f2937',
  },
  totalBox: {
    backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd', borderRadius: 8,
    height: 40, justifyContent: 'center', paddingHorizontal: 10,
  },
  totalText: { fontSize: 14, fontWeight: 'bold', color: '#0369a1' },

  removeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-end', marginTop: 4, paddingVertical: 4, paddingHorizontal: 8,
  },
  removeBtnText: { fontSize: 12, color: '#ef4444', fontWeight: '600' },

  // Empty
  emptyState: {
    alignItems: 'center', paddingVertical: 24, gap: 8,
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#f3f4f6', borderStyle: 'dashed',
  },
  emptyText: { fontSize: 13, color: '#9ca3af' },

  // Totals
  totalsCard: {
    backgroundColor: '#eef2ff', borderRadius: 14, padding: 16, marginTop: 24,
    borderWidth: 1, borderColor: '#c7d2fe',
  },
  totalsTitle: { fontSize: 11, fontWeight: '800', color: '#4338ca', letterSpacing: 1, marginBottom: 12 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  totalsLabel: { fontSize: 14, color: '#6b7280' },
  totalsValue: { fontSize: 14, color: '#111827', fontWeight: '600' },
  totalsDivider: { height: 1, backgroundColor: '#a5b4fc', marginVertical: 8 },
  grandLabel: { fontSize: 17, fontWeight: 'bold', color: '#111827' },
  grandValue: { fontSize: 20, fontWeight: 'bold', color: '#3b5ff8' },

  // Save button
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#3b5ff8', borderRadius: 12, paddingVertical: 16, marginTop: 20,
    shadowColor: '#3b5ff8', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
