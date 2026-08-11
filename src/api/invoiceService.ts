import type { AxiosResponse } from 'axios';
import api from './apiInterceptor';
import type { Invoice, PaymentStatus, PaymentMethod } from '../types/models';
import type { ApiListResponse, ApiItemResponse, ApiMessageResponse } from '../types/api';

export interface InvoiceListParams {
  search?: string;
  paymentStatus?: string;
  page?: number;
  limit?: number;
}

export interface UpdatePaymentData {
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  amountPaid?: number;
}

export const getInvoices = async (params?: InvoiceListParams): Promise<ApiListResponse<Invoice>> => {
  const res = await api.get('/invoices', { params });
  return res.data;
};

export const getInvoice = async (id: string): Promise<ApiItemResponse<Invoice>> => {
  const res = await api.get(`/invoices/${id}`);
  return res.data;
};

export const createInvoice = async (data: { jobCardId: string }): Promise<ApiItemResponse<Invoice>> => {
  const res = await api.post('/invoices', data);
  return res.data;
};

export const deleteInvoice = async (id: string): Promise<ApiMessageResponse> => {
  const res = await api.delete(`/invoices/${id}`);
  return res.data;
};

export const updateInvoicePayment = async (id: string, data: UpdatePaymentData): Promise<ApiItemResponse<Invoice>> => {
  const res = await api.put(`/invoices/${id}/payment`, data);
  return res.data;
};

/**
 * Download invoice PDF. Returns base64 string.
 * On mobile we use arraybuffer and convert to base64 for file-system save.
 */
export const downloadInvoicePdf = async (id: string): Promise<AxiosResponse<ArrayBuffer>> => {
  const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'arraybuffer' });
  return res;
};
