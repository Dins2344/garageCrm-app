import api from './apiInterceptor';
import type { InventoryItem } from '../types/models';
import type { ApiListResponse } from '../types/api';

export interface InventoryListParams {
  search?: string;
  category?: string;
  lowStock?: boolean;
  page?: number;
  limit?: number;
}

export const getInventoryItems = async (params?: InventoryListParams): Promise<ApiListResponse<InventoryItem>> => {
  const res = await api.get('/inventory', { params });
  return res.data;
};
