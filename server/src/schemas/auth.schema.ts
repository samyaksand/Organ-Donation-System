import { z } from 'zod';
import {
  GENDERS,
  emailSchema,
  optionalText,
  passwordSchema,
  pastDateSchema,
  phoneSchema,
  requiredText,
} from './common';

export const registerSchema = z
  .object({
    // Account
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    // Personal
    firstName: requiredText('First name', 60),
    lastName: requiredText('Last name', 60),
    gender: z.enum(GENDERS),
    dateOfBirth: pastDateSchema,
    phone: phoneSchema,
    address: requiredText('Address', 200),
    city: requiredText('City', 80),
    state: requiredText('State', 80),
    // Medical / care
    personalDoctor: optionalText(120),
    hospitalId: z.string().min(1).max(64).nullish(),
    medicalConditions: optionalText(2000),
    // Next of kin (legacy nextofkin table — required at signup, as before)
    nextOfKin: z
      .object({
        name: requiredText('Next of kin name', 120),
        phone: phoneSchema,
        relationship: optionalText(60),
      })
      .strict(),
  })
  .strict()
  .refine((d) => d.password === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required').max(200),
    /** Which portal the user signed in from; a mismatch is reported as invalid credentials. */
    portal: z.enum(['DONOR', 'ADMIN']).optional(),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required').max(200),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .strict()
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    path: ['newPassword'],
    message: 'New password must be different from the current one',
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
