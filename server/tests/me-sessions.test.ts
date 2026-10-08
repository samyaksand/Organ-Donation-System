import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { env } from '../src/config/env';
import { prisma as prismaClient } from '../src/lib/prisma';
import { donorUser } from './helpers/auth';
import type { PrismaMock } from './helpers/prisma-mock';

vi.mock('../src/lib/prisma', async () => {
  const { createPrismaMock } = await import('./helpers/prisma-mock.js');
  return { prisma: createPrismaMock() };
});

const prisma = prismaClient as unknown as PrismaMock;
const app = createApp();

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const now = new Date();
function baseSession(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'sess_current',
    userId: donorUser.id,
    tokenHash: 'will-be-overwritten',
    createdAt: now,
    lastUsedAt: now,
    expiresAt: new Date(now.getTime() + 8 * 3600_000),
    revokedAt: null,
    browser: 'Chrome',
    os: 'Windows',
    ipHash: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

/** authCookie (tests/helpers/auth.ts) signs a token with no jti by default; session tests need
 * one with a jti whose UserSession row's tokenHash actually matches the signed token (see
 * services/session.service.ts's validateSession), so this builds both together. Also wires the
 * default requireAuth session lookup (first findUnique call) to the current session row. */
function signInAsDonor(sessionId = 'sess_current', currentSessionOverrides: Partial<Record<string, unknown>> = {}) {
  prisma.user.findUnique.mockImplementation(async (args: { where: { id?: string; email?: string } }) => {
    if (args.where.id === donorUser.id || args.where.email === donorUser.email) return donorUser;
    return null;
  });
  const token = jwt.sign({ role: donorUser.role }, env.JWT_SECRET, { subject: donorUser.id, jwtid: sessionId, expiresIn: '8h', algorithm: 'HS256' });
  const currentSession = baseSession({ id: sessionId, tokenHash: hashToken(token), ...currentSessionOverrides });
  prisma.userSession.findUnique.mockResolvedValueOnce(currentSession); // requireAuth's validateSession lookup
  return { cookie: `ods_token=${token}`, currentSession };
}

describe('GET /api/v1/me/sessions', () => {
  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/v1/me/sessions');
    expect(res.status).toBe(401);
  });

  it('a donor sees their own sessions, with the current one marked', async () => {
    const { cookie, currentSession } = signInAsDonor('sess_current');
    const otherSession = baseSession({ id: 'sess_other', browser: 'Firefox', os: 'macOS' });
    prisma.userSession.findMany.mockResolvedValue([currentSession, otherSession]);
    const res = await request(app).get('/api/v1/me/sessions').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    const current = res.body.data.find((s: { isCurrent: boolean }) => s.isCurrent);
    expect(current.id).toBe('sess_current');
    // listSessions is always called with the authenticated user's OWN id, never a client-supplied one.
    expect(prisma.userSession.findMany.mock.calls[0]![0].where.userId).toBe(donorUser.id);
  });

  it('revoked session cannot authenticate (401, not silently ignored)', async () => {
    const { cookie } = signInAsDonor('sess_revoked', { revokedAt: new Date() });
    const res = await request(app).get('/api/v1/me/sessions').set('Cookie', cookie);
    expect(res.status).toBe(401);
  });

  it('expired session cannot authenticate', async () => {
    const { cookie } = signInAsDonor('sess_expired', { expiresAt: new Date(Date.now() - 1000) });
    const res = await request(app).get('/api/v1/me/sessions').set('Cookie', cookie);
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/v1/me/sessions/:id', () => {
  it('a donor can revoke their own session', async () => {
    const { cookie } = signInAsDonor('sess_current');
    const otherSession = baseSession({ id: 'sess_other' });
    prisma.userSession.findUnique.mockResolvedValueOnce(otherSession); // revokeSession's ownership lookup
    prisma.userSession.update.mockResolvedValue({});
    const res = await request(app).delete(`/api/v1/me/sessions/${otherSession.id}`).set('Cookie', cookie);
    expect(res.status).toBe(204);
    expect(prisma.userSession.update).toHaveBeenCalledWith({ where: { id: otherSession.id }, data: { revokedAt: expect.any(Date) } });
  });

  it("a donor cannot revoke another user's session (404, not 200)", async () => {
    const { cookie } = signInAsDonor('sess_current');
    const otherUsersSession = baseSession({ id: 'sess_other', userId: 'different_user_id' });
    prisma.userSession.findUnique.mockResolvedValueOnce(otherUsersSession);
    const res = await request(app).delete(`/api/v1/me/sessions/${otherUsersSession.id}`).set('Cookie', cookie);
    expect(res.status).toBe(404);
    // requireAuth's own lastUsedAt touch-update on the CURRENT session is expected; the revoke
    // itself (on the other user's session) must never happen.
    expect(prisma.userSession.update).not.toHaveBeenCalledWith(expect.objectContaining({ where: { id: otherUsersSession.id } }));
  });

  it('handles an invalid/unknown session id safely (404, not a crash)', async () => {
    const { cookie } = signInAsDonor('sess_current');
    prisma.userSession.findUnique.mockResolvedValueOnce(null);
    const res = await request(app).delete('/api/v1/me/sessions/does-not-exist').set('Cookie', cookie);
    expect(res.status).toBe(404);
  });

  it('records a SecurityEvent when a session is revoked', async () => {
    const { cookie } = signInAsDonor('sess_current');
    const otherSession = baseSession({ id: 'sess_other' });
    prisma.userSession.findUnique.mockResolvedValueOnce(otherSession);
    prisma.userSession.update.mockResolvedValue({});
    await request(app).delete(`/api/v1/me/sessions/${otherSession.id}`).set('Cookie', cookie);
    expect(prisma.securityEvent.create).toHaveBeenCalled();
    const call = prisma.securityEvent.create.mock.calls[0]![0];
    expect(call.data.action).toBe('REVOKE_SESSION');
    expect(call.data.actorUserId).toBe(donorUser.id);
  });
});

describe('POST /api/v1/me/sessions/revoke-others', () => {
  it('revokes every other session but leaves the current one active', async () => {
    const { cookie } = signInAsDonor('sess_current');
    prisma.userSession.updateMany.mockResolvedValue({ count: 2 });
    const res = await request(app).post('/api/v1/me/sessions/revoke-others').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.revokedCount).toBe(2);
    const where = prisma.userSession.updateMany.mock.calls[0]![0].where;
    expect(where.userId).toBe(donorUser.id);
    expect(where.id).toEqual({ not: 'sess_current' });
  });
});

describe('GET /api/v1/me/security/activity', () => {
  it("returns only the current user's own activity", async () => {
    const { cookie } = signInAsDonor('sess_current');
    prisma.securityEvent.findMany.mockResolvedValue([
      { id: 'e1', action: 'LOGIN', resource: 'auth-session', decision: 'ALLOW', reason: 'Signed in successfully.', createdAt: now },
    ]);
    const res = await request(app).get('/api/v1/me/security/activity').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(prisma.securityEvent.findMany.mock.calls[0]![0].where.actorUserId).toBe(donorUser.id);
  });

  it('public users cannot access the activity endpoint', async () => {
    const res = await request(app).get('/api/v1/me/security/activity');
    expect(res.status).toBe(401);
  });

  it('never returns another user\'s activity, raw ids, or internal payload fields', async () => {
    const { cookie } = signInAsDonor('sess_current');
    prisma.securityEvent.findMany.mockResolvedValue([
      { id: 'e1', action: 'LOGIN', resource: 'auth-session', decision: 'ALLOW', reason: 'Signed in successfully.', createdAt: now },
    ]);
    const res = await request(app).get('/api/v1/me/security/activity').set('Cookie', cookie);
    const keys = Object.keys(res.body.data[0]);
    expect(keys.sort()).toEqual(['action', 'createdAt', 'decision', 'id', 'reason', 'resource'].sort());
    expect(JSON.stringify(res.body)).not.toContain('actorUserId');
    expect(JSON.stringify(res.body)).not.toContain('policyCode');
  });
});
