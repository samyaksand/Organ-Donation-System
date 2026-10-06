import { z } from 'zod';
import { ORGAN_TYPES, emailSchema, requiredText } from './common';

/**
 * Public "intent to donate" pledge. Deliberately minimal - see prisma/schema.prisma's Pledge
 * doc comment for why this is never a Donor record: no medical history, no next-of-kin, no
 * government ID, no detailed address. `consent` must be explicitly true; it is not stored as a
 * boolean on the row (storing it would imply we might record a non-consenting pledge) - it's
 * recorded as `consentedAt` (the moment consent was given), set server-side to "now".
 */
export const createPledgeSchema = z
  .object({
    fullName: requiredText('Full name', 120),
    email: emailSchema,
    city: requiredText('City', 100),
    organPreference: z.enum(ORGAN_TYPES),
    consent: z.literal(true, { errorMap: () => ({ message: 'Consent is required to submit a pledge' }) }),
  })
  .strict();
export type CreatePledgeInput = z.infer<typeof createPledgeSchema>;

export const pledgeReferenceParam = z
  .object({
    referenceId: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^PLG-[A-Z0-9]{8}$/, 'Enter a valid pledge reference ID'),
  })
  .strict();
export type PledgeReferenceParam = z.infer<typeof pledgeReferenceParam>;
