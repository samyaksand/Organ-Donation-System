import type { Request, Response } from 'express';
import { getBody } from '../middleware/validate';
import { changePasswordSchema, loginSchema, registerSchema } from '../schemas/auth.schema';
import * as authService from '../services/auth.service';
import { clearAuthCookie, setAuthCookie } from '../utils/cookies';
import { AppError } from '../utils/errors';
import { sendData } from '../utils/response';

export async function register(req: Request, res: Response) {
  const { user, token } = await authService.registerDonor(getBody(req, registerSchema));
  setAuthCookie(res, token);
  sendData(res, { user }, 201);
}

export async function login(req: Request, res: Response) {
  const { user, token } = await authService.login(getBody(req, loginSchema));
  setAuthCookie(res, token);
  sendData(res, { user });
}

export function logout(_req: Request, res: Response) {
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
