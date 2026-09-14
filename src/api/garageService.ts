import api from './apiInterceptor';
import type { Address, Garage, GarageSettings, User } from '../types/models';
import type { ApiItemResponse } from '../types/api';

/**
 * The API merges `settings` and `address` key-by-key (dotted-path `$set`), so
 * a caller may send just the sub-keys it owns and the rest are preserved.
 * `Partial<Garage>` alone would wrongly demand a complete sub-document.
 */
export type GarageUpdatePayload = Partial<Omit<Garage, 'settings' | 'address'>> & {
  settings?: Partial<GarageSettings>;
  address?: Partial<Address>;
};

export const getGarage = async (): Promise<ApiItemResponse<Garage>> => {
  const res = await api.get('/garage');
  return res.data;
};

export const updateGarage = async (data: GarageUpdatePayload): Promise<ApiItemResponse<Garage>> => {
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

/** How many rows of each kind the removal deleted. */
export interface RemovedSampleDataCounts {
  customers: number;
  vehicles: number;
  jobCards: number;
  invoices: number;
}

/**
 * Clears the demo rows a garage is seeded with at registration. Scoped
 * server-side to the caller's own garage — there is no id to pass.
 */
export const removeSampleData = async (): Promise<ApiItemResponse<RemovedSampleDataCounts>> => {
  const res = await api.delete('/garage/sample-data');
  return res.data;
};
