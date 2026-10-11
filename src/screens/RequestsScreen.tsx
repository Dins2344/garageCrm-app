import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import ResponsiveScreen from '../components/ResponsiveScreen';
import RequestStatusPill from '../components/RequestStatusPill';
import { getChangeRequests } from '../api/changeRequestService';
import { useAuth } from '../context/AuthContext';
import { useGarage } from '../context/GarageContext';
import { requestTypeLabel } from '../utils/changeRequests';
import { formatDate } from '../utils/format';
import { REQUESTS_FETCH_LIMIT } from '../utils/constants';
import type { RootStackScreenProps } from '../types/navigation';
import type { ChangeRequest } from '../types/models';
import { colors, elevation, radius, spacing, type } from '../theme';

type Props = RootStackScreenProps<'Requests'>;
type Tab = 'pending' | 'all';

/** Owners and admins: Pending | All for the branch. Everyone else: what they raised. */
export default function RequestsScreen({ navigation }: Props) {
  const { hasRole } = useAuth();
  const { activeGarageId, locale } = useGarage();
  const isApprover = hasRole('owner', 'admin');
  const [tab, setTab] = useState<Tab>(isApprover ? 'pending' : 'all');
  const [requests, setRequests] = useState<ChangeRequest[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      // ponytail: newest REQUESTS_FETCH_LIMIT only; add onEndReached paging when a branch outgrows it.
      const res = await getChangeRequests({ status: tab === 'pending' ? 'pending' : undefined, limit: REQUESTS_FETCH_LIMIT });
      setRequests(res.data);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load requests' });
      setRequests(prev => prev ?? []);
    } finally {
      setRefreshing(false);
    }
    // activeGarageId: a branch switch must reload the list.
  }, [tab, activeGarageId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const switchTab = (next: Tab) => { setRequests(null); setTab(next); };

  return (
    <ResponsiveScreen>
      <View style={s.container}>
        {isApprover && (
          <View style={s.tabs}>
            {(['pending', 'all'] as const).map(t => (
              <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => switchTab(t)} accessibilityRole="button" accessibilityState={{ selected: tab === t }}>
                <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t === 'pending' ? 'Pending' : 'All'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {requests === null ? (
          <ActivityIndicator style={s.loader} size="large" color={colors.primary} />
        ) : (
          <FlatList
            data={requests}
            keyExtractor={r => r._id}
            contentContainerStyle={s.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
            ListEmptyComponent={
              <Text style={s.empty}>
                {isApprover
                  ? (tab === 'pending' ? 'Nothing is waiting for a decision.' : 'Requests your staff raise appear here.')
                  : 'Requests you raise from a job card or invoice appear here.'}
              </Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={s.row} onPress={() => navigation.navigate('ChangeRequestDetail', { id: item._id })} accessibilityRole="button">
                <View style={s.rowMain}>
                  <Text style={s.rowTitle}>{requestTypeLabel(item.type)}</Text>
                  <Text style={s.rowSub}>
                    {item.targetLabel} · {item.requestedBy?.name ?? 'A former staff member'} · {formatDate(item.createdAt, locale, { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
                <RequestStatusPill status={item.status} />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </ResponsiveScreen>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabs: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  tab: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: type.body, fontWeight: '700', color: colors.textSecondary },
  tabTextActive: { color: colors.onPrimary },
  loader: { marginTop: spacing.xxxl },
  list: { padding: spacing.lg, gap: spacing.md },
  empty: { textAlign: 'center', color: colors.textMuted, fontSize: type.body, marginTop: spacing.xxxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, ...elevation.card },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: { fontSize: type.bodyLarge, fontWeight: '700', color: colors.textPrimary },
  rowSub: { fontSize: type.small, color: colors.textMuted },
});
