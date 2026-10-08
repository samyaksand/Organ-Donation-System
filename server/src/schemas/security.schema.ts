import { z } from 'zod';

/** POST /api/v1/public/security/explore body - drives the public Policy Explorer's
 * Actor -> Resource -> Action -> Context -> Evaluate flow. Stateless: no SecurityEvent is
 * written for a visitor's what-if exploration (see security/policyEngine.ts's evaluateAccess). */
export const explorePolicySchema = z
  .object({
    role: z.enum(['PUBLIC', 'DONOR', 'ADMIN', 'SUPER_ADMIN']),
    resource: z.enum([
      'organ-availability',
      'hospital-directory',
      'public-analytics',
      'public-investigation',
      'pledge',
      'donor-profile',
      'donor-medical-info',
      'donor-next-of-kin',
      'donor-organ',
      'donor-withdrawal',
      'admin-donor-records',
      'admin-organ-records',
      'admin-hospital-records',
      'admin-withdrawal-queue',
      'admin-organ-requests',
      'admin-analytics',
      'admin-investigation',
      'security-admin',
      'security-public',
    ]),
    action: z.enum(['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'REVIEW', 'INVESTIGATE']),
    /** "own" simulates the actor requesting their own resource instance; "other" simulates a
     * cross-user request. Ignored for resources that are not ownership-scoped. */
    ownership: z.enum(['own', 'other']).default('own'),
  })
  .strict();
export type ExplorePolicyInput = z.infer<typeof explorePolicySchema>;
