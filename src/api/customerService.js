import api from './apiInterceptor';

export const getCustomers = async (params) => {
  const res = await api.get('/customers', { params });
  return res.data;
};

export const getCustomer = async (id) => {
  const res = await api.get(`/customers/${id}`);
  return res.data;
};

export const createCustomer = async (data) => {
  const res = await api.post('/customers', data);
  return res.data;
};

export const updateCustomer = async (id, data) => {
  const res = await api.put(`/customers/${id}`, data);
  return res.data;
};

export const deleteCustomer = async (id) => {
  const res = await api.delete(`/customers/${id}`);
  return res.data;
};
