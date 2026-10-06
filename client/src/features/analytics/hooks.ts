import { useQuery } from '@tanstack/react-query';
import { analyticsApi, type TrendsParams } from '@/api/analytics';
import { queryKeys } from '@/lib/queryKeys';
import type { AnalyticsWindowParams } from '@/types/api';

export function useAnalyticsOverview() {
  return useQuery({ queryKey: queryKeys.analytics.overview, queryFn: analyticsApi.overview });
}

export function useDonorAnalytics(params: AnalyticsWindowParams) {
  return useQuery({ queryKey: queryKeys.analytics.donors(params), queryFn: () => analyticsApi.donors(params) });
}

export function useOrganAnalytics() {
  return useQuery({ queryKey: queryKeys.analytics.organs, queryFn: analyticsApi.organs });
}

export function useHospitalAnalytics() {
  return useQuery({ queryKey: queryKeys.analytics.hospitals, queryFn: analyticsApi.hospitals });
}

export function useWithdrawalAnalytics(params: AnalyticsWindowParams) {
  return useQuery({ queryKey: queryKeys.analytics.withdrawals(params), queryFn: () => analyticsApi.withdrawals(params) });
}

export function useOrganRequestAnalytics(params: AnalyticsWindowParams) {
  return useQuery({ queryKey: queryKeys.analytics.organRequests(params), queryFn: () => analyticsApi.organRequests(params) });
}

export function useAnalyticsTrends(params: TrendsParams) {
  return useQuery({ queryKey: queryKeys.analytics.trends(params), queryFn: () => analyticsApi.trends(params) });
}
