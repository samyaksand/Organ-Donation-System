/**
 * Donor-facing security activity, built entirely on the EXISTING SecurityEvent table (see
 * security/policyEngine.ts and prisma/schema.prisma's SecurityEvent model) - not a second
 * logging system. `recordSecurityActivity` writes the same shape of row the policy engine
 * writes for an access decision, so the admin Security dashboard, the policy engine's own
 * audit trail, and this donor-facing feed all read from one table.
 *
 * Only a deliberately small set of MEANINGFUL events is recorded here (login, logout, session
 * revoked, password changed, a denied access attempt) - never one row per API request, which
 * would make this table (and a donor's own activity feed) noise rather than signal.
 */
import { prisma } from '../lib/prisma';
import { fireAndForget } from '../utils/fireAndForget';
import type { AccessDecision, DataClassification } from '@prisma/client';

export type ActivityResource =
  | 'auth-session'
  | 'auth-password'
  | 'donor-profile'
  | 'donor-organ'
  | 'donor-withdrawal';
export type ActivityAction = 'LOGIN' | 'LOGOUT' | 'REVOKE_SESSION' | 'REVOKE_OTHER_SESSIONS' | 'PASSWORD_CHANGED' | 'CREATE' | 'UPDATE';

export interface RecordActivityInput {
  userId: string;
  role: 'DONOR' | 'ADMIN' | 'SUPER_ADMIN';
  resource: ActivityResource;
  action: ActivityAction;
  decision: AccessDecision;
  reason: string;
  classification?: DataClassification;
}

/** Fire-and-forget by design (same pattern as policyEngine.ts's recordSecurityEvent): a logging
 * failure must never block the actual login/logout/revoke operation it is describing. */
export function recordSecurityActivity(input: RecordActivityInput): void {
  fireAndForget(
    () =>
      prisma.securityEvent.create({
        data: {
          actorUserId: input.userId,
          actorRole: input.role,
          resource: input.resource,
          action: input.action,
          classification: input.classification ?? 'PROTECTED',
          decision: input.decision,
          policyCode: 'self-service-activity',
          reason: input.reason,
        },
      }),
    (err) => console.error('[security] failed to record activity SecurityEvent:', err instanceof Error ? err.message : err),
  );
}

export interface ActivityItemDto {
  id: string;
  action: ActivityAction | string;
  resource: string;
  decision: AccessDecision;
  reason: string;
  createdAt: string;
}

/**
 * The current user's OWN recent activity, newest first. `userId` must always be the
 * authenticated caller's own id (see controllers/me.controller.ts) - this function has no
 * concept of "someone else's activity" by design, it simply never takes another user's id.
 */
export async function getMyActivity(userId: string, limit = 25): Promise<ActivityItemDto[]> {
  const events = await prisma.securityEvent.findMany({
    where: { actorUserId: userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, action: true, resource: true, decision: true, reason: true, createdAt: true },
  });
  return events.map((e) => ({
    id: e.id,
    action: e.action,
    resource: e.resource,
    decision: e.decision,
    reason: e.reason,
    createdAt: e.createdAt.toISOString(),
  }));
}
