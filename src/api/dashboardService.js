import api from './apiInterceptor';

export const getDashboardStats = async () => {
  const res = await api.get('/dashboard');
  return res.data;
};

export const triggerCron = async () => {
  const res = await api.post('/reminders/trigger-cron');
  return res.data;
};
