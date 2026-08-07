import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getJobCard, updateJobCard, approveJobCardEstimation } from '../api/jobCardService';
import { createInvoice } from '../api/invoiceService';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import StatusStepper from '../components/StatusStepper';
import { useAuth } from '../context/AuthContext';

export default function JobCardDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { hasRole } = useAuth();
  const [jobCard, setJobCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Re-fetch whenever this screen comes into focus (e.g. returning from estimation editor)
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [id])
  );

  const fetchData = async () => {
    try {
      const { data } = await getJobCard(id);
      setJobCard(data);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to load details' });
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'cancelled') {
      Alert.alert(
        'Cancel Job Card',
        'Are you sure you want to cancel this job card? This action is hard to reverse.',
        [
          { text: 'No, Keep It', style: 'cancel' },
          { text: 'Yes, Cancel', style: 'destructive', onPress: () => doStatusUpdate(newStatus) }
        ]
      );
      return;
    }
    if (newStatus === 'estimation_sent') {
      const hasParts = jobCard?.estimation?.parts?.length > 0;
      const hasLabor = jobCard?.estimation?.labor?.length > 0;
      if (!hasParts && !hasLabor) {
        Toast.show({ type: 'error', text1: 'Please add at least one part or labor item.' });
        return;
      }
    }

    if (newStatus === 'delivered' && !jobCard?.invoice) {
      Toast.show({ type: 'error', text1: 'Cannot mark as delivered', text2: 'Please generate an invoice first.' });
      return;
    }

    doStatusUpdate(newStatus);
  };

  const doStatusUpdate = async (newStatus) => {
    setUpdating(true);
    try {
      await updateJobCard(id, { status: newStatus });
      Toast.show({ type: 'success', text1: 'Status updated' });
      setJobCard(prev => ({ ...prev, status: newStatus }));
    } catch (error) {
      Toast.show({ type: 'error', text1: error?.response?.data?.message || 'Failed to update status' });
    } finally {
      setUpdating(false);
    }
  };

  const handleApproveEstimation = () => {
    Alert.alert(
      'Approve Estimation',
      'Approve this estimation on behalf of the customer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve', onPress: async () => {
            try {
              await approveJobCardEstimation(id);
              Toast.show({ type: 'success', text1: 'Estimation approved!' });
              fetchData();
            } catch (e) {
              Toast.show({ type: 'error', text1: 'Failed to approve' });
            }
          }
        }
      ]
    );
  };

  const handleGenerateInvoice = () => {
    Alert.alert(
      'Generate Invoice?',
      'This will finalize the estimation, update statuses, and notify the customer.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate Invoice',
          onPress: async () => {
            try {
              const { data } = await createInvoice({ jobCardId: id });
              Toast.show({ type: 'success', text1: `Invoice ${data.invoiceNumber} created!` });
              fetchData();
            } catch (e) {
              Toast.show({ type: 'error', text1: e?.response?.data?.message || 'Failed to create invoice' });
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b5ff8" />
      </View>
    );
  }

  const est = jobCard?.estimation;
  const hasEstimation = est && est.grandTotal > 0;
  const canEditEstimation = hasRole('owner', 'admin', 'service_advisor') && !jobCard?.invoice;
  const canApprove = hasEstimation && !est?.approvedByCustomer &&
    jobCard?.status !== 'cancelled' && jobCard?.status !== 'delivered' &&
    hasRole('owner', 'admin', 'service_advisor');
  const canGenerateInvoice = est?.approvedByCustomer && !jobCard?.invoice &&
    jobCard?.status !== 'cancelled' && jobCard?.status !== 'delivered' &&
    hasRole('owner', 'admin', 'service_advisor');
  const hasInvoice = !!jobCard?.invoice;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Card {jobCard?.jobCardNumber}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        {/* Status Pipeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <StatusStepper
            currentStatus={jobCard?.status}
            onStatusChange={handleStatusChange}
            updating={updating}
            hasInvoice={hasInvoice}
          />
        </View>

        {/* Customer & Vehicle info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer & Vehicle</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#6b7280" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>{jobCard?.customer?.name}</Text>
                <Text style={styles.infoSubtitle}>{jobCard?.customer?.phone}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Ionicons name="car-outline" size={20} color="#6b7280" />
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>{jobCard?.vehicle?.licensePlate}</Text>
                <Text style={styles.infoSubtitle}>{jobCard?.vehicle?.make} {jobCard?.vehicle?.model}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Service Details + Complaints */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Details</Text>
          <View style={styles.infoCard}>
            {/* Odometer + Expected Delivery */}
            <View style={styles.detailsGrid}>
              {jobCard?.odometerAtIntake > 0 && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Odometer</Text>
                  <Text style={styles.detailValue}>{jobCard.odometerAtIntake?.toLocaleString('en-IN')} km</Text>
                </View>
              )}
              {jobCard?.expectedDeliveryDate && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Expected Delivery</Text>
                  <Text style={styles.detailValue}>
                    {new Date(jobCard.expectedDeliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              )}
            </View>

            {/* Complaints */}
            {(jobCard?.odometerAtIntake > 0 || jobCard?.expectedDeliveryDate) && <View style={styles.divider} />}
            <Text style={styles.subLabel}>Complaints</Text>
            {jobCard?.complaints?.map((c, idx) => {
              const priorityColor = c.priority === 'urgent' ? '#7c3aed' : c.priority === 'high' ? '#ef4444' : c.priority === 'medium' ? '#f59e0b' : '#10b981';
              return (
                <View key={idx} style={styles.complaintRow}>
                  <View style={[styles.priorityDot, { backgroundColor: `${priorityColor}20`, borderColor: `${priorityColor}50` }]}>
                    <Text style={[styles.priorityLabel, { color: priorityColor }]}>{(c.priority || 'medium').toUpperCase().slice(0, 3)}</Text>
                  </View>
                  <Text style={styles.complaintText}>{c.description}</Text>
                </View>
              );
            })}
            {(!jobCard?.complaints || jobCard.complaints.length === 0) && (
              <Text style={styles.emptyText}>No complaints logged</Text>
            )}

            {/* Internal Notes */}
            {jobCard?.internalNotes ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesTitle}>Internal Notes:</Text>
                <Text style={styles.notesText}>{jobCard.internalNotes}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── ESTIMATION ── */}
        <View style={styles.section}>
          <View style={styles.estHeader}>
            <Text style={styles.sectionTitle}>Estimation</Text>
            {canEditEstimation && (
              <TouchableOpacity
                style={styles.editEstBtn}
                onPress={() => navigation.navigate('EstimationEditor', { id })}
              >
                <Ionicons name="pencil-outline" size={14} color="#3b5ff8" />
                <Text style={styles.editEstText}>{hasEstimation ? 'Edit' : 'Add'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {hasEstimation ? (
            <View style={styles.infoCard}>
              {/* Parts breakdown */}
              {est.parts?.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={styles.estSubheading}>Parts</Text>
                  {est.parts.map((p, i) => (
                    <View key={i} style={styles.estItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.estItemName}>{p.partName}</Text>
                        <Text style={styles.estItemMeta}>{p.quantity} × ₹{p.unitPrice?.toLocaleString('en-IN')}</Text>
                      </View>
                      <Text style={styles.estItemTotal}>₹{p.total?.toLocaleString('en-IN')}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Labor breakdown */}
              {est.labor?.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={styles.estSubheading}>Labor</Text>
                  {est.labor.map((l, i) => (
                    <View key={i} style={styles.estItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.estItemName}>{l.description}</Text>
                        <Text style={styles.estItemMeta}>{l.hours}h × ₹{l.ratePerHour?.toLocaleString('en-IN')}/hr</Text>
                      </View>
                      <Text style={styles.estItemTotal}>₹{l.total?.toLocaleString('en-IN')}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.divider} />

              {/* Summary totals */}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Parts Total</Text>
                <Text style={styles.summaryValue}>₹{(est.partsTotal || 0).toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Labor Total</Text>
                <Text style={styles.summaryValue}>₹{(est.laborTotal || 0).toLocaleString('en-IN')}</Text>
              </View>
              {est.discount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: '#10b981' }]}>Discount</Text>
                  <Text style={[styles.summaryValue, { color: '#10b981' }]}>-₹{est.discount?.toLocaleString('en-IN')}</Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax ({est.taxRate || 0}%)</Text>
                <Text style={styles.summaryValue}>₹{(est.taxAmount || 0).toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelBold}>Grand Total</Text>
                <Text style={styles.summaryValueBold}>₹{(est.grandTotal || 0).toLocaleString('en-IN')}</Text>
              </View>

              {/* Approved badge */}
              {est.approvedByCustomer && (
                <View style={styles.approvedBanner}>
                  <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                  <Text style={styles.approvedText}>Estimation Approved</Text>
                </View>
              )}

              {/* Approve button */}
              {canApprove && (
                <TouchableOpacity style={styles.approveBtn} onPress={handleApproveEstimation} activeOpacity={0.8}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                  <Text style={styles.approveBtnText}>Approve Estimation</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.infoCard}>
              <View style={styles.noEstimation}>
                <Ionicons name="document-text-outline" size={36} color="#e5e7eb" />
                <Text style={styles.noEstText}>No estimation yet</Text>
                {canEditEstimation && (
                  <TouchableOpacity
                    style={styles.addEstBtn}
                    onPress={() => navigation.navigate('EstimationEditor', { id })}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#3b5ff8" />
                    <Text style={styles.addEstBtnText}>Add Estimation</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        {/* ── INVOICE ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice</Text>
          {hasInvoice ? (
            <TouchableOpacity
              style={styles.invoiceCard}
              onPress={() => navigation.navigate('InvoiceViewer', { invoiceId: jobCard.invoice._id || jobCard.invoice })}
              activeOpacity={0.85}
            >
              <View style={styles.invoiceIcon}>
                <Ionicons name="receipt-outline" size={24} color="#3b5ff8" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.invoiceNumber}>
                  {typeof jobCard.invoice === 'object' ? jobCard.invoice.invoiceNumber : 'View Invoice'}
                </Text>
                <Text style={styles.invoiceSub}>Tap to view full invoice details</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          ) : canGenerateInvoice ? (
            <TouchableOpacity style={styles.generateBtn} onPress={handleGenerateInvoice} activeOpacity={0.85}>
              <Ionicons name="document-text-outline" size={20} color="#fff" />
              <Text style={styles.generateBtnText}>Generate Invoice</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.infoCard}>
              <View style={styles.noEstimation}>
                <Ionicons name="receipt-outline" size={32} color="#e5e7eb" />
                <Text style={styles.noEstText}>
                  {!hasEstimation
                    ? 'Add an estimation first'
                    : !est?.approvedByCustomer
                      ? 'Approve the estimation to generate invoice'
                      : 'No invoice yet'}
                </Text>
              </View>
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfcfb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 14, fontWeight: 'bold', color: '#4b5563', marginBottom: 12,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoTextContainer: { marginLeft: 12 },
  infoTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  infoSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 12 },
  complaintRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 8 },
  priorityDot: { borderRadius: 4, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 2, minWidth: 36, alignItems: 'center' },
  priorityLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  complaintText: { fontSize: 14, color: '#374151', flex: 1 },
  subLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 4 },
  detailItem: { flex: 1, minWidth: '45%' },
  detailLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  emptyText: { fontSize: 14, color: '#9ca3af', fontStyle: 'italic' },
  notesBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  notesTitle: { fontSize: 12, fontWeight: 'bold', color: '#6b7280', marginBottom: 4 },
  notesText: { fontSize: 14, color: '#374151', fontStyle: 'italic' },

  // Estimation header
  estHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  editEstBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#eef2ff', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5,
  },
  editEstText: { fontSize: 13, color: '#3b5ff8', fontWeight: '600' },

  // Estimation items
  estSubheading: {
    fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 8,
  },
  estItemRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f9fafb',
  },
  estItemName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  estItemMeta: { fontSize: 12, color: '#9ca3af', marginTop: 1 },
  estItemTotal: { fontSize: 14, fontWeight: 'bold', color: '#111827' },

  // Summary
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 14, color: '#6b7280' },
  summaryValue: { fontSize: 14, color: '#111827' },
  summaryLabelBold: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  summaryValueBold: { fontSize: 18, fontWeight: 'bold', color: '#3b5ff8' },

  // Approved
  approvedBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 12, paddingVertical: 10, borderRadius: 16,
    backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#bbf7d0',
  },
  approvedText: { fontSize: 14, fontWeight: '700', color: '#10b981' },

  // Approve button
  approveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 12, paddingVertical: 12, borderRadius: 16,
    backgroundColor: '#10b981',
    shadowColor: '#10b981', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  approveBtnText: { fontSize: 15, fontWeight: 'bold', color: '#fff' },

  // No estimation
  noEstimation: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  noEstText: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },
  addEstBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#3b5ff8',
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8,
  },
  addEstBtnText: { fontSize: 14, color: '#3b5ff8', fontWeight: '600' },

  // Invoice
  invoiceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
    borderWidth: 1, borderColor: '#eef2ff',
  },
  invoiceIcon: {
    width: 44, height: 44, borderRadius: 16, backgroundColor: '#eef2ff',
    justifyContent: 'center', alignItems: 'center',
  },
  invoiceNumber: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  invoiceSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#f59e0b', borderRadius: 16, paddingVertical: 14,
    shadowColor: '#f59e0b', shadowOpacity: 0.3, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
