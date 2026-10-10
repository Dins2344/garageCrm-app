import api from './apiInterceptor';
import type { AppNotification } from '../types/models';
import type { ApiListResponse, ApiItemResponse } from '../types/api';

/** Logout must never hang on this. */
const UNREGISTER_TIMEOUT_MS = 5000;

export const getNotifications = async (params?: { page?: number; limit?: number }): Promise<ApiListResponse<AppNotification>> =>
  (await api.get('/notifications', { params })).data;

export const getUnreadCount = async (): Promise<number> =>
  (await api.get('/notifications/unread-count')).data.data.count;

export const markNotificationRead = async (id: string): Promise<ApiItemResponse<AppNotification>> =>
  (await api.put(`/notifications/${id}/read`)).data;

export const markAllNotificationsRead = async (): Promise<void> => {
  await api.put('/notifications/read-all');
};

export const registerPushToken = async (token: string, platform: 'android' | 'ios'): Promise<void> => {
  await api.post('/notifications/push-token', { token, platform });
};

export const unregisterPushToken = async (token: string): Promise<void> => {
  await api.delete('/notifications/push-token', { data: { token }, timeout: UNREGISTER_TIMEOUT_MS });
};
