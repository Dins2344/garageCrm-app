import React, { useState, useEffect, ComponentProps } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { getVehicle, getVehicleHistory } from '../api/vehicleService';
import type { RootStackScreenProps } from '../types/navigation';
import type { Vehicle, JobCard, FuelType, JobStatus } from '../types/models';

type Props = RootStackScreenProps<'VehicleDetail'>;
type IconName = ComponentProps<typeof Ionicons>['name'];

const FUEL_COLOR: Partial<Record<FuelType, string>> = { petrol: '#ef4444', diesel: '#3b82f6', electric: '#10b981', hybrid: '#8b5cf6' };

const STATUS_CONFIG: Partial<Record<JobStatus, { label: string; color: string }>> = {
  new: { label: 'New', color: '#3b82f6' },
  estimation_sent: { label: 'Estimation Sent', color: '#f59e0b' },
  approved: { label: 'Approved', color: '#8b5cf6' },
  in_progress: { label: 'In Progress', color: '#ec4899' },
  ready_for_pickup: { label: 'Ready for Pickup', color: '#10b981' },
  delivered: { label: 'Delivered', color: '#6b7280' },
  cancelled: { label: 'Cancelled', color: '#ef4444' },
};

interface InfoRowProps {
  icon: IconName;
  label: string;
  value?: string | null;
  valueColor?: string;
}

function InfoRow({ icon, label, value, valueColor }: InfoRowProps) {
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

export default function VehicleDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [vehicleRes, historyRes] = await Promise.all([
        getVehicle(id),
        getVehicleHistory(id, { limit: 50 }).catch(() => ({ success: true, count: 0, total: 0, pages: 1, currentPage: 1, data: [] as JobCard[] })),
      ]);
      setVehicle(vehicleRes.data);
      setJobCards(historyRes.data || []);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load vehicle details' });
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const fuelType = (vehicle.fuelType?.toLowerCase() || 'petrol') as FuelType;
  const fuelColor = FUEL_COLOR[fuelType] || '#6b7280';
  const owner = typeof vehicle.customer === 'object' ? vehicle.customer : null;

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
        <InfoRow icon="speedometer-outline" label="Current Odometer" value={vehicle.currentOdometerReading ? `${vehicle.currentOdometerReading.toLocaleString('en-IN')} km` : null} />
      </View>

      {/* Owner Details */}
      {owner && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Owner Details</Text>
          <InfoRow icon="person-outline" label="Name" value={owner.name} />
          <InfoRow icon="call-outline" label="Phone" value={owner.phone} />
          <InfoRow icon="mail-outline" label="Email" value={owner.email} />
          <InfoRow
            icon="location-outline"
            label="City"
            value={owner.address?.city}
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
            const statusCfg = (jc.status && STATUS_CONFIG[jc.status]) || { label: jc.status, color: '#6b7280' };
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
    backgroundColor: '#fdfcfb',
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
    shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
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
    borderRadius: 160,
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
    borderRadius: 16,
    padding: 16,
    shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
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
  jobCardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 160,
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
