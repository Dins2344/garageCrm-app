import api, { API_BASE_URL } from './apiInterceptor';
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
 * Full URL for an invoice's PDF, for use with FileSystem.downloadAsync()
 * (a native download straight to disk, with an explicit auth header) rather
 * than fetching it through axios — RN's JS engine has no `btoa`/`atob`
 * global, so the old arraybuffer -> base64-string -> writeAsStringAsync
 * approach threw at runtime on every download attempt.
 */
export const getInvoicePdfUrl = (id: string): string => `${API_BASE_URL}/invoices/${id}/pdf`;
