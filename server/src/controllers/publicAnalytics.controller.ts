import type { Request, Response } from 'express';
import { getQuery } from '../middleware/validate';
import { analyticsWindowQuery, trendsQuery } from '../schemas/analytics.schema';
import * as publicAnalyticsService from '../services/publicAnalytics.service';
import { sendData } from '../utils/response';

export async function overview(_req: Request, res: Response) {
  sendData(res, await publicAnalyticsService.getOverview());
}

export async function organs(_req: Request, res: Response) {
  sendData(res, await publicAnalyticsService.getOrganAvailability());
}

export async function hospitals(_req: Request, res: Response) {
  sendData(res, await publicAnalyticsService.getHospitalAvailability());
}

export async function concentration(_req: Request, res: Response) {
  sendData(res, await publicAnalyticsService.getConcentration());
}

export async function trends(req: Request, res: Response) {
  sendData(res, await publicAnalyticsService.getTrends(getQuery(req, trendsQuery)));
}

export async function breaches(req: Request, res: Response) {
  sendData(res, await publicAnalyticsService.getThresholdBreaches(getQuery(req, analyticsWindowQuery)));
}
