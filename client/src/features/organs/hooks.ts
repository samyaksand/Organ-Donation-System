import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { donorsApi } from '@/api/donors';
import {
  type AdminCreateOrganPayload,
  type AdminOrganParams,
  type AdminUpdateOrganPayload,
  type AvailabilityParams,
  type OrganPayload,
  organsApi,
} from '@/api/organs';
import { queryKeys } from '@/lib/queryKeys';

// ---- Public

export function useOrganAvailability(params: AvailabilityParams) {
  return useQuery({
    queryKey: queryKeys.organs.availability(params),
    queryFn: () => organsApi.availability(params),
    placeholderData: keepPreviousData,
  });
}

export function useAvailabilitySummary() {
  return useQuery({ queryKey: queryKeys.organs.summary, queryFn: organsApi.summary });
}

// ---- Donor

export function useMyOrgans() {
  return useQuery({ queryKey: queryKeys.donor.organs, queryFn: donorsApi.myOrgans });
}

export function useCreateMyOrgan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: OrganPayload) => donorsApi.createMyOrgan(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.donor.all });
    },
  });
}

// ---- Admin

function useInvalidateOrgans() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.organs.all });
    void qc.invalidateQueries({ queryKey: queryKeys.hospitals.all });
    void qc.invalidateQueries({ queryKey: queryKeys.admin.all });
  };
}

export function useAdminOrgans(params: AdminOrganParams) {
  return useQuery({
    queryKey: queryKeys.organs.admin(params),
    queryFn: () => organsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useAdminCreateOrgan() {
  const invalidate = useInvalidateOrgans();
  return useMutation({ mutationFn: (payload: AdminCreateOrganPayload) => organsApi.create(payload), onSuccess: invalidate });
}

export function useAdminUpdateOrgan() {
  const invalidate = useInvalidateOrgans();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminUpdateOrganPayload }) => organsApi.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useAdminDeleteOrgan() {
  const invalidate = useInvalidateOrgans();
  return useMutation({ mutationFn: (id: string) => organsApi.remove(id), onSuccess: invalidate });
}
