import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/** Throttles credential endpoints (login/register/password change) per IP. */
export const authRateLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MIN * 60_000,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, res) => {
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait a few minutes and try again.' },
    });
  },
});
