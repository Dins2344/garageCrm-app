import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getJobCard, updateJobCard } from '../api/jobCardService';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'estimation_sent', label: 'Estimation Sent' },
  { value: 'approved', label: 'Approved' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'quality_check', label: 'Quality Check' },
  { value: 'ready_for_pickup', label: 'Ready for Pickup' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' }
];

export default function JobCardDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [jobCard, setJobCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const { data } = await getJobCard(id);
      setJobCard(data);
      setSelectedStatus(data.status);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to load details' });
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setSelectedStatus(newStatus);
    setUpdating(true);
    try {
      await updateJobCard(id, { status: newStatus });
      Toast.show({ type: 'success', text1: 'Status updated' });
      setJobCard(prev => ({ ...prev, status: newStatus }));
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to update status' });
      setSelectedStatus(jobCard.status); // Revert
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b5ff8" />
      </View>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return '#3b82f6';
      case 'estimation_sent': return '#f59e0b';
      case 'approved': return '#8b5cf6';
      case 'in_progress': return '#ec4899';
      case 'ready_for_pickup': return '#10b981';
      case 'delivered': return '#6b7280';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Card {jobCard?.jobCardNumber}</Text>
        <View style={{width: 24}}/>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        
        {/* Status Update section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Status</Text>
          <View style={styles.statusUpdateBox}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(selectedStatus) }]} />
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedStatus}
                onValueChange={handleStatusChange}
                enabled={!updating}
                style={styles.picker}
                dropdownIconColor="#111827"
              >
                {STATUS_OPTIONS.map(opt => (
                  <Picker.Item key={opt.value} label={opt.label} value={opt.value} color="#111827" />
                ))}
              </Picker>
            </View>
            {updating && <ActivityIndicator color="#3b5ff8" style={{marginLeft: 8}}/>}
          </View>
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

        {/* Complaints */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Complaints / Work Details</Text>
          <View style={styles.infoCard}>
            {jobCard?.complaints?.map((c, idx) => (
              <View key={idx} style={styles.complaintRow}>
                <Ionicons name="construct-outline" size={16} color="#4b5563" />
                <Text style={styles.complaintText}>{c.description}</Text>
              </View>
            ))}
            {jobCard?.internalNotes ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesTitle}>Internal Notes:</Text>
                <Text style={styles.notesText}>{jobCard.internalNotes}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Estimation overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estimation Summary</Text>
          <View style={styles.infoCard}>
             <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Parts:</Text>
                <Text style={styles.summaryValue}>₹{(jobCard?.estimation?.partsTotal || 0).toLocaleString('en-IN')}</Text>
             </View>
             <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Labour:</Text>
                <Text style={styles.summaryValue}>₹{(jobCard?.estimation?.laborTotal || 0).toLocaleString('en-IN')}</Text>
             </View>
             <View style={styles.divider} />
             <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelBold}>Grand Total:</Text>
                <Text style={styles.summaryValueBold}>₹{(jobCard?.estimation?.grandTotal || 0).toLocaleString('en-IN')}</Text>
             </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4b5563',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusUpdateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  pickerContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  picker: {
    height: 56,
    color: '#111827',
    marginLeft: -8,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoTextContainer: {
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  infoSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 12,
  },
  complaintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  complaintText: {
    fontSize: 15,
    color: '#374151',
    marginLeft: 8,
  },
  notesBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6b7280',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#111827',
  },
  summaryLabelBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  summaryValueBold: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b5ff8',
  }
});
