import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import type { AuthContext } from '../types/express';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/errors';
import { AUTH_COOKIE, clearAuthCookie } from '../utils/cookies';
import { verifyToken } from '../utils/jwt';
import { validateSession } from '../services/session.service';

/**
 * Verifies the JWT cookie, re-loads the user so that deleted accounts or changed roles are
 * rejected immediately instead of living on until token expiry, AND (when the token carries a
 * `jti`) checks the matching UserSession is still active - this is what makes a revoked session
 * actually stop authenticating, rather than only removing it from a list the old cookie could
 * still bypass. A token with no `jti` (issued before session tracking existed) is honored as
 * before until it expires naturally; every token issued from this point on always has one.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token: unknown = req.cookies?.[AUTH_COOKIE];
  if (typeof token !== 'string' || token.length === 0) {
    throw AppError.unauthenticated();
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    clearAuthCookie(res);
    throw AppError.unauthenticated('Your session has expired. Please sign in again.');
  }

  if (payload.jti) {
    const valid = await validateSession(payload.jti, token);
    if (!valid) {
      clearAuthCookie(res);
      throw AppError.unauthenticated('Your session has been signed out. Please sign in again.');
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      role: true,
      donor: { select: { id: true } },
      admin: { select: { id: true } },
    },
  });

  if (!user || user.role !== payload.role) {
    clearAuthCookie(res);
    throw AppError.unauthenticated('Your session is no longer valid. Please sign in again.');
  }

  const auth: AuthContext = {
    userId: user.id,
    email: user.email,
    role: user.role,
    donorId: user.donor?.id ?? null,
    adminId: user.admin?.id ?? null,
    sessionId: payload.jti ?? null,
  };
  req.auth = auth;
  next();
}

/** Must run after `requireAuth`. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) throw AppError.unauthenticated();
    if (!roles.includes(req.auth.role)) throw AppError.forbidden();
    next();
  };
}

/** Narrowing helpers for controllers behind role guards. */
export function donorIdOf(req: Request): string {
  const id = req.auth?.donorId;
  if (!id) throw AppError.forbidden('A donor account is required');
  return id;
}

export function adminIdOf(req: Request): string {
  const id = req.auth?.adminId;
  if (!id) throw AppError.forbidden('An admin account is required');
  return id;
}
