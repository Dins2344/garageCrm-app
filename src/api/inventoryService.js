import api from './apiInterceptor';

export const getInventoryItems = async (params) => {
  const res = await api.get('/inventory', { params });
  return res.data;
};
