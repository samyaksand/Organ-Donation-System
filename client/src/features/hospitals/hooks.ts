import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type HospitalListParams, type HospitalPayload, hospitalsApi } from '@/api/hospitals';
import { queryKeys } from '@/lib/queryKeys';

export function useHospitals(params: HospitalListParams) {
  return useQuery({
    queryKey: queryKeys.hospitals.list(params),
    queryFn: () => hospitalsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useHospitalOptions() {
  return useQuery({ queryKey: queryKeys.hospitals.options, queryFn: hospitalsApi.options, staleTime: 5 * 60_000 });
}

export function useCities() {
  return useQuery({ queryKey: queryKeys.hospitals.cities, queryFn: hospitalsApi.cities, staleTime: 5 * 60_000 });
}

function useInvalidateHospitals() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.hospitals.all });
    void qc.invalidateQueries({ queryKey: queryKeys.organs.all });
    void qc.invalidateQueries({ queryKey: queryKeys.admin.overview });
  };
}

export function useCreateHospital() {
  const invalidate = useInvalidateHospitals();
  return useMutation({ mutationFn: (payload: HospitalPayload) => hospitalsApi.create(payload), onSuccess: invalidate });
}

export function useUpdateHospital() {
  const invalidate = useInvalidateHospitals();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<HospitalPayload> }) => hospitalsApi.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteHospital() {
  const invalidate = useInvalidateHospitals();
  return useMutation({ mutationFn: (id: string) => hospitalsApi.remove(id), onSuccess: invalidate });
}
