import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, RefreshControl, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { getVehicle, getVehicleHistory } from '../api/vehicleService';

const FUEL_COLOR = { petrol: '#ef4444', diesel: '#3b82f6', electric: '#10b981', hybrid: '#8b5cf6' };

const STATUS_CONFIG = {
  new: { label: 'New', color: '#3b82f6' },
  estimation_sent: { label: 'Estimation Sent', color: '#f59e0b' },
  approved: { label: 'Approved', color: '#8b5cf6' },
  in_progress: { label: 'In Progress', color: '#ec4899' },
  ready_for_pickup: { label: 'Ready for Pickup', color: '#10b981' },
  delivered: { label: 'Delivered', color: '#6b7280' },
  cancelled: { label: 'Cancelled', color: '#ef4444' },
};

function InfoRow({ icon, label, value, valueColor }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color="#6b7280" />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, valueColor && { color: valueColor }]}>{value}</Text>
      </View>
    </View>
  );
}

export default function VehicleDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [vehicle, setVehicle] = useState(null);
  const [jobCards, setJobCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [vehicleRes, historyRes] = await Promise.all([
        getVehicle(id),
        getVehicleHistory(id, { limit: 50 }).catch(() => ({ data: [] })),
      ]);
      setVehicle(vehicleRes.data);
      setJobCards(historyRes.data || []);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to load vehicle details' });
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b5ff8" />
        <Text style={styles.loadingText}>Loading vehicle...</Text>
      </View>
    );
  }

  if (!vehicle) return null;

  const fuelType = vehicle.fuelType?.toLowerCase() || 'petrol';
  const fuelColor = FUEL_COLOR[fuelType] || '#6b7280';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b5ff8" />}
    >
      {/* Hero Header */}
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name="car-sport" size={40} color="#3b5ff8" />
        </View>
        <Text style={styles.heroPlate}>{vehicle.licensePlate}</Text>
        <Text style={styles.heroMakeModel}>
          {vehicle.make} {vehicle.model}
          {vehicle.year ? ` · ${vehicle.year}` : ''}
        </Text>
        {vehicle.color && (
          <View style={styles.colorTag}>
            <Ionicons name="color-palette-outline" size={13} color="#6b7280" />
            <Text style={styles.colorTagText}>{vehicle.color}</Text>
          </View>
        )}
        <View style={[styles.fuelBadge, { backgroundColor: `${fuelColor}18` }]}>
          <Text style={[styles.fuelText, { color: fuelColor }]}>
            {fuelType.charAt(0).toUpperCase() + fuelType.slice(1)}
          </Text>
        </View>
      </View>

      {/* Vehicle Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vehicle Information</Text>
        <InfoRow icon="car-outline" label="Make & Model" value={`${vehicle.make} ${vehicle.model}`} />
        <InfoRow icon="calendar-outline" label="Year" value={vehicle.year?.toString()} />
        <InfoRow icon="hardware-chip-outline" label="Engine Number" value={vehicle.engineNumber} />
        <InfoRow icon="barcode-outline" label="Chassis Number" value={vehicle.chassisNumber} />
        <InfoRow icon="speedometer-outline" label="Current Mileage" value={vehicle.mileage ? `${vehicle.mileage.toLocaleString('en-IN')} km` : null} />
        <InfoRow icon="construct-outline" label="Transmission" value={vehicle.transmission} />
      </View>

      {/* Owner Details */}
      {vehicle.customer && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Owner Details</Text>
          <InfoRow icon="person-outline" label="Name" value={vehicle.customer.name} />
          <InfoRow icon="call-outline" label="Phone" value={vehicle.customer.phone} />
          <InfoRow icon="mail-outline" label="Email" value={vehicle.customer.email} />
          <InfoRow
            icon="location-outline"
            label="City"
            value={vehicle.customer.address?.city}
          />
        </View>
      )}

      {/* Service History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service History ({jobCards.length})</Text>
        {jobCards.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Ionicons name="clipboard-outline" size={36} color="#e5e7eb" />
            <Text style={styles.emptyHistoryText}>No service records yet</Text>
          </View>
        ) : (
          jobCards.map((jc) => {
            const statusCfg = STATUS_CONFIG[jc.status] || { label: jc.status, color: '#6b7280' };
            return (
              <TouchableOpacity
                key={jc._id}
                style={styles.jobCardRow}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('JobCardDetail', { id: jc._id })}
              >
                <View style={styles.jobCardLeft}>
                  <Text style={styles.jobCardNumber}>{jc.jobCardNumber}</Text>
                  <Text style={styles.jobCardDate}>
                    {jc.createdAt ? new Date(jc.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </Text>
                  {jc.description ? (
                    <Text style={styles.jobCardDesc} numberOfLines={1}>{jc.description}</Text>
                  ) : null}
                </View>
                <View style={styles.jobCardRight}>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusCfg.color}15` }]}>
                    <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                  </View>
                  {jc.estimation?.grandTotal ? (
                    <Text style={styles.jobCardAmount}>
                      ₹{jc.estimation.grandTotal.toLocaleString('en-IN')}
                    </Text>
                  ) : null}
                  <Ionicons name="chevron-forward" size={16} color="#d1d5db" style={{ marginTop: 4 }} />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  heroCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#eff2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroPlate: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#111827',
    letterSpacing: 1,
  },
  heroMakeModel: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: 4,
  },
  colorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  colorTagText: {
    fontSize: 13,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  fuelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    marginTop: 10,
  },
  fuelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
    gap: 10,
  },
  infoIcon: {
    width: 28,
    alignItems: 'center',
    paddingTop: 1,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '500',
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyHistoryText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  jobCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  jobCardLeft: {
    flex: 1,
    paddingRight: 8,
  },
  jobCardNumber: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#3b5ff8',
  },
  jobCardDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 3,
  },
  jobCardDesc: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 3,
  },
  jobCardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  jobCardAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
});
