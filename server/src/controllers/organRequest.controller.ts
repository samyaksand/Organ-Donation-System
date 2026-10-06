import type { Request, Response } from 'express';
import { adminIdOf } from '../middleware/auth';
import { getBody, getParams, getQuery } from '../middleware/validate';
import { idParam } from '../schemas/common';
import { createOrganRequestSchema, listOrganRequestsQuery, reviewOrganRequestSchema } from '../schemas/organRequest.schema';
import * as organRequestService from '../services/organRequest.service';
import { sendData, sendPage } from '../utils/response';

export async function create(req: Request, res: Response) {
  sendData(res, await organRequestService.create(adminIdOf(req), getBody(req, createOrganRequestSchema)), 201);
}

export async function list(req: Request, res: Response) {
  const { items, meta } = await organRequestService.list(getQuery(req, listOrganRequestsQuery));
  sendPage(res, items, meta);
}

export async function getById(req: Request, res: Response) {
  const { id } = getParams(req, idParam);
  sendData(res, await organRequestService.getById(id));
}

export async function history(req: Request, res: Response) {
  const { id } = getParams(req, idParam);
  sendData(res, await organRequestService.getHistory(id));
}

export async function review(req: Request, res: Response) {
  const { id } = getParams(req, idParam);
  sendData(res, await organRequestService.review(id, adminIdOf(req), getBody(req, reviewOrganRequestSchema)));
}

export async function cancel(req: Request, res: Response) {
  const { id } = getParams(req, idParam);
  sendData(res, await organRequestService.cancel(id, adminIdOf(req)));
}
