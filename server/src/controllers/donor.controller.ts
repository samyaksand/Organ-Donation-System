import type { Request, Response } from 'express';
import { donorIdOf } from '../middleware/auth';
import { getBody, getParams, getQuery } from '../middleware/validate';
import { idParam } from '../schemas/common';
import {
  adminResetPasswordSchema,
  adminUpdateDonorSchema,
  listDonorsQuery,
  nextOfKinSchema,
  updateOwnProfileSchema,
} from '../schemas/donor.schema';
import * as donorService from '../services/donor.service';
import { sendData, sendPage } from '../utils/response';

// ---- Donor self-service

export async function getMyProfile(req: Request, res: Response) {
  sendData(res, await donorService.getProfile(donorIdOf(req)));
}

export async function updateMyProfile(req: Request, res: Response) {
  sendData(res, await donorService.updateOwnProfile(donorIdOf(req), getBody(req, updateOwnProfileSchema)));
}

export async function updateMyNextOfKin(req: Request, res: Response) {
  sendData(res, await donorService.upsertNextOfKin(donorIdOf(req), getBody(req, nextOfKinSchema)));
}

export async function getMyDashboard(req: Request, res: Response) {
  sendData(res, await donorService.getDashboard(donorIdOf(req)));
}

// ---- Admin

export async function list(req: Request, res: Response) {
  const { items, meta } = await donorService.listDonors(getQuery(req, listDonorsQuery));
  sendPage(res, items, meta);
}

export async function getById(req: Request, res: Response) {
  sendData(res, await donorService.getDonorForAdmin(getParams(req, idParam).id));
}

export async function update(req: Request, res: Response) {
  const { id } = getParams(req, idParam);
  sendData(res, await donorService.adminUpdateDonor(id, getBody(req, adminUpdateDonorSchema)));
}

export async function resetPassword(req: Request, res: Response) {
  const { id } = getParams(req, idParam);
  await donorService.adminResetDonorPassword(id, getBody(req, adminResetPasswordSchema).newPassword);
  sendData(res, { message: 'Password reset' });
}

export async function remove(req: Request, res: Response) {
  await donorService.deleteDonor(getParams(req, idParam).id);
  res.status(204).end();
}
