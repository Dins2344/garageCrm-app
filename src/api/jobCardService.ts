import api from './apiInterceptor';
import type { JobCard, Complaint, EstimationPart, EstimationLabor } from '../types/models';
import type { ApiListResponse, ApiItemResponse, ApiMessageResponse } from '../types/api';

export interface JobCardListParams {
  status?: string;
  mechanicId?: string;
  vehicle?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateJobCardData {
  serviceType: string;
  vehicle: string;
  customer: string;
  assignedMechanic?: string;
  assignedAdvisor?: string;
  odometerAtIntake?: number;
  expectedDeliveryDate?: string;
  internalNotes?: string;
  complaints?: Complaint[];
}

export interface EstimationInput {
  parts: EstimationPart[];
  labor: EstimationLabor[];
  discount: number;
  taxRate: number;
}

export const getJobCards = async (params?: JobCardListParams): Promise<ApiListResponse<JobCard>> => {
  const res = await api.get('/jobcards', { params });
  return res.data;
};

export const getJobCard = async (id: string): Promise<ApiItemResponse<JobCard>> => {
  const res = await api.get(`/jobcards/${id}`);
  return res.data;
};

export const createJobCard = async (data: CreateJobCardData): Promise<ApiItemResponse<JobCard>> => {
  const res = await api.post('/jobcards', data);
  return res.data;
};

export const updateJobCard = async (id: string, data: Partial<JobCard> & Record<string, unknown>): Promise<ApiItemResponse<JobCard>> => {
  const res = await api.put(`/jobcards/${id}`, data);
  return res.data;
};

export const deleteJobCard = async (id: string): Promise<ApiMessageResponse> => {
  const res = await api.delete(`/jobcards/${id}`);
  return res.data;
};

export const saveJobCardEstimation = async (id: string, data: EstimationInput): Promise<ApiItemResponse<JobCard>> => {
  const res = await api.put(`/jobcards/${id}/estimation`, data);
  return res.data;
};

export const approveJobCardEstimation = async (id: string): Promise<ApiItemResponse<JobCard>> => {
  const res = await api.put(`/jobcards/${id}/approve`);
  return res.data;
};
