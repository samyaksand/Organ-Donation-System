import type { Request, Response } from 'express';
import { adminIdOf, donorIdOf } from '../middleware/auth';
import { getBody, getParams, getQuery } from '../middleware/validate';
import { idParam } from '../schemas/common';
import { createWithdrawalSchema, listWithdrawalsQuery, reviewWithdrawalSchema } from '../schemas/withdrawal.schema';
import * as withdrawalService from '../services/withdrawal.service';
import { sendData, sendPage } from '../utils/response';

export async function listMine(req: Request, res: Response) {
  sendData(res, await withdrawalService.listOwn(donorIdOf(req)));
}

export async function create(req: Request, res: Response) {
  sendData(res, await withdrawalService.createOwn(donorIdOf(req), getBody(req, createWithdrawalSchema)), 201);
}

export async function list(req: Request, res: Response) {
  const { items, meta } = await withdrawalService.listForAdmin(getQuery(req, listWithdrawalsQuery));
  sendPage(res, items, meta);
}

export async function review(req: Request, res: Response) {
  const { id } = getParams(req, idParam);
  sendData(res, await withdrawalService.review(id, adminIdOf(req), getBody(req, reviewWithdrawalSchema)));
}

export async function history(req: Request, res: Response) {
  const { id } = getParams(req, idParam);
  sendData(res, await withdrawalService.getHistory(id));
}
