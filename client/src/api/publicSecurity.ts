import type { ExplorePolicyParams, PolicyEvaluation, SecurityPolicyDefinition } from '@/types/api';
import { api } from './client';

/** Public, unauthenticated Policy Explorer + Data Classification Explorer. `explore` calls the
 * SAME server-side policy engine every real request goes through (server/src/security/
 * policyEngine.ts) - the decision shown is real, not a hard-coded frontend table. */
export const publicSecurityApi = {
  explore: (input: ExplorePolicyParams) => api.post<PolicyEvaluation>('/public/security/explore', input),
  matrix: () => api.get<SecurityPolicyDefinition[]>('/public/security/matrix'),
};
