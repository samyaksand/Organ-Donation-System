import { z } from 'zod';
import { dateRule, optionalRule } from '@/lib/forms';
import { ORGAN_STATUSES, ORGAN_TYPES } from '@/types/api';

/** Client rules for organ forms (mirror server/src/schemas/organ.schema.ts). */
export const organFieldsSchema = z.object({
  organType: z.enum(ORGAN_TYPES, { errorMap: () => ({ message: 'Select an organ type' }) }),
  otherOrganName: optionalRule(80),
  hospitalId: z.string({ required_error: 'Select a hospital' }).min(1, 'Select a hospital'),
  procurementDate: dateRule('Procurement date'),
  notes: optionalRule(1000),
});

export const requireOtherName = (d: { organType?: string; otherOrganName?: string }) =>
  d.organType !== 'OTHER' || Boolean(d.otherOrganName?.trim());

export const otherNameIssue = { path: ['otherOrganName'], message: 'Describe the organ or tissue' };

export const donorOrganSchema = organFieldsSchema.refine(requireOtherName, otherNameIssue);
export type DonorOrganValues = z.infer<typeof donorOrganSchema>;

export const adminOrganSchema = organFieldsSchema
  .extend({
    donorCode: z.string().trim().min(3, 'Enter the Donor ID').max(20),
    status: z.enum(ORGAN_STATUSES),
  })
  .refine(requireOtherName, otherNameIssue);
export type AdminOrganValues = z.infer<typeof adminOrganSchema>;
