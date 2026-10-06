import { runPublicInvestigation } from '../agent/agent';
import { PUBLIC_TOOLS } from '../agent/publicTools';
import { AppError } from '../utils/errors';

/** Mirrors services/agent.service.ts's error mapping, but always using the restricted PUBLIC_TOOLS set. */
export async function investigate(question: string | undefined) {
  const outcome = await runPublicInvestigation(question, PUBLIC_TOOLS);

  if (!outcome.ok) {
    if (outcome.reason === 'NO_PROVIDER') {
      throw new AppError(503, 'SERVICE_UNAVAILABLE', 'Investigation is temporarily unavailable. Please try again later.');
    }
    throw new AppError(502, 'SERVICE_UNAVAILABLE', 'The investigation could not be completed. Please try again.');
  }

  return { ...outcome.result, generatedAt: outcome.generatedAt };
}
