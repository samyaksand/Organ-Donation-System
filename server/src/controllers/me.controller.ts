import type { Request, Response } from 'express';
import { getParams, getQuery } from '../middleware/validate';
import { idParam } from '../schemas/common';
import { myActivityQuery } from '../schemas/me.schema';
import { getMyActivity, recordSecurityActivity } from '../services/securityActivity.service';
import * as sessionService from '../services/session.service';
import { AppError } from '../utils/errors';
import { sendData } from '../utils/response';

function auth(req: Request) {
  if (!req.auth) throw AppError.unauthenticated();
  return req.auth;
}

export async function listSessions(req: Request, res: Response) {
  const { userId, sessionId } = auth(req);
  if (!sessionId) {
    // A token issued before session tracking existed - nothing to list yet (it has no row).
    // Treat as an empty list rather than an error; the user just needs to sign in again to get
    // a trackable session, which happens naturally on next login.
    sendData(res, []);
    return;
  }
  sendData(res, await sessionService.listSessions(userId, sessionId));
}

export async function revokeSessionById(req: Request, res: Response) {
  const { userId, role } = auth(req);
  const { id } = getParams(req, idParam);
  await sessionService.revokeSession(userId, id);
  recordSecurityActivity({ userId, role, resource: 'auth-session', action: 'REVOKE_SESSION', decision: 'ALLOW', reason: 'Signed out of another device.' });
  res.status(204).end();
}

export async function revokeOtherSessions(req: Request, res: Response) {
  const { userId, role, sessionId } = auth(req);
  if (!sessionId) throw AppError.badRequest('Your current session is not trackable. Please sign in again.');
  const count = await sessionService.revokeOtherSessions(userId, sessionId);
  recordSecurityActivity({
    userId,
    role,
    resource: 'auth-session',
    action: 'REVOKE_OTHER_SESSIONS',
    decision: 'ALLOW',
    reason: `Signed out of ${count} other device${count === 1 ? '' : 's'}.`,
  });
  sendData(res, { revokedCount: count });
}

export async function getActivity(req: Request, res: Response) {
  const { userId } = auth(req);
  const { limit } = getQuery(req, myActivityQuery);
  sendData(res, await getMyActivity(userId, limit));
}
