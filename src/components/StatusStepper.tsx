import React, { ComponentProps } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, palette, radius } from '../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface StatusStep {
  value: string;
  label: string;
  icon: IconName;
  color: string;
}

const STATUS_FLOW: StatusStep[] = [
  { value: 'new',              label: 'New',              icon: 'add-circle-outline',    color: colors.info },
  { value: 'estimation_sent',  label: 'Estimation Sent',  icon: 'send-outline',          color: colors.warning },
  { value: 'approved',         label: 'Approved',         icon: 'checkmark-circle-outline', color: palette.violet500 },
  { value: 'in_progress',      label: 'In Progress',      icon: 'construct-outline',     color: palette.pink500 },
  { value: 'quality_check',    label: 'Quality Check',    icon: 'shield-checkmark-outline', color: palette.cyan500 },
  { value: 'ready_for_pickup', label: 'Ready for Pickup', icon: 'car-outline',           color: colors.success },
  { value: 'delivered',        label: 'Delivered',        icon: 'checkmark-done-outline', color: colors.textMuted },
];

export interface StatusStepperProps {
  currentStatus: string;
  onStatusChange: (newStatus: string) => void;
  updating?: boolean;
  hasInvoice?: boolean;
}

/**
 * Visual pipeline stepper for job card status.
 */
export default function StatusStepper({ currentStatus, onStatusChange, updating, hasInvoice }: StatusStepperProps) {
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
                  isFuture && { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                ]}>
                  {isPast ? (
                    <Ionicons name="checkmark" size={14} color={colors.textOnPrimary} />
                  ) : isCurrent ? (
                    <Ionicons name={step.icon} size={14} color={colors.textOnPrimary} />
                  ) : (
                    <View style={styles.futureDot} />
                  )}
                </View>

                <Text style={[
                  styles.stepLabel,
                  isCurrent && { color: step.color, fontWeight: '700' },
                  isPast && { color: colors.textMuted },
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
          <Ionicons name="close-circle" size={20} color={colors.danger} />
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
                <ActivityIndicator color={colors.textOnPrimary} size="small" />
              ) : (
                <>
                  <Ionicons name={nextStep.icon} size={18} color={colors.textOnPrimary} />
                  <Text style={styles.nextBtnText}>Move to: {nextStep.label}</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.textOnPrimary} />
                </>
              )}
            </TouchableOpacity>
          )}

          {deliveredBlocked && (
            <View style={styles.blockedBanner}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.warning} />
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
              <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
              <Text style={styles.cancelBtnText}>Cancel Job</Text>
            </TouchableOpacity>
          )}

          {currentStatus === 'delivered' && (
            <View style={styles.completedBanner}>
              <Ionicons name="checkmark-done-circle" size={22} color={colors.success} />
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
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    shadowColor: colors.shadowHard,
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
    backgroundColor: colors.border,
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
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },

  futureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
  },

  stepLabel: {
    fontSize: 13,
    color: colors.borderStrong,
    fontWeight: '500',
    flexShrink: 1,
  },

  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.xs,
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
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.sm,
    padding: 12,
    marginTop: 4,
  },
  cancelledText: { fontSize: 14, color: colors.danger, fontWeight: '600' },

  // Actions
  actions: { gap: 10 },

  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radius.md,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  nextBtnText: { color: colors.textOnPrimary, fontSize: 15, fontWeight: 'bold' },

  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: palette.red200,
    backgroundColor: palette.redTintSoft,
  },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: colors.danger },

  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.sm,
    padding: 12,
    borderWidth: 1,
    borderColor: palette.amber200,
  },
  blockedTitle: { fontSize: 14, fontWeight: '700', color: palette.amber700 },
  blockedSub: { fontSize: 12, color: palette.amber800, marginTop: 1 },

  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.successSoft,
    borderRadius: radius.sm,
    padding: 14,
  },
  completedText: { fontSize: 14, color: colors.success, fontWeight: '700' },
});
