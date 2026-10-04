import type { Request, Response } from 'express';
import { getBody, getParams, getQuery } from '../middleware/validate';
import { idParam } from '../schemas/common';
import { hospitalSchema, listHospitalsQuery, updateHospitalSchema } from '../schemas/hospital.schema';
import * as hospitalService from '../services/hospital.service';
import { sendData, sendPage } from '../utils/response';

export async function list(req: Request, res: Response) {
  const { items, meta } = await hospitalService.listHospitals(getQuery(req, listHospitalsQuery));
  sendPage(res, items, meta);
}

export async function options(_req: Request, res: Response) {
  sendData(res, await hospitalService.listHospitalOptions());
}

export async function cities(_req: Request, res: Response) {
  sendData(res, await hospitalService.listCities());
}

export async function getById(req: Request, res: Response) {
  sendData(res, await hospitalService.getHospital(getParams(req, idParam).id));
}

export async function create(req: Request, res: Response) {
  sendData(res, await hospitalService.createHospital(getBody(req, hospitalSchema)), 201);
}

export async function update(req: Request, res: Response) {
  const { id } = getParams(req, idParam);
  sendData(res, await hospitalService.updateHospital(id, getBody(req, updateHospitalSchema)));
}

export async function remove(req: Request, res: Response) {
  await hospitalService.deleteHospital(getParams(req, idParam).id);
  res.status(204).end();
}
