import api from './apiInterceptor';

export const getVehicles = async (params) => {
  const res = await api.get('/vehicles', { params });
  return res.data;
};

export const getVehicle = async (id) => {
  const res = await api.get(`/vehicles/${id}`);
  return res.data;
};

export const getVehicleHistory = async (id, params) => {
  const res = await api.get(`/vehicles/${id}/history`, { params });
  return res.data;
};

export const createVehicle = async (data) => {
  const res = await api.post('/vehicles', data);
  return res.data;
};

export const updateVehicle = async (id, data) => {
  const res = await api.put(`/vehicles/${id}`, data);
  return res.data;
};

export const deleteVehicle = async (id) => {
  const res = await api.delete(`/vehicles/${id}`);
  return res.data;
};
