import type { Request, Response } from 'express';
import { adminIdOf, donorIdOf } from '../middleware/auth';
import { getBody, getParams, getQuery } from '../middleware/validate';
import { idParam } from '../schemas/common';
import {
  adminCreateOrganSchema,
  adminListOrgansQuery,
  adminUpdateOrganSchema,
  donorCreateOrganSchema,
  publicOrganSearchQuery,
} from '../schemas/organ.schema';
import * as organService from '../services/organ.service';
import { sendData, sendPage } from '../utils/response';

// ---- Public

export async function searchAvailability(req: Request, res: Response) {
  const { items, meta } = await organService.searchPublic(getQuery(req, publicOrganSearchQuery));
  sendPage(res, items, meta);
}

export async function availabilitySummary(_req: Request, res: Response) {
  sendData(res, await organService.availabilitySummary());
}

// ---- Donor

export async function listMine(req: Request, res: Response) {
  sendData(res, await organService.listOwn(donorIdOf(req)));
}

export async function createMine(req: Request, res: Response) {
  sendData(res, await organService.createOwn(donorIdOf(req), getBody(req, donorCreateOrganSchema)), 201);
}

// ---- Admin

export async function list(req: Request, res: Response) {
  const { items, meta } = await organService.listForAdmin(getQuery(req, adminListOrgansQuery));
  sendPage(res, items, meta);
}

export async function create(req: Request, res: Response) {
  sendData(res, await organService.createForAdmin(getBody(req, adminCreateOrganSchema)), 201);
}

export async function update(req: Request, res: Response) {
  const { id } = getParams(req, idParam);
  sendData(res, await organService.updateForAdmin(id, getBody(req, adminUpdateOrganSchema), adminIdOf(req)));
}

export async function remove(req: Request, res: Response) {
  await organService.deleteForAdmin(getParams(req, idParam).id);
  res.status(204).end();
}
