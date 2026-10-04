import type { CookieOptions, Response } from 'express';
import { env } from '../config/env';

export const AUTH_COOKIE = 'ods_token';

function baseOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    path: '/',
    // Shares the cookie across subdomains (e.g. the API on api.example.com and the SPA on
    // example.com) when COOKIE_DOMAIN is set; unset for same-origin or local deployments.
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE, token, { ...baseOptions(), maxAge: env.jwtExpiresInMs });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE, baseOptions());
}
