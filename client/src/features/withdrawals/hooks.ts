import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReviewWithdrawalPayload, type WithdrawalListParams, withdrawalsApi } from '@/api/withdrawals';
import { queryKeys } from '@/lib/queryKeys';

// ---- Donor

export function useMyWithdrawals() {
  return useQuery({ queryKey: queryKeys.donor.withdrawals, queryFn: withdrawalsApi.mine });
}

export function useCreateWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) => withdrawalsApi.create(reason),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.donor.all }),
  });
}

// ---- Admin

export function useAdminWithdrawals(params: WithdrawalListParams) {
  return useQuery({
    queryKey: queryKeys.admin.withdrawals(params),
    queryFn: () => withdrawalsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useReviewWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReviewWithdrawalPayload }) => withdrawalsApi.review(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.admin.all });
      void qc.invalidateQueries({ queryKey: queryKeys.organs.all });
      void qc.invalidateQueries({ queryKey: queryKeys.hospitals.all });
    },
  });
}

export function useWithdrawalHistory(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.admin.withdrawalHistory(id ?? ''),
    queryFn: () => withdrawalsApi.history(id!),
    enabled: Boolean(id),
  });
}
