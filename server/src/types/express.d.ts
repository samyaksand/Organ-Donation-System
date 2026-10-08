import type { Role } from '@prisma/client';

export interface AuthContext {
  userId: string;
  role: Role;
  email: string;
  donorId: string | null;
  adminId: string | null;
  /** The UserSession row backing this request's JWT (see utils/jwt.ts's `jti` claim and
   * services/session.service.ts). Null only for a token issued before session tracking existed
   * (pre-migration) - such a token is still honored until it expires naturally, but has no
   * session to revoke/list. */
  sessionId: string | null;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      /** Output of the `validate` middleware (parsed + coerced by zod). */
      validated?: { body?: unknown; query?: unknown; params?: unknown };
    }
  }
}
