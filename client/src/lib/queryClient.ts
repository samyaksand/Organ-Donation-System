import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { queryKeys } from './queryKeys';

/**
 * A 401 from any private endpoint means the session expired or was revoked: mark the
 * session as signed out so route guards redirect to the login page.
 */
function onAuthError(error: unknown, key?: readonly unknown[]) {
  if (error instanceof ApiError && error.status === 401 && key?.[0] !== 'session') {
    queryClient.setQueryData(queryKeys.session, null);
  }
}

export const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({ onError: (error, query) => onAuthError(error, query.queryKey) }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) => {
      // Login failures are 401 too, but they are not an expired session.
      if (mutation.options.meta?.authFlow) return;
      onAuthError(error);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Never retry auth/permission/validation failures; retry transient errors once.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 1;
      },
    },
    mutations: { retry: false },
  },
});

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: { authFlow?: boolean };
  }
}
