import api from './apiInterceptor';
import type { ChangeRequest, ChangeRequestStatus, ChangeRequestType } from '../types/models';
import type { ApiListResponse, ApiItemResponse } from '../types/api';

export interface ChangeRequestListParams {
  status?: ChangeRequestStatus;
  type?: ChangeRequestType;
  targetId?: string;
  page?: number;
  limit?: number;
}

export interface RaiseChangeRequestInput {
  type: ChangeRequestType;
  targetId: string;
  payload: Record<string, unknown>;
}

export const getChangeRequests = async (params?: ChangeRequestListParams): Promise<ApiListResponse<ChangeRequest>> =>
  (await api.get('/change-requests', { params })).data;

export const getChangeRequest = async (id: string): Promise<ApiItemResponse<ChangeRequest>> =>
  (await api.get(`/change-requests/${id}`)).data;

export const raiseChangeRequest = async (data: RaiseChangeRequestInput): Promise<ApiItemResponse<ChangeRequest>> =>
  (await api.post('/change-requests', data)).data;

export const approveChangeRequest = async (id: string, note = ''): Promise<ApiItemResponse<ChangeRequest>> =>
  (await api.put(`/change-requests/${id}/approve`, { note })).data;

export const rejectChangeRequest = async (id: string, note = ''): Promise<ApiItemResponse<ChangeRequest>> =>
  (await api.put(`/change-requests/${id}/reject`, { note })).data;

export const withdrawChangeRequest = async (id: string): Promise<ApiItemResponse<ChangeRequest>> =>
  (await api.put(`/change-requests/${id}/withdraw`)).data;
