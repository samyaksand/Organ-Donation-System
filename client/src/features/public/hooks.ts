import { useMutation, useQuery } from '@tanstack/react-query';
import { publicApi } from '@/api/public';
import { queryKeys } from '@/lib/queryKeys';

export function usePublicOverview() {
  return useQuery({ queryKey: queryKeys.public.overview, queryFn: publicApi.overview });
}

export function usePublicOrgans() {
  return useQuery({ queryKey: queryKeys.public.organs, queryFn: publicApi.organs });
}

export function usePublicHospitals() {
  return useQuery({ queryKey: queryKeys.public.hospitals, queryFn: publicApi.hospitals });
}

export function usePublicConcentration() {
  return useQuery({ queryKey: queryKeys.public.concentration, queryFn: publicApi.concentration });
}

export function usePublicTrends() {
  return useQuery({ queryKey: queryKeys.public.trends, queryFn: publicApi.trends });
}

export function usePublicBreaches() {
  return useQuery({ queryKey: queryKeys.public.breaches, queryFn: publicApi.breaches });
}

/** Not cached as a query: each click is a fresh, potentially-costly LLM call. */
export function usePublicInvestigate() {
  return useMutation({ mutationFn: (question?: string) => publicApi.investigate(question) });
}
