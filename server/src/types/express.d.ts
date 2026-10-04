import type { Role } from '@prisma/client';

export interface AuthContext {
  userId: string;
  role: Role;
  email: string;
  donorId: string | null;
  adminId: string | null;
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
