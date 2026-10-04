import { z } from 'zod';
import { WITHDRAWAL_STATUSES, optionalText, paginationQuery, searchTerm } from './common';

/** Legacy POST /auth/withdraw (deletionreason table). */
export const createWithdrawalSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(10, 'Please give a short reason (at least 10 characters)')
      .max(1000, 'Reason must be at most 1000 characters'),
  })
  .strict();
export type CreateWithdrawalInput = z.infer<typeof createWithdrawalSchema>;

export const reviewWithdrawalSchema = z
  .object({
    status: z.enum(['APPROVED', 'REJECTED']),
    adminNote: optionalText(1000),
  })
  .strict();
export type ReviewWithdrawalInput = z.infer<typeof reviewWithdrawalSchema>;

export const listWithdrawalsQuery = paginationQuery
  .extend({
    q: searchTerm,
    status: z.enum(WITHDRAWAL_STATUSES).optional(),
  })
  .strict();
export type ListWithdrawalsQuery = z.infer<typeof listWithdrawalsQuery>;
