import type { Request, Response } from 'express';
import { getBody } from '../middleware/validate';
import { explorePolicySchema } from '../schemas/security.schema';
import { evaluateAccess } from '../security/policyEngine';
import { ALL_POLICIES } from '../security/policies';
import { sendData } from '../utils/response';

/**
 * Stateless policy evaluation for the public Policy Explorer - calls the SAME evaluateAccess
 * function the real middleware uses (security/policyEngine.ts), so a visitor sees the actual
 * server-side decision, never a hard-coded frontend answer. Does not write a SecurityEvent:
 * this is a what-if exploration, not a real access attempt (see policyEngine.ts's doc comment).
 */
export async function explore(req: Request, res: Response) {
  const input = getBody(req, explorePolicySchema);
  const resourceOwnerId = input.ownership === 'own' ? 'self' : 'someone-else';
  const donorId = input.role === 'DONOR' ? 'self' : undefined;

  const evaluation = evaluateAccess({
    role: input.role,
    donorId,
    resource: input.resource,
    action: input.action,
    resourceOwnerId,
  });

  sendData(res, evaluation);
}

/** The full access-control matrix, for the Policy Explorer's reference listing. Read-only,
 * identical to what prisma/seed.ts copies into SecurityPolicy - served straight from the code
 * source of truth so it can never drift from what evaluateAccess actually enforces. */
export async function matrix(_req: Request, res: Response) {
  sendData(res, ALL_POLICIES);
}
