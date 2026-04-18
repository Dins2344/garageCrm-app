import api from './apiInterceptor';

export const getJobCards = async (params) => {
  const res = await api.get('/jobcards', { params });
  return res.data;
};

export const getJobCard = async (id) => {
  const res = await api.get(`/jobcards/${id}`);
  return res.data;
};

export const createJobCard = async (data) => {
  const res = await api.post('/jobcards', data);
  return res.data;
};

export const updateJobCard = async (id, data) => {
  const res = await api.put(`/jobcards/${id}`, data);
  return res.data;
};

export const deleteJobCard = async (id) => {
  const res = await api.delete(`/jobcards/${id}`);
  return res.data;
};
