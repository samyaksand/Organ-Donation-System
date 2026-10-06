import type { Request, Response } from 'express';
import { getQuery } from '../middleware/validate';
import { analyticsWindowQuery, trendsQuery } from '../schemas/analytics.schema';
import * as analyticsService from '../services/analytics.service';
import { sendData } from '../utils/response';

export async function overview(_req: Request, res: Response) {
  sendData(res, await analyticsService.getOverview());
}

export async function donors(req: Request, res: Response) {
  sendData(res, await analyticsService.getDonorAnalytics(getQuery(req, analyticsWindowQuery)));
}

export async function organs(_req: Request, res: Response) {
  sendData(res, await analyticsService.getOrganAnalytics());
}

export async function hospitals(_req: Request, res: Response) {
  sendData(res, await analyticsService.getHospitalAnalytics());
}

export async function withdrawals(req: Request, res: Response) {
  sendData(res, await analyticsService.getWithdrawalAnalytics(getQuery(req, analyticsWindowQuery)));
}

export async function organRequests(req: Request, res: Response) {
  sendData(res, await analyticsService.getOrganRequestAnalytics(getQuery(req, analyticsWindowQuery)));
}

export async function trends(req: Request, res: Response) {
  sendData(res, await analyticsService.getTrends(getQuery(req, trendsQuery)));
}
