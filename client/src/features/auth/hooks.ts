import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { authApi, type ChangePasswordPayload, type LoginPayload, type RegisterPayload } from '@/api/auth';
import { queryKeys } from '@/lib/queryKeys';
import type { SessionUser } from '@/types/api';

/** Current session (GET /auth/me). Resolves to `null` when signed out - never throws for 401. */
export function useSession() {
  return useQuery<SessionUser | null>({
    queryKey: queryKeys.session,
    queryFn: async () => {
      try {
        return await authApi.me();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    meta: { authFlow: true },
    onSuccess: (user) => {
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'session' });
      qc.setQueryData(queryKeys.session, user);
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    meta: { authFlow: true },
    onSuccess: (user) => qc.setQueryData(queryKeys.session, user),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      // Order matters: write the signed-out session FIRST so every mounted component reading
      // useSession() (navbar, UserMenu, RequireRole) re-renders as signed-out immediately.
      // qc.clear() alone is not enough - it REMOVES the session query rather than updating it,
      // so an observer can briefly see stale `data` until something re-subscribes; setting the
      // query data explicitly guarantees a synchronous update with no window of staleness.
      qc.setQueryData(queryKeys.session, null);
      // Then drop every other cached private record so the next user (on a shared machine)
      // never sees them, without reintroducing the stale-session window.
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'session' });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    // A wrong current password is a 400, so a 401 here really is an expired session.
    mutationFn: (payload: ChangePasswordPayload) => authApi.changePassword(payload),
  });
}
