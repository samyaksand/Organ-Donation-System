import { useMutation } from '@tanstack/react-query';
import { type CreatePledgePayload, pledgesApi } from '@/api/pledges';

export function useCreatePledge() {
  return useMutation({ mutationFn: (payload: CreatePledgePayload) => pledgesApi.create(payload) });
}
