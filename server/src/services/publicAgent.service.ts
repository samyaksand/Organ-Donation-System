import { runPublicInvestigation } from '../agent/agent';
import { PUBLIC_TOOLS } from '../agent/publicTools';
import { screenRequest } from '../security/aiGateway';
import { AppError } from '../utils/errors';

/**
 * Mirrors services/agent.service.ts's error mapping and gateway screening, but always using the
 * restricted PUBLIC_TOOLS set and the PUBLIC actor role - the public surface never has security
 * tools attached and never authorizes AUTHORIZED_SECURITY_ANALYSIS (see security/aiGateway.ts).
 */
export async function investigate(question: string | undefined) {
  const gateway = await screenRequest({
    question,
    actorUserId: null,
    actorRole: 'PUBLIC',
    surface: 'public',
    authorizedTools: PUBLIC_TOOLS.map((t) => t.name),
  });

  if (gateway.decision === 'DENY') {
    return {
      blocked: true as const,
      classification: gateway.classification,
      message: gateway.reason,
    };
  }

  const outcome = await runPublicInvestigation(question, PUBLIC_TOOLS);

  if (!outcome.ok) {
    if (outcome.reason === 'NO_PROVIDER') {
      throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Investigation is temporarily unavailable. Please try again later.');
    }
    throw new AppError(502, 'SERVICE_UNAVAILABLE', 'The investigation could not be completed. Please try again.');
  }

  return { blocked: false as const, ...outcome.result, generatedAt: outcome.generatedAt };
}
