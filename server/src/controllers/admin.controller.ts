import type { Request, Response } from 'express';
import * as adminService from '../services/admin.service';
import { sendData } from '../utils/response';

export async function overview(_req: Request, res: Response) {
  sendData(res, await adminService.getOverview());
}
