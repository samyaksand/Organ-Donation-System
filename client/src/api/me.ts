import type { MyActivityItem, MySession, RevokeOtherSessionsResult } from '@/types/api';
import { api } from './client';

/** Any signed-in user's own security center: active sessions and recent activity. Every
 * endpoint is server-scoped to the authenticated caller - see server/src/controllers/
 * me.controller.ts; this client never passes another user's id. */
export const meApi = {
  sessions: () => api.get<MySession[]>('/me/sessions'),
  revokeSession: (sessionId: string) => api.delete(`/me/sessions/${sessionId}`),
  revokeOtherSessions: () => api.post<RevokeOtherSessionsResult>('/me/sessions/revoke-others'),
  activity: (limit = 25) => api.get<MyActivityItem[]>('/me/security/activity', { limit }),
};
