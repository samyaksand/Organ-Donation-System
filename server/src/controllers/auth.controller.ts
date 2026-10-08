import type { Request, Response } from 'express';
import { getBody } from '../middleware/validate';
import { changePasswordSchema, loginSchema, registerSchema } from '../schemas/auth.schema';
import * as authService from '../services/auth.service';
import { recordSecurityActivity } from '../services/securityActivity.service';
import { revokeSession } from '../services/session.service';
import { AUTH_COOKIE, clearAuthCookie, setAuthCookie } from '../utils/cookies';
import { AppError } from '../utils/errors';
import { verifyToken } from '../utils/jwt';
import { sendData } from '../utils/response';

function requestMeta(req: Request) {
  return { userAgent: req.get('user-agent') ?? undefined, ipAddress: req.ip };
}

export async function register(req: Request, res: Response) {
  const { user, token } = await authService.registerDonor(getBody(req, registerSchema), requestMeta(req));
  setAuthCookie(res, token);
  sendData(res, { user }, 201);
}

export async function login(req: Request, res: Response) {
  const { user, token } = await authService.login(getBody(req, loginSchema), requestMeta(req));
  setAuthCookie(res, token);
  sendData(res, { user });
}

/**
 * Public by design (no requireAuth) - logging out must always succeed and clear the cookie even
 * with an expired/invalid token, so the token is decoded best-effort here rather than relying
 * on req.auth. A token that fails to verify simply skips the session-revoke/activity-record
 * step; the cookie is still cleared either way.
 */
export async function logout(req: Request, res: Response) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (typeof token === 'string' && token.length > 0) {
    try {
      const payload = verifyToken(token);
      if (payload.jti) {
        await revokeSession(payload.sub, payload.jti).catch(() => {});
        recordSecurityActivity({ userId: payload.sub, role: payload.role, resource: 'auth-session', action: 'LOGOUT', decision: 'ALLOW', reason: 'Signed out.' });
      }
    } catch {
      // Expired/invalid token - nothing to revoke, still clear the cookie below.
    }
  }
  clearAuthCookie(res);
  res.status(204).end();
}

export async function me(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthenticated();
  sendData(res, { user: await authService.getSessionUser(req.auth.userId) });
}

export async function changePassword(req: Request, res: Response) {
  if (!req.auth) throw AppError.unauthenticated();
  await authService.changePassword(req.auth.userId, getBody(req, changePasswordSchema));
  sendData(res, { message: 'Password updated' });
}
