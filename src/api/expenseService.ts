import api from './apiInterceptor';
import type { Expense, ExpenseCategory, PaymentMethod } from '../types/models';
import type { ApiListResponse, ApiItemResponse, ApiMessageResponse } from '../types/api';

export interface ExpenseListParams {
  /** YYYY-MM */
  month?: string;
  category?: ExpenseCategory | '';
  search?: string;
  page?: number;
  limit?: number;
}

/** The list carries the filtered total too, so the screen never sums a partial page. */
export type ExpenseListResponse = ApiListResponse<Expense> & { totalAmount: number };

export interface ExpenseInput {
  title: string;
  category: ExpenseCategory;
  amount: number;
  /** YYYY-MM-DD or ISO */
  expenseDate: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export const getExpenses = async (params?: ExpenseListParams): Promise<ExpenseListResponse> => {
  const res = await api.get('/expenses', { params });
  return res.data;
};

export const createExpense = async (data: ExpenseInput): Promise<ApiItemResponse<Expense>> => {
  const res = await api.post('/expenses', data);
  return res.data;
};

export const updateExpense = async (id: string, data: Partial<ExpenseInput>): Promise<ApiItemResponse<Expense>> => {
  const res = await api.put(`/expenses/${id}`, data);
  return res.data;
};

export const deleteExpense = async (id: string): Promise<ApiMessageResponse> => {
  const res = await api.delete(`/expenses/${id}`);
  return res.data;
};
