import api from './apiInterceptor';

export const getUsers = async (params) => {
  const res = await api.get('/users', { params });
  return res.data;
};

export const getMechanics = async () => {
  const res = await api.get('/users');
  return res.data.data.filter(u => u.role === 'mechanic');
};

export const getAdvisors = async () => {
  const res = await api.get('/users');
  return res.data.data.filter(u => u.role === 'service_advisor');
};
