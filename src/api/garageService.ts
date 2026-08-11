import api from './apiInterceptor';
import type { Garage } from '../types/models';
import type { ApiItemResponse } from '../types/api';

export const getGarage = async (): Promise<ApiItemResponse<Garage>> => {
  const res = await api.get('/garage');
  return res.data;
};

export const updateGarage = async (data: Partial<Garage>): Promise<ApiItemResponse<Garage>> => {
  const res = await api.put('/garage', data);
  return res.data;
};
