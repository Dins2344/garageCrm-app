import React, { useState, useEffect } from 'react';
import { useGarage } from '../context/GarageContext';
import { formatMoney, formatNumber, formatDate } from '../utils/format';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Platform, StatusBar, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { getInvoice, updateInvoicePayment, deleteInvoice, getInvoicePdfUrl } from '../api/invoiceService';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import BottomSheetPicker from '../components/BottomSheetPicker';
import ResponsiveScreen, { SHEET_MAX_WIDTH } from '../components/ResponsiveScreen';
import type { RootStackScreenProps } from '../types/navigation';
import type { Invoice, PaymentMethod } from '../types/models';
import { getErrorMessage } from '../utils/errors';

type Props = RootStackScreenProps<'InvoiceViewer'>;

export default function InvoiceViewerScreen({ route, navigation }: Props) {
  const { locale } = useGarage();
  const money = (n?: number) => formatMoney(n, locale);
  const { invoiceId } = route.params;
  const { hasRole } = useAuth();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  const fetchInvoice = async () => {
    try {
      const { data } = await getInvoice(invoiceId);
      setInvoice(data);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load invoice' });
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  const handleMarkPaid = async () => {
    if (!invoice) return;
    setPaying(true);
    try {
      await updateInvoicePayment(invoiceId, {
        amountPaid: invoice.grandTotal,
        paymentMethod,
      });
      Toast.show({ type: 'success', text1: 'Payment recorded!' });
      setShowPayModal(false);
      fetchInvoice();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to update payment' });
    } finally {
      setPaying(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Invoice?',
      'Cancelling this invoice will reopen the job card for editing and automatically restore inventory stock levels.',
      [
        { text: 'Keep Invoice', style: 'cancel' },
        {
          text: 'Cancel Invoice', style: 'destructive',
          onPress: async () => {
            try {
              await deleteInvoice(invoiceId);
              Toast.show({ type: 'success', text1: 'Invoice cancelled & job reopened!' });
              navigation.goBack();
            } catch (e) {
              Toast.show({ type: 'error', text1: getErrorMessage(e, 'Failed to cancel invoice') });
            }
          }
        }
      ]
    );
  };

  const handleDownload = async () => {
    if (!invoice) return;
    setDownloading(true);
    try {
      const [token, garageId] = await Promise.all([
        AsyncStorage.getItem('garagepulse_token'),
        AsyncStorage.getItem('garagepulse_active_garage'),
      ]);
      const fileUri = FileSystem.documentDirectory + `Invoice-${invoice?.invoiceNumber || 'download'}.pdf`;

      // Downloaded natively straight to disk (with the auth + garage headers
      // attached) rather than fetched through axios as an arraybuffer — RN's
      // JS engine has no `btoa`/`atob` global, so converting the response to
      // base64 manually threw at runtime on every attempt. This bypasses the
      // shared axios interceptor, so both headers are attached manually here.
      await FileSystem.downloadAsync(getInvoicePdfUrl(invoiceId), fileUri, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(garageId ? { 'X-Garage-Id': garageId } : {}),
        },
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Invoice ${invoice?.invoiceNumber}`,
        });
      } else {
        Toast.show({ type: 'success', text1: 'PDF saved', text2: fileUri });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to download PDF' });
    } finally {
      setDownloading(false);
    }
  };

  const fmt = (n?: number) => money(n);

  const fmtDate = (d?: string | null) =>
    d ? formatDate(d, locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  if (loading) {
    return (
      <ResponsiveScreen>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color="#3b5ff8" />
        </View>
      </ResponsiveScreen>
    );
  }

  if (!invoice) return null;

  const paymentColors: Record<string, { bg: string; border: string; text: string }> = {
    paid: { bg: '#ecfdf5', border: '#bbf7d0', text: '#166534' },
    unpaid: { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412' },
    partial: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
  };
  const pColors = paymentColors[invoice.paymentStatus] || paymentColors.unpaid;
  const customer = typeof invoice.customer === 'object' ? invoice.customer : null;
  const vehicle = typeof invoice.vehicle === 'object' ? invoice.vehicle : null;
  const jobCard = typeof invoice.jobCard === 'object' ? invoice.jobCard : null;

  const header = (
    <View style={s.headerInner}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
        <Ionicons name="arrow-back" size={24} color="#111827" />
      </TouchableOpacity>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={s.headerTitle}>{invoice.invoiceNumber}</Text>
        <Text style={s.headerSub}>Invoice</Text>
      </View>
      <TouchableOpacity onPress={handleDownload} disabled={downloading} style={s.downloadBtn}>
        {downloading ? (
          <ActivityIndicator size="small" color="#3b5ff8" />
        ) : (
          <Ionicons name="download-outline" size={22} color="#3b5ff8" />
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <>
    <ResponsiveScreen backgroundColor="#fdfcfb">
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {/* Header — uses SafeAreaView on iOS, manual status bar offset on Android */}
      {Platform.OS === 'ios' ? (
        <SafeAreaView style={s.safeHeader}>{header}</SafeAreaView>
      ) : (
        <View style={s.header}>{header}</View>
      )}

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>

        {/* ── PAYMENT STATUS ── */}
        <View style={[s.statusBanner, { backgroundColor: pColors.bg, borderColor: pColors.border }]}>
          <Ionicons
            name={invoice.paymentStatus === 'paid' ? 'checkmark-circle' : invoice.paymentStatus === 'partial' ? 'time-outline' : 'alert-circle-outline'}
            size={22}
            color={pColors.text}
          />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[s.statusTitle, { color: pColors.text }]}>
              {invoice.paymentStatus === 'paid' && 'Payment Received'}
              {invoice.paymentStatus === 'unpaid' && 'Payment Pending'}
              {invoice.paymentStatus === 'partial' && 'Partial Payment'}
            </Text>
            {invoice.paymentStatus !== 'unpaid' && (
              <Text style={[s.statusMeta, { color: pColors.text }]}>
                Paid: {fmt(invoice.amountPaid)}
                {invoice.paymentMethod ? ` via ${invoice.paymentMethod.replace('_', ' ')}` : ''}
                {invoice.paidAt ? ` on ${fmtDate(invoice.paidAt)}` : ''}
              </Text>
            )}
            {invoice.paymentStatus === 'partial' && (
              <Text style={[s.statusDue, { color: '#ef4444' }]}>
                Due: {fmt(invoice.grandTotal - invoice.amountPaid)}
              </Text>
            )}
          </View>
        </View>

        {/* ── INVOICE META ── */}
        <View style={s.card}>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Invoice No.</Text>
            <Text style={s.metaValue}>{invoice.invoiceNumber}</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Date</Text>
            <Text style={s.metaValue}>{fmtDate(invoice.createdAt)}</Text>
          </View>
          {jobCard?.jobCardNumber && (
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Job Card</Text>
              <Text style={s.metaValue}>{jobCard.jobCardNumber}</Text>
            </View>
          )}
        </View>

        {/* ── CUSTOMER & VEHICLE ── */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <View style={[s.card, { flex: 1 }]}>
            <Text style={s.cardLabel}>BILL TO</Text>
            <Text style={s.cardTitle}>{customer?.name || '—'}</Text>
            {customer?.phone && (
              <Text style={s.cardSub}>📞 {customer.phone}</Text>
            )}
            {customer?.email && (
              <Text style={s.cardSub}>✉️ {customer.email}</Text>
            )}
            {(customer?.address?.street || customer?.address?.city) && (
              <Text style={s.cardSub}>
                📍 {[customer.address?.street, customer.address?.city].filter(Boolean).join(', ')}
              </Text>
            )}
          </View>
          <View style={[s.card, { flex: 1 }]}>
            <Text style={s.cardLabel}>VEHICLE</Text>
            <Text style={s.cardTitle}>{vehicle?.licensePlate || '—'}</Text>
            <Text style={s.cardSub}>
              {vehicle?.make} {vehicle?.model}
              {vehicle?.year ? ` (${vehicle.year})` : ''}
            </Text>
            {jobCard?.odometerAtIntake !== undefined && jobCard?.odometerAtIntake !== null && (
              <Text style={s.cardSub}>Kilometers Run: {formatNumber(jobCard.odometerAtIntake, locale)} km</Text>
            )}
          </View>
        </View>

        {/* ── PARTS ── */}
        {invoice.parts?.length > 0 && (
          <View style={s.card}>
            <Text style={s.tableHeading}>Parts & Materials</Text>
            {invoice.parts.map((p, i) => (
              <View key={i} style={s.tableRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemName}>{p.partName}</Text>
                  <Text style={s.itemDetail}>{p.quantity} × {fmt(p.unitPrice)}</Text>
                </View>
                <Text style={s.itemTotal}>{fmt(p.total)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── LABOR ── */}
        {invoice.labor?.length > 0 && (
          <View style={s.card}>
            <Text style={s.tableHeading}>Labor Charges</Text>
            {invoice.labor.map((l, i) => (
              <View key={i} style={s.tableRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemName}>{l.description}</Text>
                  <Text style={s.itemDetail}>{l.hours}h × {fmt(l.ratePerHour)}/hr</Text>
                </View>
                <Text style={s.itemTotal}>{fmt(l.total)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── TOTALS ── */}
        <View style={s.totalsCard}>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>Subtotal</Text>
            <Text style={s.totalsValue}>{fmt(invoice.subtotal)}</Text>
          </View>
          {invoice.discount > 0 && (
            <View style={s.totalsRow}>
              <Text style={[s.totalsLabel, { color: '#10b981' }]}>Discount</Text>
              <Text style={[s.totalsValue, { color: '#10b981' }]}>-{fmt(invoice.discount)}</Text>
            </View>
          )}
          <View style={s.totalsRow}>
            {/* `?? 0`, never `?? 18`: a zero-tax country would otherwise show a fabricated 18% line on a real invoice. */}
            <Text style={s.totalsLabel}>{locale.taxLabel} ({invoice.taxRate ?? 0}%)</Text>
            <Text style={s.totalsValue}>{fmt(invoice.taxAmount)}</Text>
          </View>
          <View style={s.totalsDivider} />
          <View style={s.totalsRow}>
            <Text style={s.grandLabel}>Total Amount</Text>
            <Text style={s.grandValue}>{fmt(invoice.grandTotal)}</Text>
          </View>
        </View>

        {/* ── NOTES ── */}
        {invoice.notes ? (
          <View style={s.notesCard}>
            <Text style={s.notesLabel}>NOTES / REMARKS</Text>
            <Text style={s.notesText}>{invoice.notes}</Text>
          </View>
        ) : null}

        {/* ── ACTION BUTTONS ── */}
        <View style={s.actions}>
          {/* Mark as Paid */}
          {invoice.paymentStatus !== 'paid' && hasRole('owner', 'admin', 'service_advisor') && (
            <TouchableOpacity
              style={s.paidBtn}
              onPress={() => setShowPayModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={s.paidBtnText}>Mark as Paid</Text>
            </TouchableOpacity>
          )}

          {/* Download PDF */}
          <TouchableOpacity
            style={s.downloadActionBtn}
            onPress={handleDownload}
            disabled={downloading}
            activeOpacity={0.85}
          >
            {downloading ? (
              <ActivityIndicator color="#3b5ff8" size="small" />
            ) : (
              <>
                <Ionicons name="download-outline" size={18} color="#3b5ff8" />
                <Text style={s.downloadActionText}>Download PDF</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Cancel Invoice */}
          {hasRole('owner', 'admin') && (
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
              <Text style={s.cancelBtnText}>Cancel Invoice</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={s.footer}>Thank you for your business!</Text>
      </ScrollView>
    </View>
    </ResponsiveScreen>

      {/* ── PAYMENT METHOD MODAL ── kept outside ResponsiveScreen so the
          backdrop dims the true full screen width on tablets, not just the
          capped content column. */}
      {showPayModal && (
        <View style={s.payOverlay}>
          <View style={s.paySheet}>
            <View style={s.payHandle} />
            <Text style={s.payTitle}>Record Payment</Text>
            <Text style={s.payAmount}>Amount: {fmt(invoice.grandTotal)}</Text>

            <BottomSheetPicker
              label="Payment Method"
              options={[
                { value: 'cash', label: 'Cash', icon: 'cash-outline', color: '#10b981' },
                { value: 'upi', label: 'UPI', icon: 'phone-portrait-outline', color: '#8b5cf6' },
                { value: 'card', label: 'Card', icon: 'card-outline', color: '#3b82f6' },
                { value: 'bank_transfer', label: 'Bank Transfer', icon: 'business-outline', color: '#f59e0b' },
              ]}
              selectedValue={paymentMethod}
              onValueChange={v => setPaymentMethod(v as PaymentMethod)}
            />

            <View style={s.payActions}>
              <TouchableOpacity style={s.payCancelBtn} onPress={() => setShowPayModal(false)}>
                <Text style={s.payCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.payConfirmBtn, paying && { opacity: 0.6 }]}
                onPress={handleMarkPaid}
                disabled={paying}
              >
                {paying ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.payConfirmText}>Confirm Payment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfcfb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header — iOS uses SafeAreaView, Android uses manual StatusBar offset
  safeHeader: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 14, paddingHorizontal: 16, paddingTop: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: (StatusBar.currentHeight || 24) + 10,
    paddingBottom: 14, paddingHorizontal: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#111827' },
  headerSub: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  downloadBtn: { padding: 4 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Status banner
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16,
    borderWidth: 1, marginBottom: 16,
  },
  statusTitle: { fontSize: 15, fontWeight: 'bold' },
  statusMeta: { fontSize: 12, marginTop: 2, opacity: 0.85 },
  statusDue: { fontSize: 13, fontWeight: 'bold', marginTop: 4 },

  // Cards
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12,
    shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4, borderWidth: 1, borderColor: '#f3f4f6',
  },
  cardLabel: { fontSize: 10, fontWeight: '800', color: '#9ca3af', letterSpacing: 0.8, marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827', marginBottom: 3 },
  cardSub: { fontSize: 12, color: '#6b7280', marginTop: 1 },

  // Meta
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  metaLabel: { fontSize: 13, color: '#6b7280' },
  metaValue: { fontSize: 13, fontWeight: '600', color: '#111827' },

  // Table
  tableHeading: {
    fontSize: 11, fontWeight: '800', color: '#374151', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 8,
  },
  tableRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f9fafb',
  },
  itemName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  itemDetail: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  itemTotal: { fontSize: 14, fontWeight: 'bold', color: '#111827' },

  // Totals
  totalsCard: {
    backgroundColor: '#fdfcfb', borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  totalsLabel: { fontSize: 13, color: '#6b7280' },
  totalsValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
  totalsDivider: { height: 1, backgroundColor: '#d1d5db', marginVertical: 10 },
  grandLabel: { fontSize: 17, fontWeight: 'bold', color: '#111827' },
  grandValue: { fontSize: 20, fontWeight: 'bold', color: '#3b5ff8' },

  // Notes
  notesCard: {
    backgroundColor: '#fefce8', borderRadius: 16, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#fde68a',
  },
  notesLabel: { fontSize: 10, fontWeight: '800', color: '#a16207', letterSpacing: 0.8, marginBottom: 4 },
  notesText: { fontSize: 13, color: '#92400e', lineHeight: 18 },

  // Actions
  actions: { gap: 10, marginTop: 8, marginBottom: 16 },
  paidBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#10b981', borderRadius: 16, paddingVertical: 14,
    shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  paidBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  downloadActionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#eef2ff', borderRadius: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#c7d2fe',
  },
  downloadActionText: { color: '#3b5ff8', fontSize: 15, fontWeight: '600' },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 16,
    borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff5f5',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: '#ef4444' },

  footer: {
    textAlign: 'center', color: '#9ca3af', fontSize: 13, fontWeight: '500',
    marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6',
    borderStyle: 'dashed',
  },

  // Payment modal
  payOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', alignItems: 'center',
  },
  paySheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, width: '100%', maxWidth: SHEET_MAX_WIDTH,
  },
  payHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb',
    alignSelf: 'center', marginBottom: 16,
  },
  payTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  payAmount: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  payActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  payCancelBtn: {
    flex: 1, padding: 14, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center',
  },
  payCancelText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  payConfirmBtn: {
    flex: 1.5, padding: 14, borderRadius: 16, backgroundColor: '#10b981', alignItems: 'center',
  },
  payConfirmText: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
});
