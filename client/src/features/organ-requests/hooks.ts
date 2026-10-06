import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type CreateOrganRequestPayload,
  type OrganRequestListParams,
  organRequestsApi,
  type ReviewOrganRequestPayload,
} from '@/api/organ-requests';
import { queryKeys } from '@/lib/queryKeys';

function useInvalidateOrganRequests() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.organRequests.all });
    void qc.invalidateQueries({ queryKey: queryKeys.organs.all });
    void qc.invalidateQueries({ queryKey: queryKeys.admin.all });
  };
}

export function useOrganRequests(params: OrganRequestListParams) {
  return useQuery({
    queryKey: queryKeys.organRequests.list(params),
    queryFn: () => organRequestsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useOrganRequest(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.organRequests.detail(id ?? ''),
    queryFn: () => organRequestsApi.get(id!),
    enabled: Boolean(id),
  });
}

export function useOrganRequestHistory(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.organRequests.history(id ?? ''),
    queryFn: () => organRequestsApi.history(id!),
    enabled: Boolean(id),
  });
}

export function useCreateOrganRequest() {
  const invalidate = useInvalidateOrganRequests();
  return useMutation({ mutationFn: (payload: CreateOrganRequestPayload) => organRequestsApi.create(payload), onSuccess: invalidate });
}

export function useReviewOrganRequest() {
  const invalidate = useInvalidateOrganRequests();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReviewOrganRequestPayload }) => organRequestsApi.review(id, payload),
    onSuccess: invalidate,
  });
}

export function useCancelOrganRequest() {
  const invalidate = useInvalidateOrganRequests();
  return useMutation({ mutationFn: (id: string) => organRequestsApi.cancel(id), onSuccess: invalidate });
}
