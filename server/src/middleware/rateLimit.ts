import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
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

/**
 * Throttles the Operations Intelligence Agent endpoint, per signed-in admin (not per IP -
 * `requireAuth` has already run by the time this middleware is reached, see agent.routes.ts).
 * LLM calls are comparatively expensive, so this budget is intentionally much tighter than the
 * auth limiter.
 */
export const agentRateLimiter = rateLimit({
  windowMs: env.AGENT_RATE_LIMIT_WINDOW_MIN * 60_000,
  limit: env.AGENT_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.auth?.userId ?? ipKeyGenerator(req.ip ?? 'unknown'),
  handler: (_req, res) => {
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many investigations requested. Please wait a few minutes and try again.' },
    });
  },
});

/** Throttles the public (unauthenticated) analytics endpoints, per IP. */
export const publicRateLimiter = rateLimit({
  windowMs: env.PUBLIC_RATE_LIMIT_WINDOW_MIN * 60_000,
  limit: env.PUBLIC_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a few minutes and try again.' },
    });
  },
});

/**
 * Throttles the public Operations Intelligence endpoint, per IP. Much tighter than the public
 * analytics limiter since each request is a comparatively expensive LLM call, and there is no
 * signed-in account to rate-limit by - this is the only backstop against one visitor exhausting
 * the shared free-tier provider quota for everyone else.
 */
export const publicAgentRateLimiter = rateLimit({
  windowMs: env.PUBLIC_AGENT_RATE_LIMIT_WINDOW_MIN * 60_000,
  limit: env.PUBLIC_AGENT_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Too many investigations requested. Please wait a few minutes and try again.' },
    });
  },
});
