/**
 * Shared types for the security/access-control layer (RBAC + ownership + ABAC). See
 * policies.ts for the actual access-control matrix and policyEngine.ts for how a request is
 * evaluated against it. Nothing in this folder ever grants write access to anything: it only
 * ever answers ALLOW/DENY for a read/action request and records why.
 */

/** The system's four actor roles, including the unauthenticated public. */
export type ActorRole = 'PUBLIC' | 'DONOR' | 'ADMIN' | 'SUPER_ADMIN';

/** Data-classification axis of the ABAC check - see SecurityPolicy.classification in schema.prisma. */
export type DataClassification = 'PUBLIC' | 'PROTECTED' | 'SENSITIVE';

export type AccessDecision = 'ALLOW' | 'DENY';

/** The named resources the policy matrix recognizes. Kept small and explicit, matching the
 * actual resources this application exposes - never a generic/open-ended string. */
export type ResourceName =
  | 'organ-availability'
  | 'hospital-directory'
  | 'public-analytics'
  | 'public-investigation'
  | 'pledge'
  | 'donor-profile'
  | 'donor-medical-info'
  | 'donor-next-of-kin'
  | 'donor-organ'
  | 'donor-withdrawal'
  | 'admin-donor-records'
  | 'admin-organ-records'
  | 'admin-hospital-records'
  | 'admin-withdrawal-queue'
  | 'admin-organ-requests'
  | 'admin-analytics'
  | 'admin-investigation'
  | 'security-admin'
  | 'security-public';

export type ResourceAction = 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'REVIEW' | 'INVESTIGATE';

/** The actor attributes a policy check is evaluated against. `resourceOwnerId` is the id the
 * resource instance belongs to (e.g. a donorId); ownership passes when it equals the actor's
 * own matching id. */
export interface AccessContext {
  role: ActorRole;
  userId?: string;
  /** Set only for a DONOR actor - their own Donor.id. */
  donorId?: string;
  resource: ResourceName;
  action: ResourceAction;
  /** The resource instance's owning id, when the resource is ownership-scoped. Omitted for
   * resources that are not ownership-scoped (e.g. admin-wide or public resources). */
  resourceOwnerId?: string;
  /** Short operator-facing context for the audit row, e.g. "self-service withdrawal submit". */
  context?: string;
  ipAddress?: string;
}

export interface PolicyDefinition {
  /** Stable slug - matches SecurityPolicy.code once seeded, used for traceability in the audit log. */
  code: string;
  role: ActorRole;
  resource: ResourceName;
  action: ResourceAction;
  classification: DataClassification;
  requiresOwnership: boolean;
  decision: AccessDecision;
  description: string;
}

export interface PolicyEvaluation {
  decision: AccessDecision;
  policyCode: string;
  classification: DataClassification;
  roleCheck: { passed: boolean; detail: string };
  ownershipCheck: { applicable: boolean; passed: boolean; detail: string };
  contextualCheck: { passed: boolean; detail: string };
  reason: string;
}
