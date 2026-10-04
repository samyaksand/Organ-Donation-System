import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { recoveryApi } from '@/api/recovery';
import { queryKeys } from '@/lib/queryKeys';

/** System Recovery status (Super Admin only; the server also enforces this). */
export function useRecoveryStatus() {
  return useQuery({ queryKey: queryKeys.recovery.status, queryFn: recoveryApi.status });
}

export function useRestoreDemoDatabase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: recoveryApi.restore,
    onSuccess: () => {
      // The restore can change every donor/organ/hospital/withdrawal row, so refresh everything
      // the admin console shows rather than trying to patch individual caches.
      void qc.invalidateQueries({ queryKey: queryKeys.recovery.status });
      void qc.invalidateQueries({ queryKey: queryKeys.admin.all });
      void qc.invalidateQueries({ queryKey: queryKeys.organs.all });
      void qc.invalidateQueries({ queryKey: queryKeys.hospitals.all });
    },
  });
}
