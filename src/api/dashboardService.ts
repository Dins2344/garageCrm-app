import api from './apiInterceptor';
import type { JobCard, Invoice, ServiceReminder } from '../types/models';
import type { ApiItemResponse } from '../types/api';

export interface StaffAchievement {
  _id: string;
  staffName: string;
  role: string;
  totalLabor: number;
  jobCount: number;
}

export interface DashboardStats {
  overview: {
    totalCustomers: number;
    totalVehicles: number;
    activeJobCards: number;
    todayJobCards: number;
    pendingEstimations: number;
    inProgressJobs: number;
    readyForPickup: number;
  };
  revenue: { today: number; month: number };
  unpaid: { total: number; count: number };
  weeklyRevenue: { date: string; label: string; revenue: number }[];
  jobStatusBreakdown: Record<string, number>;
  lowStockItems: unknown[];
  recentJobCards: JobCard[];
  recentInvoices: Invoice[];
  upcomingReminders: ServiceReminder[];
  staffAchievement: StaffAchievement[];
  queryTimeMs: number;
}

export interface CronResult {
  processed?: number;
  emailSent?: number;
  smsSent?: number;
  skipped?: number;
  failed?: number;
}

export const getDashboardStats = async (): Promise<ApiItemResponse<DashboardStats>> => {
  const res = await api.get('/dashboard');
  return res.data;
};

export const triggerCron = async (): Promise<{ success: boolean; message: string; data: CronResult }> => {
  const res = await api.post('/reminders/trigger-cron');
  return res.data;
};
