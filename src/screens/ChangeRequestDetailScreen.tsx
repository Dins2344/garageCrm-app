import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import BottomSheet, { SheetActions } from '../components/BottomSheet';
import { Field } from '../components/FormControls';
import ResponsiveScreen from '../components/ResponsiveScreen';
import RequestStatusPill from '../components/RequestStatusPill';
import {
  getChangeRequest, approveChangeRequest, rejectChangeRequest, withdrawChangeRequest,
} from '../api/changeRequestService';
import { useAuth } from '../context/AuthContext';
import { useGarage } from '../context/GarageContext';
import { useGlobalLoader } from '../context/GlobalLoaderContext';
import { requestTypeLabel, decidedByLabel } from '../utils/changeRequests';
import { formatDate, formatNumber } from '../utils/format';
import { getErrorMessage } from '../utils/errors';
import { NOTIFICATIONS_CHANGED_EVENT } from '../utils/constants';
import type { RootStackScreenProps } from '../types/navigation';
import type { ChangeRequest } from '../types/models';
import { colors, elevation, radius, spacing, type } from '../theme';

type Props = RootStackScreenProps<'ChangeRequestDetail'>;
type Decision = 'approve' | 'reject';

const DATE_OPTS: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' };

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

export default function ChangeRequestDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { user, hasRole } = useAuth();
  const { locale } = useGarage();
  const { withLoader } = useGlobalLoader();
  const [request, setRequest] = useState<ChangeRequest | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const loadedId = useRef<string | null>(null);

  // Params can change in place on a focused screen: drop what belongs to the old id.
  const [seenId, setSeenId] = useState(id);
  if (seenId !== id) {
    setSeenId(id);
    setRequest(null);
    setDecision(null);
  }

  const load = useCallback(async () => {
    try {
      setRequest((await getChangeRequest(id)).data);
      loadedId.current = id;
    } catch (e) {
      if (loadedId.current === id) {
        Toast.show({ type: 'error', text1: getErrorMessage(e, 'Failed to refresh request') });
        return;
      }
      Toast.show({ type: 'error', text1: getErrorMessage(e, 'Request not found') });
      navigation.goBack();
    }
  }, [id, navigation]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openDecision = (next: Decision) => { setNote(''); setDecision(next); };

  const decide = async () => {
    if (!decision) return;
    setSubmitting(true);
    try {
      const call = decision === 'approve' ? approveChangeRequest : rejectChangeRequest;
      setRequest((await call(id, note.trim())).data);
      Toast.show({ type: 'success', text1: decision === 'approve' ? 'Approved and applied' : 'Request rejected' });
      DeviceEventEmitter.emit(NOTIFICATIONS_CHANGED_EVENT);
      setDecision(null);
    } catch (e) {
      // Stale reading, item gone, already decided: the server's words say which.
      Toast.show({ type: 'error', text1: getErrorMessage(e, 'Something went wrong') });
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const withdraw = () => Alert.alert(
    'Withdraw request?',
    'The owner will no longer be asked to decide on it.',
    [
      { text: 'Keep It', style: 'cancel' },
      {
        text: 'Withdraw', style: 'destructive',
        onPress: () => withLoader(async () => {
          try {
            setRequest((await withdrawChangeRequest(id)).data);
            Toast.show({ type: 'success', text1: 'Request withdrawn' });
            DeviceEventEmitter.emit(NOTIFICATIONS_CHANGED_EVENT);
          } catch (e) {
            Toast.show({ type: 'error', text1: getErrorMessage(e, 'Failed to withdraw request') });
          }
        }, 'Withdrawing...'),
      },
    ]
  );

  if (!request || request._id !== id) {
    return <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  const p = request.payload;
  const km = (n?: number) => `${formatNumber(n ?? 0, locale)} km`;
  const pending = request.status === 'pending';
  const canDecide = pending && hasRole('owner', 'admin');
  const canWithdraw = pending && request.requestedBy?._id === user?._id;

  return (
    <ResponsiveScreen>
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <View style={s.card}>
          <Text style={s.title}>{requestTypeLabel(request.type)}</Text>
          <Text style={s.target}>{request.targetLabel}</Text>
          <RequestStatusPill status={request.status} />
          <View style={s.divider} />
          {typeof p.odometerAtIntake === 'number' && (
            <Row label="Reading" value={`${km(p.previousOdometer)} to ${km(p.odometerAtIntake)}`} />
          )}
          {!!(p.reason || p.remarks) && <Row label={p.reason ? 'Reason' : 'Remarks'} value={(p.reason ?? p.remarks)!} />}
          <Row
            label="Requested by"
            value={`${request.requestedBy?.name ?? 'A former staff member'} · ${formatDate(request.createdAt, locale, DATE_OPTS)}`}
          />
          {request.decidedBy && (
            <Row
              label={decidedByLabel(request.status)}
              value={`${request.decidedBy.name}${request.decidedAt ? ` · ${formatDate(request.decidedAt, locale, DATE_OPTS)}` : ''}`}
            />
          )}
          {!!request.decisionNote && <Row label="Note" value={request.decisionNote} />}
        </View>

        {canDecide && (
          <View style={s.actions}>
            <TouchableOpacity style={[s.btn, s.rejectBtn]} onPress={() => openDecision('reject')} accessibilityRole="button">
              <Text style={s.rejectText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.approveBtn]} onPress={() => openDecision('approve')} accessibilityRole="button">
              <Text style={s.approveText}>Approve</Text>
            </TouchableOpacity>
          </View>
        )}
        {canWithdraw && (
          <TouchableOpacity style={[s.btn, s.withdrawBtn]} onPress={withdraw} accessibilityRole="button">
            <Text style={s.withdrawText}>Withdraw Request</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <BottomSheet
        visible={decision !== null}
        onClose={() => setDecision(null)}
        title={decision === 'approve' ? 'Approve request' : 'Reject request'}
        footer={
          <SheetActions
            onCancel={() => setDecision(null)}
            onConfirm={decide}
            confirmLabel={decision === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
            tone={decision === 'approve' ? 'success' : 'danger'}
            loading={submitting}
          />
        }
      >
        {decision === 'approve' && (
          <Text style={s.sheetHint}>Approving applies the change now, exactly as if you had made it yourself.</Text>
        )}
        <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="Shown to the person who asked" maxLength={500} testID="decision-note" />
      </BottomSheet>
    </ResponsiveScreen>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm, ...elevation.card },
  title: { fontSize: type.title, fontWeight: '800', color: colors.textPrimary },
  target: { fontSize: type.body, fontWeight: '600', color: colors.textSecondary },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.sm },
  row: { gap: 2, marginBottom: spacing.sm },
  rowLabel: { fontSize: type.small, fontWeight: '700', color: colors.textMuted },
  rowValue: { fontSize: type.body, color: colors.textPrimary },
  actions: { flexDirection: 'row', gap: spacing.md },
  btn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.lg, alignItems: 'center' },
  rejectBtn: { borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.surface },
  rejectText: { fontSize: type.bodyLarge, fontWeight: '700', color: colors.danger },
  approveBtn: { backgroundColor: colors.accent },
  approveText: { fontSize: type.bodyLarge, fontWeight: '700', color: colors.onPrimary },
  withdrawBtn: { borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  withdrawText: { fontSize: type.bodyLarge, fontWeight: '700', color: colors.textSecondary },
  sheetHint: { fontSize: type.body, color: colors.textSecondary, marginBottom: spacing.md },
});
