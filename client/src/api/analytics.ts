import type {
  AnalyticsOverview,
  AnalyticsTrends,
  AnalyticsWindowParams,
  DonorAnalytics,
  HospitalAnalytics,
  OrganAnalytics,
  OrganRequestAnalytics,
  WithdrawalAnalytics,
} from '@/types/api';
import { api } from './client';

export interface TrendsParams extends AnalyticsWindowParams {
  granularity?: 'day' | 'week' | 'month';
}

/**
 * Thin client over the deterministic analytics API (server/src/services/analytics.service.ts).
 * No KPI math happens here - every number is exactly what the server computed. This file is the
 * only place the frontend talks to /analytics/*, so each endpoint has exactly one caller.
 */
export const analyticsApi = {
  overview: () => api.get<AnalyticsOverview>('/analytics/overview'),
  donors: (params: AnalyticsWindowParams) => api.get<DonorAnalytics>('/analytics/donors', { ...params }),
  organs: () => api.get<OrganAnalytics>('/analytics/organs'),
  hospitals: () => api.get<HospitalAnalytics>('/analytics/hospitals'),
  withdrawals: (params: AnalyticsWindowParams) => api.get<WithdrawalAnalytics>('/analytics/withdrawals', { ...params }),
  organRequests: (params: AnalyticsWindowParams) => api.get<OrganRequestAnalytics>('/analytics/organ-requests', { ...params }),
  trends: (params: TrendsParams) => api.get<AnalyticsTrends>('/analytics/trends', { ...params }),
};
