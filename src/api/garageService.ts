import api from './apiInterceptor';
import type { Garage, User } from '../types/models';
import type { ApiItemResponse } from '../types/api';

export const getGarage = async (): Promise<ApiItemResponse<Garage>> => {
  const res = await api.get('/garage');
  return res.data;
};

export const updateGarage = async (data: Partial<Garage>): Promise<ApiItemResponse<Garage>> => {
  const res = await api.put('/garage', data);
  return res.data;
};

export const listBranches = async (): Promise<ApiItemResponse<Garage[]>> => {
  const res = await api.get('/garage/branches');
  return res.data;
};

export const createBranch = async (
  data: Pick<Garage, 'name' | 'phone'>
): Promise<ApiItemResponse<Garage>> => {
  const res = await api.post('/garage/branches', data);
  return res.data;
};

export const getBranchStaff = async (garageId: string): Promise<ApiItemResponse<User[]>> => {
  const res = await api.get(`/garage/branches/${garageId}/staff`);
  return res.data;
};

export interface DeleteBranchPayload {
  staffAction?: 'delete' | 'reassign';
  reassignToGarageId?: string;
}

export interface DeleteBranchResult {
  deletedGarageId: string;
  fallbackGarageId: string;
}

export const deleteBranch = async (
  garageId: string,
  payload?: DeleteBranchPayload
): Promise<ApiItemResponse<DeleteBranchResult>> => {
  const res = await api.delete(`/garage/branches/${garageId}`, { data: payload });
  return res.data;
};
