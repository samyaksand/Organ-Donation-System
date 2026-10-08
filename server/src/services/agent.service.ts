import type { Role } from '@prisma/client';
import { runInvestigation } from '../agent/agent';
import { ADMIN_TOOLS } from '../agent/tools';
import { SECURITY_TOOLS } from '../agent/securityTools';
import { screenRequest } from '../security/aiGateway';
import { AppError } from '../utils/errors';

export interface InvestigateActor {
  userId: string;
  role: Role;
}

function isAdminRole(role: Role): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

/**
 * Thin orchestration layer between the controller and the LangGraph agent: maps the agent's
 * own structured failure reasons onto the application's normal AppError/HTTP envelope so the
 * agent endpoint behaves like every other endpoint on 4xx/5xx, rather than inventing a
 * parallel error shape just for this feature.
 *
 * Every call is screened by the AI Security Gateway BEFORE runInvestigation (and therefore
 * before any LangGraph/provider call) is reached. A BLOCK decision returns a safe explanation
 * without ever constructing an agent or calling a provider - see security/aiGateway.ts.
 */
export async function investigate(question: string | undefined, actor: InvestigateActor) {
  const securityEligible = isAdminRole(actor.role);
  const authorizedToolNames = [...ADMIN_TOOLS.map((t) => t.name), ...(securityEligible ? SECURITY_TOOLS.map((t) => t.name) : [])];

  const gateway = await screenRequest({
    question,
    actorUserId: actor.userId,
    actorRole: actor.role,
    surface: 'admin',
    authorizedTools: authorizedToolNames,
  });

  if (gateway.decision === 'DENY') {
    return {
      blocked: true as const,
      classification: gateway.classification,
      message: gateway.reason,
    };
  }

  const useSecurityTools = gateway.classification === 'AUTHORIZED_SECURITY_ANALYSIS';
  const outcome = await runInvestigation(question, useSecurityTools ? SECURITY_TOOLS : []);

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

  return { blocked: false as const, ...outcome.result, generatedAt: outcome.generatedAt };
}
