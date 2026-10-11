import React, { useCallback, useLayoutEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import ResponsiveScreen from '../components/ResponsiveScreen';
import HeaderIconButton from '../components/HeaderIconButton';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api/notificationService';
import { useAuth } from '../context/AuthContext';
import { useGarage } from '../context/GarageContext';
import { useGlobalLoader } from '../context/GlobalLoaderContext';
import { ACTIVE_GARAGE_KEY, NOTIFICATIONS_CHANGED_EVENT, NOTIFICATIONS_FETCH_LIMIT } from '../utils/constants';
import type { RootStackScreenProps } from '../types/navigation';
import type { AppNotification } from '../types/models';
import { colors, elevation, radius, spacing, type } from '../theme';

type Props = RootStackScreenProps<'Notifications'>;

const keyExtractor = (n: AppNotification) => n._id;

export default function NotificationsScreen({ navigation }: Props) {
  const { hasRole } = useAuth();
  const { activeGarageId, switchGarage } = useGarage();
  const { withLoader } = useGlobalLoader();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems((await getNotifications({ limit: NOTIFICATIONS_FETCH_LIMIT })).data);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to load notifications' });
      setItems(prev => prev ?? []);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const readAll = useCallback(() => withLoader(async () => {
    try {
      await markAllNotificationsRead();
      DeviceEventEmitter.emit(NOTIFICATIONS_CHANGED_EVENT);
      await load();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to mark notifications read' });
    }
  }, 'Marking as read...'), [load, withLoader]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <HeaderIconButton icon="checkmark-done-outline" label="Mark all read" onPress={readAll} />,
    });
  }, [navigation, readAll]);

  const open = useCallback(async (n: AppNotification) => {
    if (!n.readAt) {
      markNotificationRead(n._id).then(() => DeviceEventEmitter.emit(NOTIFICATIONS_CHANGED_EVENT)).catch(() => {});
    }
    // A request lives in one branch. An owner looking at another must switch
    // first, or the request answers 404. switchGarage shows the app-wide loader.
    // Compare with the branch the API client sends (storage), not the context's
    // fallback, as handleTap does for a tapped push.
    if (hasRole('owner')) {
      const current = (await AsyncStorage.getItem(ACTIVE_GARAGE_KEY).catch(() => null)) ?? activeGarageId;
      if (n.garage !== current) await switchGarage(n.garage);
    }
    if (n.entityType === 'change_request') navigation.navigate('ChangeRequestDetail', { id: n.entity });
  }, [hasRole, activeGarageId, switchGarage, navigation]);

  const renderItem = useCallback(({ item }: { item: AppNotification }) => (
    <TouchableOpacity style={[s.row, !item.readAt && s.unread]} onPress={() => open(item)} accessibilityRole="button">
      <Text style={s.title}>{item.title}</Text>
      <Text style={s.body}>{item.body}</Text>
    </TouchableOpacity>
  ), [open]);

  return (
    <ResponsiveScreen>
      <View style={s.container}>
        {items === null ? (
          <ActivityIndicator style={s.loader} size="large" color={colors.primary} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={keyExtractor}
            contentContainerStyle={s.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
            ListEmptyComponent={<Text style={s.empty}>No notifications yet</Text>}
            renderItem={renderItem}
          />
        )}
      </View>
    </ResponsiveScreen>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loader: { marginTop: spacing.xxxl },
  list: { padding: spacing.lg, gap: spacing.md },
  empty: { textAlign: 'center', color: colors.textMuted, fontSize: type.body, marginTop: spacing.xxxl },
  row: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: 2, ...elevation.card },
  unread: { backgroundColor: colors.primarySoft },
  title: { fontSize: type.bodyLarge, fontWeight: '700', color: colors.textPrimary },
  body: { fontSize: type.body, color: colors.textSecondary },
});
