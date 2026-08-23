import api from './apiInterceptor';
import type { User } from '../types/models';
import type { ApiMessageResponse, ApiItemResponse } from '../types/api';

export interface AuthResponse {
  success: boolean;
  token: string;
  data: User;
}

export interface RegisterFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  garageName: string;
  garagePhone?: string;
  garageAddress?: Record<string, string>;
  /** ISO alpha-2. Omitted by older clients, which the server defaults to IN. */
  country?: string;
  /** Only honoured for countries that span several zones (US/CA/AU). */
  timezone?: string;
}

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const res = await api.post('/auth/login', { email, password });
  return res.data;
};

export const register = async (formData: RegisterFormData): Promise<AuthResponse> => {
  const res = await api.post('/auth/register', formData);
  return res.data;
};

export const getMe = async (): Promise<ApiItemResponse<User>> => {
  const res = await api.get('/auth/me');
  return res.data;
};

export const updateProfile = async (data: Partial<Pick<User, 'name' | 'phone'>>): Promise<ApiItemResponse<User>> => {
  const res = await api.put('/auth/profile', data);
  return res.data;
};

export const changePassword = async (data: { currentPassword: string; newPassword: string }): Promise<ApiMessageResponse> => {
  const res = await api.put('/auth/changepassword', data);
  return res.data;
};

export const forgotPassword = async (email: string): Promise<ApiMessageResponse> => {
  const res = await api.post('/auth/forgotpassword', { email });
  return res.data;
};
