import type { Request, Response } from 'express';
import * as recoveryService from '../services/recovery.service';
import { sendData } from '../utils/response';

export async function status(_req: Request, res: Response) {
  sendData(res, await recoveryService.getRecoveryStatus());
}

export async function snapshot(_req: Request, res: Response) {
  sendData(res, await recoveryService.createSnapshot());
}

export async function restore(req: Request, res: Response) {
  const auth = req.auth!;
  sendData(res, await recoveryService.restoreFromSnapshot({ userId: auth.userId, email: auth.email }));
}
