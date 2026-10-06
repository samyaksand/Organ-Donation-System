import { z } from 'zod';
import { ORGAN_REQUEST_STATUSES, optionalText, paginationQuery, searchTerm } from './common';

/** Admin records a hospital's request for a specific, currently AVAILABLE organ. */
export const createOrganRequestSchema = z
  .object({
    organId: z.string().min(1, 'Select an organ').max(64),
    hospitalId: z.string().min(1, 'Select the requesting hospital').max(64),
    notes: optionalText(1000),
  })
  .strict();
export type CreateOrganRequestInput = z.infer<typeof createOrganRequestSchema>;

/** Approve or decline a pending request. A decline reason is required when declining. */
export const reviewOrganRequestSchema = z
  .object({
    status: z.enum(['APPROVED', 'DECLINED']),
    declineReason: optionalText(500),
  })
  .strict()
  .refine((d) => d.status !== 'DECLINED' || Boolean(d.declineReason), {
    path: ['declineReason'],
    message: 'Provide a reason for declining this request',
  });
export type ReviewOrganRequestInput = z.infer<typeof reviewOrganRequestSchema>;

export const listOrganRequestsQuery = paginationQuery
  .extend({
    q: searchTerm,
    status: z.enum(ORGAN_REQUEST_STATUSES).optional(),
    hospitalId: z.string().min(1).max(64).optional(),
  })
  .strict();
export type ListOrganRequestsQuery = z.infer<typeof listOrganRequestsQuery>;
