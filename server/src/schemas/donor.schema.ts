import { z } from 'zod';
import {
  DONOR_STATUSES,
  GENDERS,
  emailSchema,
  optionalText,
  paginationQuery,
  passwordSchema,
  pastDateSchema,
  phoneSchema,
  requiredText,
  searchTerm,
} from './common';

/**
 * Donor self-service profile update. Replaces legacy POST /auth/dupdate, which interpolated a
 * client-supplied column name into SQL. Only these keys are accepted (`.strict()`).
 */
export const updateOwnProfileSchema = z
  .object({
    firstName: requiredText('First name', 60),
    lastName: requiredText('Last name', 60),
    gender: z.enum(GENDERS),
    dateOfBirth: pastDateSchema,
    phone: phoneSchema,
    address: requiredText('Address', 200),
    city: requiredText('City', 80),
    state: requiredText('State', 80),
    personalDoctor: optionalText(120),
    hospitalId: z.string().min(1).max(64).nullable(),
    medicalConditions: optionalText(2000),
  })
  .partial()
  .strict()
  .refine((d) => Object.keys(d).length > 0, 'Provide at least one field to update');

export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileSchema>;

export const nextOfKinSchema = z
  .object({
    name: requiredText('Name', 120),
    phone: phoneSchema,
    relationship: optionalText(60),
  })
  .strict();

export type NextOfKinInput = z.infer<typeof nextOfKinSchema>;

/**
 * Admin donor update. Mirrors the legacy admin form (Email / Ailments / Contact / Password),
 * plus account status. Password resets go through a dedicated endpoint.
 */
export const adminUpdateDonorSchema = z
  .object({
    email: emailSchema,
    phone: phoneSchema,
    medicalConditions: optionalText(2000),
    status: z.enum(DONOR_STATUSES),
  })
  .partial()
  .strict()
  .refine((d) => Object.keys(d).length > 0, 'Provide at least one field to update');

export type AdminUpdateDonorInput = z.infer<typeof adminUpdateDonorSchema>;

export const adminResetPasswordSchema = z
  .object({ newPassword: passwordSchema })
  .strict();

export const listDonorsQuery = paginationQuery
  .extend({
    q: searchTerm,
    status: z.enum(DONOR_STATUSES).optional(),
  })
  .strict();

export type ListDonorsQuery = z.infer<typeof listDonorsQuery>;
