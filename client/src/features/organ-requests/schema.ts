import { z } from 'zod';
import { optionalRule } from '@/lib/forms';

/** Mirrors server/src/schemas/organRequest.schema.ts. */
export const createOrganRequestSchema = z.object({
  hospitalId: z.string({ required_error: 'Select the requesting hospital' }).min(1, 'Select the requesting hospital'),
  organId: z.string({ required_error: 'Select an organ' }).min(1, 'Select an organ'),
  notes: optionalRule(1000),
});
export type CreateOrganRequestValues = z.infer<typeof createOrganRequestSchema>;

export const declineOrganRequestSchema = z.object({
  declineReason: z.string().trim().min(1, 'Provide a reason for declining this request').max(500),
});
export type DeclineOrganRequestValues = z.infer<typeof declineOrganRequestSchema>;
