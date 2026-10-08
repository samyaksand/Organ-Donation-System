import type { Request, Response } from 'express';
import { getQuery } from '../middleware/validate';
import { analyticsWindowQuery } from '../schemas/analytics.schema';
import * as securityService from '../services/security.service';
import { sendData } from '../utils/response';

export async function overview(req: Request, res: Response) {
  sendData(res, await securityService.getSecurityOverview(getQuery(req, analyticsWindowQuery)));
}

export async function decisions(req: Request, res: Response) {
  sendData(res, await securityService.getAccessDecisionMetrics(getQuery(req, analyticsWindowQuery)));
}

export async function denied(req: Request, res: Response) {
  sendData(res, await securityService.getDeniedAccessEvents(getQuery(req, analyticsWindowQuery)));
}

export async function violations(req: Request, res: Response) {
  sendData(res, await securityService.getPolicyViolations(getQuery(req, analyticsWindowQuery)));
}

export async function trends(req: Request, res: Response) {
  sendData(res, await securityService.getSecurityTrends(getQuery(req, analyticsWindowQuery)));
}

export async function history(req: Request, res: Response) {
  sendData(res, await securityService.getSecurityEventHistory(getQuery(req, analyticsWindowQuery)));
}

export async function aiEvents(req: Request, res: Response) {
  sendData(res, await securityService.getAiSecurityEvents(getQuery(req, analyticsWindowQuery)));
}

export async function aiBreakdown(req: Request, res: Response) {
  sendData(res, await securityService.getAiSecurityBreakdown(getQuery(req, analyticsWindowQuery)));
}
