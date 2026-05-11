import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const STATUS_FLOW = [
  { value: 'new',              label: 'New',              icon: 'add-circle-outline',    color: '#3b82f6' },
  { value: 'estimation_sent',  label: 'Estimation Sent',  icon: 'send-outline',          color: '#f59e0b' },
  { value: 'approved',         label: 'Approved',         icon: 'checkmark-circle-outline', color: '#8b5cf6' },
  { value: 'in_progress',      label: 'In Progress',      icon: 'construct-outline',     color: '#ec4899' },
  { value: 'quality_check',    label: 'Quality Check',    icon: 'shield-checkmark-outline', color: '#06b6d4' },
  { value: 'ready_for_pickup', label: 'Ready for Pickup', icon: 'car-outline',           color: '#10b981' },
  { value: 'delivered',        label: 'Delivered',        icon: 'checkmark-done-outline', color: '#6b7280' },
];

const CANCELLED = { value: 'cancelled', label: 'Cancelled', icon: 'close-circle-outline', color: '#ef4444' };

/**
 * Visual pipeline stepper for job card status.
 *
 * Props:
 *  - currentStatus : string
 *  - onStatusChange: (newStatus) => void
 *  - updating      : boolean
 *  - hasInvoice    : boolean — required for 'delivered' transition
 */
export default function StatusStepper({ currentStatus, onStatusChange, updating, hasInvoice }) {
  const currentIndex = STATUS_FLOW.findIndex(s => s.value === currentStatus);
  const isCancelled = currentStatus === 'cancelled';

  // User can only move to the *next* step or cancel
  const nextStep = currentIndex >= 0 && currentIndex < STATUS_FLOW.length - 1
    ? STATUS_FLOW[currentIndex + 1]
    : null;

  // Block "delivered" if no invoice
  const deliveredBlocked = nextStep?.value === 'delivered' && !hasInvoice;

  return (
    <View style={styles.container}>
      {/* Pipeline visualization */}
      <View style={styles.pipeline}>
        {STATUS_FLOW.map((step, i) => {
          const isPast = !isCancelled && i < currentIndex;
          const isCurrent = !isCancelled && i === currentIndex;
          const isFuture = isCancelled || i > currentIndex;

          return (
            <View key={step.value} style={styles.stepRow}>
              {/* Connector line (above) */}
              {i > 0 && (
                <View style={[styles.connectorLine, isPast || isCurrent ? { backgroundColor: step.color } : {}]} />
              )}

              {/* Step node */}
              <View style={styles.stepNode}>
                <View style={[
                  styles.circle,
                  isCurrent && { backgroundColor: step.color, borderColor: step.color },
                  isPast && { backgroundColor: step.color, borderColor: step.color },
                  isFuture && { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' },
                ]}>
                  {isPast ? (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  ) : isCurrent ? (
                    <Ionicons name={step.icon} size={14} color="#fff" />
                  ) : (
                    <View style={styles.futureDot} />
                  )}
                </View>

                <Text style={[
                  styles.stepLabel,
                  isCurrent && { color: step.color, fontWeight: '700' },
                  isPast && { color: '#6b7280' },
                ]} numberOfLines={2}>
                  {step.label}
                </Text>

                {isCurrent && (
                  <View style={[styles.currentBadge, { backgroundColor: step.color + '18' }]}>
                    <Text style={[styles.currentText, { color: step.color }]}>Current</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Cancelled state */}
      {isCancelled && (
        <View style={styles.cancelledBanner}>
          <Ionicons name="close-circle" size={20} color="#ef4444" />
          <Text style={styles.cancelledText}>This job card has been cancelled</Text>
        </View>
      )}

      {/* Action buttons */}
      {!isCancelled && (
        <View style={styles.actions}>
          {nextStep && !deliveredBlocked && (
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: nextStep.color }]}
              onPress={() => onStatusChange(nextStep.value)}
              disabled={updating}
              activeOpacity={0.8}
            >
              {updating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name={nextStep.icon} size={18} color="#fff" />
                  <Text style={styles.nextBtnText}>Move to: {nextStep.label}</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          )}

          {deliveredBlocked && (
            <View style={styles.blockedBanner}>
              <Ionicons name="lock-closed-outline" size={18} color="#f59e0b" />
              <View style={{ flex: 1 }}>
                <Text style={styles.blockedTitle}>Invoice Required</Text>
                <Text style={styles.blockedSub}>Generate an invoice before marking as delivered</Text>
              </View>
            </View>
          )}

          {currentStatus !== 'delivered' && (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => onStatusChange('cancelled')}
              disabled={updating}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle-outline" size={16} color="#ef4444" />
              <Text style={styles.cancelBtnText}>Cancel Job</Text>
            </TouchableOpacity>
          )}

          {currentStatus === 'delivered' && (
            <View style={styles.completedBanner}>
              <Ionicons name="checkmark-done-circle" size={22} color="#10b981" />
              <Text style={styles.completedText}>Job completed & delivered</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  pipeline: { marginBottom: 16 },

  stepRow: { alignItems: 'flex-start' },

  connectorLine: {
    width: 2,
    height: 16,
    backgroundColor: '#e5e7eb',
    marginLeft: 13,
    borderRadius: 1,
  },

  stepNode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 2,
  },

  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  futureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d1d5db',
  },

  stepLabel: {
    fontSize: 13,
    color: '#d1d5db',
    fontWeight: '500',
    flexShrink: 1,
  },

  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Cancelled
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  cancelledText: { fontSize: 14, color: '#ef4444', fontWeight: '600' },

  // Actions
  actions: { gap: 10 },

  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff5f5',
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: '#ef4444' },

  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  blockedTitle: { fontSize: 14, fontWeight: '700', color: '#b45309' },
  blockedSub: { fontSize: 12, color: '#92400e', marginTop: 1 },

  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ecfdf5',
    borderRadius: 10,
    padding: 14,
  },
  completedText: { fontSize: 14, color: '#10b981', fontWeight: '700' },
});
