import api from './apiInterceptor';
import type { Vehicle, JobCard } from '../types/models';
import type { ApiListResponse, ApiItemResponse, ApiMessageResponse } from '../types/api';

export interface VehicleListParams {
  search?: string;
  page?: number;
  limit?: number;
}

export const getVehicles = async (params?: VehicleListParams): Promise<ApiListResponse<Vehicle>> => {
  const res = await api.get('/vehicles', { params });
  return res.data;
};

export const getVehicle = async (id: string): Promise<ApiItemResponse<Vehicle>> => {
  const res = await api.get(`/vehicles/${id}`);
  return res.data;
};

export const getVehicleHistory = async (id: string, params?: { page?: number; limit?: number }): Promise<ApiListResponse<JobCard>> => {
  const res = await api.get(`/vehicles/${id}/history`, { params });
  return res.data;
};

export const createVehicle = async (data: Partial<Vehicle> & { customer: string }): Promise<ApiItemResponse<Vehicle>> => {
  const res = await api.post('/vehicles', data);
  return res.data;
};

export const updateVehicle = async (id: string, data: Partial<Vehicle>): Promise<ApiItemResponse<Vehicle>> => {
  const res = await api.put(`/vehicles/${id}`, data);
  return res.data;
};

export const deleteVehicle = async (id: string): Promise<ApiMessageResponse> => {
  const res = await api.delete(`/vehicles/${id}`);
  return res.data;
};
