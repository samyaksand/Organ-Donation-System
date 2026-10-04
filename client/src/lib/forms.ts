import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { ApiError, errorMessage } from '@/api/client';

/**
 * Maps server-side field errors (`error.details.fields`) onto React Hook Form fields so
 * server validation shows inline exactly like client validation. Falls back to a toast.
 */
export function handleFormError<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, fallbackTitle = 'Could not save') {
  if (error instanceof ApiError && error.fields.length > 0) {
    let first = true;
    for (const field of error.fields) {
      setError(field.path as Path<T>, { type: 'server', message: field.message }, { shouldFocus: first });
      first = false;
    }
    toast.error(error.message);
    return;
  }
  toast.error(fallbackTitle, { description: errorMessage(error) });
}

// ---------------------------------------------------------------- Shared client-side rules
// Mirror server/src/schemas/common.ts so users get the same messages before submitting.

export const phoneRule = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s\-()]{6,19}$/, 'Enter a valid phone number');

export const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const requiredRule = (label: string, max = 120) =>
  z.string().trim().min(1, `${label} is required`).max(max, `Must be at most ${max} characters`);

export const optionalRule = (max = 500) => z.string().trim().max(max, `Must be at most ${max} characters`);

export const emailRule = z.string().trim().min(1, 'Email is required').email('Enter a valid email address');

export const dateRule = (label: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${label} is required`);

/** Converts '' to null for optional API fields. */
export function nullIfEmpty(value: string | undefined | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
