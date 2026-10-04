import { z } from 'zod';
import { ORGAN_STATUSES, ORGAN_TYPES, dateOnlySchema, optionalText, paginationQuery, searchTerm } from './common';

const organCore = z.object({
  organType: z.enum(ORGAN_TYPES),
  otherOrganName: optionalText(80),
  hospitalId: z.string().min(1, 'Select a hospital').max(64),
  procurementDate: dateOnlySchema,
  notes: optionalText(1000),
});

function requireOtherName<T extends { organType?: string; otherOrganName?: string | null }>(d: T) {
  return d.organType !== 'OTHER' || Boolean(d.otherOrganName);
}
const otherNameIssue = { path: ['otherOrganName'], message: 'Describe the organ or tissue' };

/** Donor registers one of their own organs (starts PENDING until an admin verifies it). */
export const donorCreateOrganSchema = organCore.strict().refine(requireOtherName, otherNameIssue);
export type DonorCreateOrganInput = z.infer<typeof donorCreateOrganSchema>;

/** Admin adds an organ for a donor by Donor ID (legacy POST /auth/addorgan). */
export const adminCreateOrganSchema = organCore
  .extend({
    donorCode: z.string().trim().toUpperCase().min(3, 'Enter the Donor ID').max(20),
    status: z.enum(ORGAN_STATUSES).default('AVAILABLE'),
  })
  .strict()
  .refine(requireOtherName, otherNameIssue);
export type AdminCreateOrganInput = z.infer<typeof adminCreateOrganSchema>;

export const adminUpdateOrganSchema = organCore
  .extend({ status: z.enum(ORGAN_STATUSES) })
  .partial()
  .strict()
  .refine((d) => Object.keys(d).length > 0, 'Provide at least one field to update')
  .refine((d) => d.organType === undefined || requireOtherName(d), otherNameIssue);
export type AdminUpdateOrganInput = z.infer<typeof adminUpdateOrganSchema>;

/** Public availability search (legacy POST /auth/organavail: organ + city). */
export const publicOrganSearchQuery = paginationQuery
  .extend({
    organType: z.enum(ORGAN_TYPES).optional(),
    city: searchTerm,
    hospitalId: z.string().min(1).max(64).optional(),
    availability: z.enum(['AVAILABLE', 'UNAVAILABLE', 'ALL']).default('AVAILABLE'),
  })
  .strict();
export type PublicOrganSearchQuery = z.infer<typeof publicOrganSearchQuery>;

export const adminListOrgansQuery = paginationQuery
  .extend({
    q: searchTerm,
    organType: z.enum(ORGAN_TYPES).optional(),
    status: z.enum(ORGAN_STATUSES).optional(),
    hospitalId: z.string().min(1).max(64).optional(),
  })
  .strict();
export type AdminListOrgansQuery = z.infer<typeof adminListOrgansQuery>;
