/**
 * Express middleware that calls the policy engine for a named resource/action and records a
 * SecurityEvent, without changing the route's existing authorization (requireAuth/requireRole
 * already run first and remain the actual gate - see each route file). This middleware adds the
 * audit trail and the ABAC/ownership explanation on top of routes that already enforce
 * ownership structurally (e.g. /donors/me/* always uses the JWT's own donorId, never a
 * client-supplied id), so the policy engine's decision always matches what the route already
 * does and the audit log stays truthful.
 *
 * `resourceOwnerId` is resolved per-request (e.g. "the donorId this route operates on") since
 * it is not known until the request arrives.
 */
import type { NextFunction, Request, Response } from 'express';
import { authorize } from './policyEngine';
import type { ResourceAction, ResourceName } from './types';
import { AppError } from '../utils/errors';

function actorRole(req: Request): 'PUBLIC' | 'DONOR' | 'ADMIN' | 'SUPER_ADMIN' {
  return req.auth?.role ?? 'PUBLIC';
}

/**
 * Wraps a route handler with a policy-engine check. On DENY, responds 403 (matching
 * AppError.forbidden's shape) WITHOUT calling the wrapped handler - this is a defense-in-depth
 * audit layer behind routes that are already gated by requireAuth/requireRole/ownership-scoped
 * query patterns; a real mismatch here indicates a bug in the matrix, not an expected path.
 */
export function auditedAccess(resource: ResourceName, action: ResourceAction, resolveOwnerId?: (req: Request) => string | undefined) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const evaluation = await authorize({
      role: actorRole(req),
      userId: req.auth?.userId,
      donorId: req.auth?.donorId ?? undefined,
      resource,
      action,
      resourceOwnerId: resolveOwnerId?.(req),
      ipAddress: req.ip,
    });

    if (evaluation.decision === 'DENY') {
      throw AppError.forbidden(evaluation.reason);
    }
    next();
  };
}
