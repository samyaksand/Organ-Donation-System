import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/admin';
import { type AdminUpdateDonorPayload, type DonorListParams, donorsApi } from '@/api/donors';
import { queryKeys } from '@/lib/queryKeys';

export function useAdminOverview() {
  return useQuery({ queryKey: queryKeys.admin.overview, queryFn: adminApi.overview });
}

export function useAdminDonors(params: DonorListParams) {
  return useQuery({
    queryKey: queryKeys.admin.donors(params),
    queryFn: () => donorsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useAdminDonor(id: string | null) {
  return useQuery({
    queryKey: queryKeys.admin.donor(id ?? ''),
    queryFn: () => donorsApi.get(id as string),
    enabled: Boolean(id),
  });
}

function useInvalidateDonors() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.admin.all });
    void qc.invalidateQueries({ queryKey: queryKeys.organs.all });
    void qc.invalidateQueries({ queryKey: queryKeys.hospitals.all });
  };
}

export function useAdminUpdateDonor() {
  const invalidate = useInvalidateDonors();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminUpdateDonorPayload }) => donorsApi.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useAdminResetDonorPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) => donorsApi.resetPassword(id, newPassword),
  });
}

export function useAdminDeleteDonor() {
  const invalidate = useInvalidateDonors();
  return useMutation({ mutationFn: (id: string) => donorsApi.remove(id), onSuccess: invalidate });
}
