import api from './apiInterceptor';
import type { Customer } from '../types/models';
import type { ApiListResponse, ApiItemResponse, ApiMessageResponse } from '../types/api';

export interface CustomerListParams {
  search?: string;
  page?: number;
  limit?: number;
}

export const getCustomers = async (params?: CustomerListParams): Promise<ApiListResponse<Customer>> => {
  const res = await api.get('/customers', { params });
  return res.data;
};

export const getCustomer = async (id: string): Promise<ApiItemResponse<Customer>> => {
  const res = await api.get(`/customers/${id}`);
  return res.data;
};

export const createCustomer = async (data: Partial<Customer>): Promise<ApiItemResponse<Customer>> => {
  const res = await api.post('/customers', data);
  return res.data;
};

export const updateCustomer = async (id: string, data: Partial<Customer>): Promise<ApiItemResponse<Customer>> => {
  const res = await api.put(`/customers/${id}`, data);
  return res.data;
};

export const deleteCustomer = async (id: string): Promise<ApiMessageResponse> => {
  const res = await api.delete(`/customers/${id}`);
  return res.data;
};
