import type { Request, Response } from 'express';
import { getBody, getParams } from '../middleware/validate';
import { createPledgeSchema, pledgeReferenceParam } from '../schemas/pledge.schema';
import { certificateStorage } from '../services/certificateStorage';
import * as pledgeService from '../services/pledge.service';
import { sendData } from '../utils/response';

export async function create(req: Request, res: Response) {
  sendData(res, await pledgeService.create(getBody(req, createPledgeSchema)), 201);
}

export async function getCertificate(req: Request, res: Response) {
  const { referenceId } = getParams(req, pledgeReferenceParam);
  const pledge = await pledgeService.getByReferenceId(referenceId);
  certificateStorage.streamToResponse(
    {
      referenceId: pledge.referenceId,
      fullName: pledge.fullName,
      city: pledge.city,
      organPreference: pledge.organPreference,
      pledgeDate: new Date(pledge.createdAt),
    },
    res,
  );
}
