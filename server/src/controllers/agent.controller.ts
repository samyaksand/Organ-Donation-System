import type { Request, Response } from 'express';
import { getBody } from '../middleware/validate';
import { investigateRequestSchema } from '../schemas/agent.schema';
import * as agentService from '../services/agent.service';
import { sendData } from '../utils/response';

export async function investigate(req: Request, res: Response) {
  const { question } = getBody(req, investigateRequestSchema);
  sendData(res, await agentService.investigate(question));
}
