import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { donorsApi, type NextOfKinPayload, type UpdateProfilePayload } from '@/api/donors';
import { queryKeys } from '@/lib/queryKeys';
import type { DonorProfile } from '@/types/api';

export function useMyProfile() {
  return useQuery({ queryKey: queryKeys.donor.profile, queryFn: donorsApi.myProfile });
}

export function useMyDashboard() {
  return useQuery({ queryKey: queryKeys.donor.dashboard, queryFn: donorsApi.myDashboard });
}

export function useUpdateMyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => donorsApi.updateMyProfile(payload),
    onSuccess: (profile) => {
      qc.setQueryData(queryKeys.donor.profile, profile);
      void qc.invalidateQueries({ queryKey: queryKeys.donor.dashboard });
      void qc.invalidateQueries({ queryKey: queryKeys.session });
    },
  });
}

export function useUpdateMyNextOfKin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: NextOfKinPayload) => donorsApi.updateMyNextOfKin(payload),
    onSuccess: (nextOfKin) => {
      qc.setQueryData<DonorProfile>(queryKeys.donor.profile, (prev) => (prev ? { ...prev, nextOfKin } : prev));
      void qc.invalidateQueries({ queryKey: queryKeys.donor.dashboard });
    },
  });
}
