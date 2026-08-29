import React, { useState, useEffect, ComponentProps } from 'react';
import { useGarage } from '../context/GarageContext';
import { formatMoney, formatNumber, formatDate as fmtDate } from '../utils/format';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { getVehicle, getVehicleHistory } from '../api/vehicleService';
import ResponsiveScreen from '../components/ResponsiveScreen';
import type { RootStackScreenProps } from '../types/navigation';
import type { Vehicle, JobCard, FuelType, JobStatus } from '../types/models';
import { colors, palette, radius } from '../theme';

type Props = RootStackScreenProps<'VehicleDetail'>;
type IconName = ComponentProps<typeof Ionicons>['name'];

const FUEL_COLOR: Partial<Record<FuelType, string>> = { petrol: colors.danger, diesel: colors.info, electric: colors.success, hybrid: palette.violet500 };

const STATUS_CONFIG: Partial<Record<JobStatus, { label: string; color: string }>> = {
  new: { label: 'New', color: colors.info },
  estimation_sent: { label: 'Estimation Sent', color: colors.warning },
  approved: { label: 'Approved', color: palette.violet500 },
  in_progress: { label: 'In Progress', color: palette.pink500 },
  ready_for_pickup: { label: 'Ready for Pickup', color: colors.success },
  delivered: { label: 'Delivered', color: colors.textMuted },
  cancelled: { label: 'Cancelled', color: colors.danger },
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
        <Ionicons name={icon} size={16} color={colors.textMuted} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, valueColor && { color: valueColor }]}>{value}</Text>
      </View>
    </View>
  );
}

export default function VehicleDetailScreen({ route, navigation }: Props) {
  const { locale } = useGarage();
  const money = (n?: number) => formatMoney(n, locale);
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
      <ResponsiveScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading vehicle...</Text>
        </View>
      </ResponsiveScreen>
    );
  }

  if (!vehicle) return null;

  const fuelType = (vehicle.fuelType?.toLowerCase() || 'petrol') as FuelType;
  const fuelColor = FUEL_COLOR[fuelType] || colors.textMuted;
  const owner = typeof vehicle.customer === 'object' ? vehicle.customer : null;

  return (
    <ResponsiveScreen>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Hero Header */}
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons name="car-sport" size={40} color={colors.primary} />
        </View>
        <Text style={styles.heroPlate}>{vehicle.licensePlate}</Text>
        <Text style={styles.heroMakeModel}>
          {vehicle.make} {vehicle.model}
          {vehicle.year ? ` · ${vehicle.year}` : ''}
        </Text>
        {vehicle.color && (
          <View style={styles.colorTag}>
            <Ionicons name="color-palette-outline" size={13} color={colors.textMuted} />
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
        <InfoRow icon="speedometer-outline" label="Current Odometer" value={vehicle.currentOdometerReading ? `${formatNumber(vehicle.currentOdometerReading, locale)} km` : null} />
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
            <Ionicons name="clipboard-outline" size={36} color={colors.border} />
            <Text style={styles.emptyHistoryText}>No service records yet</Text>
          </View>
        ) : (
          jobCards.map((jc) => {
            const statusCfg = (jc.status && STATUS_CONFIG[jc.status]) || { label: jc.status, color: colors.textMuted };
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
                    {jc.createdAt ? fmtDate(jc.createdAt, locale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </Text>
                </View>
                <View style={styles.jobCardRight}>
                  <View style={[styles.statusBadge, { backgroundColor: `${statusCfg.color}15` }]}>
                    <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                  </View>
                  {jc.estimation?.grandTotal ? (
                    <Text style={styles.jobCardAmount}>
                      {money(jc.estimation.grandTotal)}
                    </Text>
                  ) : null}
                  <Ionicons name="chevron-forward" size={16} color={colors.borderStrong} style={{ marginTop: 4 }} />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
    </ResponsiveScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.textFaint,
    fontSize: 14,
  },
  heroCard: {
    backgroundColor: colors.surface,
    margin: 16,
    borderRadius: radius.lg,
    padding: 24,
    alignItems: 'center',
    shadowColor: colors.shadowAmbient, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroPlate: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  heroMakeModel: {
    fontSize: 15,
    color: colors.textMuted,
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
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  fuelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
    marginTop: 10,
  },
  fuelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: radius.lg,
    padding: 16,
    shadowColor: colors.shadowAmbient, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSunken,
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
    color: colors.textFaint,
    fontWeight: '500',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: colors.textStrong,
    fontWeight: '500',
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyHistoryText: {
    fontSize: 14,
    color: colors.textFaint,
  },
  jobCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  jobCardLeft: {
    flex: 1,
    paddingRight: 8,
  },
  jobCardNumber: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.primary,
  },
  jobCardDate: {
    fontSize: 12,
    color: colors.textFaint,
    marginTop: 3,
  },
  jobCardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  jobCardAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
});
