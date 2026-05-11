import api from './apiInterceptor';

export const getUsers = async (params) => {
  const res = await api.get('/users', { params });
  return res.data;
};

export const createUser = async (data) => {
  const res = await api.post('/users', data);
  return res.data;
};

export const updateUser = async (id, data) => {
  const res = await api.put(`/users/${id}`, data);
  return res.data;
};

export const deleteUser = async (id) => {
  const res = await api.delete(`/users/${id}`);
  return res.data;
};

export const getMechanics = async () => {
  const res = await api.get('/users');
  return res.data.data.filter(u => u.role === 'mechanic');
};

export const getAdvisors = async () => {
  const res = await api.get('/users');
  return res.data.data.filter(u => u.role === 'service_advisor' || u.role === 'owner' || u.role === 'admin');
};

