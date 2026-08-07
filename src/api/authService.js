import api from './apiInterceptor';

export const login = async (email, password) => {
  const res = await api.post('/auth/login', { email, password });
  return res.data;
};

export const register = async (formData) => {
  const res = await api.post('/auth/register', formData);
  return res.data;
};

export const getMe = async () => {
  const res = await api.get('/auth/me');
  return res.data;
};

export const updateProfile = async (data) => {
  const res = await api.put('/auth/profile', data);
  return res.data;
};

export const changePassword = async (data) => {
  const res = await api.put('/auth/changepassword', data);
  return res.data;
};
