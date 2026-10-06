import { useMutation } from '@tanstack/react-query';
import { agentApi } from '@/api/agent';

/** Runs one investigation. Not cached as a query: each click is a fresh, potentially-costly LLM call. */
export function useInvestigate() {
  return useMutation({
    mutationFn: (question?: string) => agentApi.investigate(question),
  });
}
