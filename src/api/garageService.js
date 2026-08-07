import api from './apiInterceptor';

export const getGarage = async () => {
  const res = await api.get('/garage');
  return res.data;
};

export const updateGarage = async (data) => {
  const res = await api.put('/garage', data);
  return res.data;
};
