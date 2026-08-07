import api from './apiInterceptor';

export const getInvoices = async (params) => {
  const res = await api.get('/invoices', { params });
  return res.data;
};

export const getInvoice = async (id) => {
  const res = await api.get(`/invoices/${id}`);
  return res.data;
};

export const createInvoice = async (data) => {
  const res = await api.post('/invoices', data);
  return res.data;
};

export const deleteInvoice = async (id) => {
  const res = await api.delete(`/invoices/${id}`);
  return res.data;
};

export const updateInvoicePayment = async (id, data) => {
  const res = await api.put(`/invoices/${id}/payment`, data);
  return res.data;
};

/**
 * Download invoice PDF. Returns base64 string.
 * On mobile we use arraybuffer and convert to base64 for file-system save.
 */
export const downloadInvoicePdf = async (id) => {
  const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'arraybuffer' });
  return res;
};
