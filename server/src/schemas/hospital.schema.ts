import { z } from 'zod';
import { emailSchema, optionalText, paginationQuery, phoneSchema, requiredText, searchTerm } from './common';

export const hospitalSchema = z
  .object({
    name: requiredText('Hospital name', 160),
    city: requiredText('City', 80),
    state: optionalText(80),
    address: requiredText('Address', 250),
    phone: phoneSchema,
    email: emailSchema.nullish().or(z.literal('').transform(() => null)),
  })
  .strict();
export type HospitalInput = z.infer<typeof hospitalSchema>;

export const updateHospitalSchema = hospitalSchema
  .partial()
  .strict()
  .refine((d) => Object.keys(d).length > 0, 'Provide at least one field to update');
export type UpdateHospitalInput = z.infer<typeof updateHospitalSchema>;

export const listHospitalsQuery = paginationQuery
  .extend({
    q: searchTerm,
    city: searchTerm,
    pageSize: z.coerce.number().int().min(1).max(100).default(12),
  })
  .strict();
export type ListHospitalsQuery = z.infer<typeof listHospitalsQuery>;
