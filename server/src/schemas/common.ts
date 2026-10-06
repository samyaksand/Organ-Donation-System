import { z } from 'zod';
import { todayDateOnly } from '../utils/dates';

export const ORGAN_TYPES = ['KIDNEY', 'LIVER', 'HEART', 'LUNG', 'PANCREAS', 'CORNEA', 'OTHER'] as const;
export const ORGAN_STATUSES = ['PENDING', 'AVAILABLE', 'UNAVAILABLE'] as const;
export const WITHDRAWAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export const ORGAN_REQUEST_STATUSES = ['PENDING', 'APPROVED', 'DECLINED', 'CANCELLED'] as const;
export const DONOR_STATUSES = ['PENDING', 'ACTIVE', 'WITHDRAWN'] as const;
export const GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;
export const BLOOD_TYPES = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'] as const;

export const idParam = z.object({ id: z.string().min(1).max(64) }).strict();

const trimmed = (max: number) => z.string().trim().max(max, `Must be at most ${max} characters`);

export const requiredText = (label: string, max = 120) => trimmed(max).min(1, `${label} is required`);

/** Optional free text: empty strings become null so they clear the column. */
export const optionalText = (max = 500) =>
  trimmed(max)
    .nullish()
    .transform((v) => (v === undefined ? undefined : v === null || v === '' ? null : v));

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s\-()]{6,19}$/, 'Enter a valid phone number');

// bcrypt only uses the first 72 bytes, so cap the length.
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), 'Enter a valid date');

export const pastDateSchema = dateOnlySchema
  .refine((v) => v < todayDateOnly(), 'Date must be in the past')
  .refine((v) => v > '1900-01-01', 'Enter a realistic date');

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const searchTerm = z.string().trim().max(100).optional().transform((v) => (v ? v : undefined));
