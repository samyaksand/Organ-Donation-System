/**
 * Real server-side session management, layered onto the existing JWT/httpOnly-cookie
 * architecture rather than replacing it: the JWT is still what the cookie carries and what
 * requireAuth verifies cryptographically, but every signed-in token now also has a matching
 * UserSession row (looked up by `jti`) that can be revoked independently of the JWT's own
 * expiry - see utils/jwt.ts's `jti` claim and middleware/auth.ts's requireAuth. A revoked or
 * expired-in-the-database session is rejected even if the JWT signature itself is still valid.
 *
 * Never stores a raw token: `tokenHash` is a SHA-256 hex digest, so a leaked database row alone
 * can never be replayed as a session.
 */
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { signToken } from '../utils/jwt';
import { formatDeviceLabel, parseUserAgent } from '../utils/userAgent';
import { fireAndForget } from '../utils/fireAndForget';
import { AppError } from '../utils/errors';
import type { Role } from '@prisma/client';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Coarse, privacy-safe hash of the request IP - never the raw address, never used for anything
 * beyond "was this the same rough origin as another session", which this build doesn't even
 * surface in the UI yet (reserved for a future anomaly signal). */
function hashIp(ip: string | undefined): string | null {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

export interface CreateSessionInput {
  userId: string;
  role: Role;
  userAgent: string | undefined;
  ipAddress: string | undefined;
}

/**
 * Issues a new signed JWT AND its matching UserSession row, atomically from the caller's point
 * of view (the row is created first so the token's `jti` always resolves). Used by every login/
 * register path - see controllers/auth.controller.ts.
 */
export async function createSession(input: CreateSessionInput): Promise<{ token: string; sessionId: string }> {
  const { browser, os } = parseUserAgent(input.userAgent);
  const expiresAt = new Date(Date.now() + env.jwtExpiresInMs);

  // Created with a placeholder tokenHash, then updated once the token (which needs the
  // session's own id as `jti`) is signed - avoids a chicken-and-egg id dependency.
  const session = await prisma.userSession.create({
    data: {
      userId: input.userId,
      tokenHash: 'pending',
      expiresAt,
      browser,
      os,
      ipHash: hashIp(input.ipAddress),
    },
  });

  const token = signToken({ sub: input.userId, role: input.role, jti: session.id });
  await prisma.userSession.update({ where: { id: session.id }, data: { tokenHash: hashToken(token) } });

  return { token, sessionId: session.id };
}

/**
 * Called by requireAuth on every authenticated request. Returns the session if it is valid
 * (exists, not revoked, not expired, and its stored hash matches the presented token - the hash
 * check guards against a session row surviving a token that was somehow re-signed), null
 * otherwise. Also bumps `lastUsedAt` - fire-and-forget, never blocks the request on this write.
 */
export async function validateSession(sessionId: string, token: string): Promise<boolean> {
  const session = await prisma.userSession.findUnique({ where: { id: sessionId } });
  if (!session) return false;
  if (session.revokedAt) return false;
  if (session.expiresAt.getTime() < Date.now()) return false;
  if (session.tokenHash !== hashToken(token)) return false;

  fireAndForget(
    () => prisma.userSession.update({ where: { id: sessionId }, data: { lastUsedAt: new Date() } }),
    () => {},
  );
  return true;
}

export interface SessionDto {
  id: string;
  browser: string | null;
  os: string | null;
  deviceLabel: string;
  createdAt: string;
  lastUsedAt: string;
  isCurrent: boolean;
}

function toDto(session: { id: string; browser: string | null; os: string | null; createdAt: Date; lastUsedAt: Date }, currentSessionId: string): SessionDto {
  return {
    id: session.id,
    browser: session.browser,
    os: session.os,
    deviceLabel: formatDeviceLabel({ browser: session.browser, os: session.os }),
    createdAt: session.createdAt.toISOString(),
    lastUsedAt: session.lastUsedAt.toISOString(),
    isCurrent: session.id === currentSessionId,
  };
}

/** Active (not revoked, not expired) sessions for one user, current session first. Never
 * returns another user's sessions - the caller always passes the authenticated user's own id. */
export async function listSessions(userId: string, currentSessionId: string): Promise<SessionDto[]> {
  const sessions = await prisma.userSession.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { lastUsedAt: 'desc' },
  });
  return sessions.map((s) => toDto(s, currentSessionId)).sort((a, b) => (a.isCurrent === b.isCurrent ? 0 : a.isCurrent ? -1 : 1));
}

/** Revokes one session the caller owns. Throws 404 if it does not exist or belongs to someone
 * else - never reveals whether a session id exists for another user (same shape either way). */
export async function revokeSession(userId: string, sessionId: string): Promise<void> {
  const session = await prisma.userSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) throw AppError.notFound('Session');
  if (session.revokedAt) return; // already revoked - idempotent
  await prisma.userSession.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
}

/** Revokes every OTHER active session for this user - the current one is explicitly excluded so
 * "sign out of all other sessions" can never lock the caller out of their own request. Returns
 * the number of sessions revoked, for the confirmation toast. */
export async function revokeOtherSessions(userId: string, currentSessionId: string): Promise<number> {
  const result = await prisma.userSession.updateMany({
    where: { userId, id: { not: currentSessionId }, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count;
}
