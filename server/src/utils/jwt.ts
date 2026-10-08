import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { env } from '../config/env';

export interface TokenPayload {
  sub: string;
  role: Role;
  /** Session id (UserSession.id) - lets requireAuth reject a revoked session immediately, even
   * before the JWT's own expiry. Optional only for backward-compatible decoding of a token
   * issued before session tracking existed; signToken below always sets it. */
  jti?: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign({ role: payload.role }, env.JWT_SECRET, {
    subject: payload.sub,
    ...(payload.jti ? { jwtid: payload.jti } : {}),
    expiresIn: Math.floor(env.jwtExpiresInMs / 1000),
    algorithm: 'HS256',
  });
}

const VALID_ROLES: Role[] = ['DONOR', 'ADMIN', 'SUPER_ADMIN'];

/** Throws (JsonWebTokenError / TokenExpiredError) when invalid. */
export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  if (typeof decoded === 'string' || !decoded.sub || !VALID_ROLES.includes(decoded.role)) {
    throw new jwt.JsonWebTokenError('Malformed token payload');
  }
  return { sub: decoded.sub, role: decoded.role, jti: decoded.jti };
}
