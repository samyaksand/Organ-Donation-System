import { runInvestigation } from '../agent/agent';
import { AppError } from '../utils/errors';

/**
 * Thin orchestration layer between the controller and the LangGraph agent: maps the agent's
 * own structured failure reasons onto the application's normal AppError/HTTP envelope so the
 * agent endpoint behaves like every other endpoint on 4xx/5xx, rather than inventing a
 * parallel error shape just for this feature.
 */
export async function investigate(question: string | undefined) {
  const outcome = await runInvestigation(question);

  if (!outcome.ok) {
    if (outcome.reason === 'NO_PROVIDER') {
      throw new AppError(
        503,
        'SERVICE_UNAVAILABLE',
        'The Operations Intelligence Agent is not available right now. Please try again later.',
      );
    }
    if (outcome.reason === 'MALFORMED_OUTPUT') {
      throw new AppError(502, 'SERVICE_UNAVAILABLE', 'The agent returned a response that did not match the expected format. Please try again.');
    }
    throw new AppError(502, 'SERVICE_UNAVAILABLE', 'The investigation could not be completed. Please try again.');
  }

  return { ...outcome.result, generatedAt: outcome.generatedAt };
}
