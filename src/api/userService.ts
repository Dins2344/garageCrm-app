import api from './apiInterceptor';
import type { User, Role } from '../types/models';
import type { ApiListResponse, ApiItemResponse, ApiMessageResponse } from '../types/api';

export interface UserListParams {
  search?: string;
  role?: Role;
  page?: number;
  limit?: number;
}

export interface CreateUserData {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
}

export const getUsers = async (params?: UserListParams): Promise<ApiListResponse<User>> => {
  const res = await api.get('/users', { params });
  return res.data;
};

export const createUser = async (data: CreateUserData): Promise<ApiItemResponse<User>> => {
  const res = await api.post('/users', data);
  return res.data;
};

export const updateUser = async (id: string, data: Partial<User> & Record<string, unknown>): Promise<ApiItemResponse<User>> => {
  const res = await api.put(`/users/${id}`, data);
  return res.data;
};

export const deleteUser = async (id: string): Promise<ApiMessageResponse> => {
  const res = await api.delete(`/users/${id}`);
  return res.data;
};

export const getMechanics = async (): Promise<User[]> => {
  const res = await api.get('/users');
  return res.data.data.filter((u: User) => u.role === 'mechanic');
};

export const getAdvisors = async (): Promise<User[]> => {
  const res = await api.get('/users');
  return res.data.data.filter((u: User) => u.role === 'service_advisor' || u.role === 'owner' || u.role === 'admin');
};
