import { useMutation, useQuery } from '@tanstack/react-query';
import { publicSecurityApi } from '@/api/publicSecurity';
import { securityApi } from '@/api/security';
import { queryKeys } from '@/lib/queryKeys';
import type { AnalyticsWindowParams, ExplorePolicyParams, SecurityEventListParams } from '@/types/api';

export function useSecurityOverview(params: AnalyticsWindowParams) {
  return useQuery({ queryKey: queryKeys.security.overview(params), queryFn: () => securityApi.overview(params) });
}

export function useSecurityDecisions(params: AnalyticsWindowParams) {
  return useQuery({ queryKey: queryKeys.security.decisions(params), queryFn: () => securityApi.decisions(params) });
}

export function useSecurityDenied(params: SecurityEventListParams) {
  return useQuery({ queryKey: queryKeys.security.denied(params), queryFn: () => securityApi.denied(params) });
}

export function useSecurityViolations(params: AnalyticsWindowParams) {
  return useQuery({ queryKey: queryKeys.security.violations(params), queryFn: () => securityApi.violations(params) });
}

export function useSecurityTrends(params: AnalyticsWindowParams) {
  return useQuery({ queryKey: queryKeys.security.trends(params), queryFn: () => securityApi.trends(params) });
}

export function useSecurityHistory(params: SecurityEventListParams) {
  return useQuery({ queryKey: queryKeys.security.history(params), queryFn: () => securityApi.history(params) });
}

export function useAiSecurityEvents(params: SecurityEventListParams) {
  return useQuery({ queryKey: queryKeys.security.aiEvents(params), queryFn: () => securityApi.aiEvents(params) });
}

export function useAiSecurityBreakdown(params: AnalyticsWindowParams) {
  return useQuery({ queryKey: queryKeys.security.aiBreakdown(params), queryFn: () => securityApi.aiBreakdown(params) });
}

/** Public Policy Explorer's matrix reference listing. */
export function useSecurityMatrix() {
  return useQuery({ queryKey: queryKeys.public.securityMatrix, queryFn: publicSecurityApi.matrix });
}

/** Public Policy Explorer's Actor -> Resource -> Action -> Context -> Evaluate submission. Not
 * cached as a query: each combination is a fresh evaluation against the real policy engine. */
export function useExplorePolicy() {
  return useMutation({
    mutationFn: (input: ExplorePolicyParams) => publicSecurityApi.explore(input),
  });
}
