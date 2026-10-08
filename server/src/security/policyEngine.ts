/**
 * The policy engine: evaluates ROLE + RESOURCE + ACTION + OWNERSHIP + CONTEXT against the
 * access-control matrix in policies.ts and returns a POLICY -> ALLOW/DENY decision, with a
 * full explanation (role check, ownership check, contextual/sensitivity check, reason). This is
 * the ONE place a security decision is made - route middleware, controllers, and the AI
 * Security Gateway all call `evaluateAccess`/`authorize` here rather than hard-coding a check
 * inline, so the policy matrix and its audit trail stay centralized and consistent.
 *
 * Every evaluation is recorded as a SecurityEvent (see recordSecurityEvent) with safe metadata
 * only - actor id/role, resource/action, decision, policy code, reason. It never stores medical
 * data, credentials, secrets, or a raw request body.
 */
import { prisma } from '../lib/prisma';
import { ALL_POLICIES } from './policies';
import type { AccessContext, AccessDecision, DataClassification, PolicyDefinition, PolicyEvaluation } from './types';

/**
 * Finds the most specific matching policy for a role/resource/action. When a resource is
 * ownership-scoped, both the ALLOW-when-own and DENY-when-not-own rows share the same
 * role/resource/action, so the actual ownership match (computed from `ctx`, not from the
 * policy row) decides which one applies.
 */
function findPolicy(ctx: AccessContext): PolicyDefinition | undefined {
  const candidates = ALL_POLICIES.filter((p) => p.role === ctx.role && p.resource === ctx.resource && p.action === ctx.action);
  if (candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0];

  // Ownership-scoped resource: pick the ALLOW row when the actor owns the instance, the DENY
  // row otherwise. Computed here (not stored) because ownership depends on the live request,
  // not on the static policy table.
  const owns = Boolean(ctx.donorId && ctx.resourceOwnerId && ctx.donorId === ctx.resourceOwnerId);
  const ownRow = candidates.find((p) => p.requiresOwnership && p.decision === 'ALLOW');
  const denyRow = candidates.find((p) => p.requiresOwnership && p.decision === 'DENY');
  if (ownRow && denyRow) return owns ? ownRow : denyRow;
  return candidates[0];
}

/**
 * Evaluates one access request against the policy matrix. Pure and synchronous - does not
 * write an audit event itself (see `authorize` below for the version that does).
 */
export function evaluateAccess(ctx: AccessContext): PolicyEvaluation {
  const policy = findPolicy(ctx);

  if (!policy) {
    // No policy names this role/resource/action combination at all: fail closed. An
    // unrecognized combination is a configuration gap, never an implicit ALLOW.
    return {
      decision: 'DENY',
      policyCode: 'no-matching-policy',
      classification: 'SENSITIVE',
      roleCheck: { passed: false, detail: `No policy defines ${ctx.role} -> ${ctx.resource} -> ${ctx.action}.` },
      ownershipCheck: { applicable: false, passed: false, detail: 'Not evaluated - no matching policy.' },
      contextualCheck: { passed: false, detail: 'Not evaluated - no matching policy.' },
      reason: 'Denied by default: no access policy exists for this role, resource and action.',
    };
  }

  const roleCheck = { passed: policy.role === ctx.role, detail: `Role ${ctx.role} ${policy.role === ctx.role ? 'matches' : 'does not match'} policy role ${policy.role}.` };

  let ownershipCheck: PolicyEvaluation['ownershipCheck'];
  if (!policy.requiresOwnership) {
    ownershipCheck = { applicable: false, passed: true, detail: 'This resource is not ownership-scoped.' };
  } else {
    const owns = Boolean(ctx.donorId && ctx.resourceOwnerId && ctx.donorId === ctx.resourceOwnerId);
    ownershipCheck = {
      applicable: true,
      passed: owns,
      detail: owns
        ? 'The actor owns the requested resource instance.'
        : 'The actor does not own the requested resource instance (or no resource instance was specified).',
    };
  }

  const contextualCheck = {
    passed: policy.decision === 'ALLOW',
    detail: `Data classification is ${policy.classification}. Policy "${policy.code}" resolves to ${policy.decision} for this classification and role/ownership combination.`,
  };

  return {
    decision: policy.decision,
    policyCode: policy.code,
    classification: policy.classification,
    roleCheck,
    ownershipCheck,
    contextualCheck,
    reason: policy.description,
  };
}

/**
 * Evaluates access AND records the decision as a SecurityEvent (fire-and-forget: a logging
 * failure never blocks or changes the access decision itself). Use this from middleware/
 * controllers/the AI gateway; use the pure `evaluateAccess` only for the stateless Policy
 * Explorer, which must never write an audit row for a visitor's what-if exploration.
 */
export async function authorize(ctx: AccessContext): Promise<PolicyEvaluation> {
  const evaluation = evaluateAccess(ctx);
  void recordSecurityEvent(ctx, evaluation).catch((err) => {
    console.error('[security] failed to record SecurityEvent:', err instanceof Error ? err.message : err);
  });
  return evaluation;
}

async function recordSecurityEvent(ctx: AccessContext, evaluation: PolicyEvaluation): Promise<void> {
  await prisma.securityEvent.create({
    data: {
      actorUserId: ctx.userId ?? null,
      actorRole: ctx.role,
      resource: ctx.resource,
      action: ctx.action,
      classification: evaluation.classification,
      decision: evaluation.decision,
      policyCode: evaluation.policyCode,
      reason: evaluation.reason,
      resourceId: ctx.resourceOwnerId ?? null,
      ipAddress: ctx.ipAddress ?? null,
    },
  });
}

export type { AccessContext, AccessDecision, DataClassification, PolicyEvaluation };
