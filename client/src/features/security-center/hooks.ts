import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { meApi } from '@/api/me';
import { queryKeys } from '@/lib/queryKeys';

/** Any signed-in user's own security center: real server-side sessions and activity, scoped to
 * the authenticated caller by the server (see server/src/controllers/me.controller.ts) - the
 * frontend never filters by user id itself. */
export function useMySessions() {
  return useQuery({ queryKey: queryKeys.me.sessions, queryFn: meApi.sessions });
}

export function useMyActivity(limit = 25) {
  return useQuery({ queryKey: queryKeys.me.activity(limit), queryFn: () => meApi.activity(limit) });
}

export function useRevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => meApi.revokeSession(sessionId),
    onSuccess: () => {
      toast.success('Session signed out');
      void qc.invalidateQueries({ queryKey: queryKeys.me.sessions });
    },
    onError: (err) => toast.error('Could not sign out that session', { description: errorMessage(err) }),
  });
}

export function useRevokeOtherSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => meApi.revokeOtherSessions(),
    onSuccess: (result) => {
      toast.success(`Signed out of ${result.revokedCount} other device${result.revokedCount === 1 ? '' : 's'}`);
      void qc.invalidateQueries({ queryKey: queryKeys.me.sessions });
    },
    onError: (err) => toast.error('Could not sign out other sessions', { description: errorMessage(err) }),
  });
}
