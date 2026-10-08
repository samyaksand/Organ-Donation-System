/**
 * Read-only security-analysis tools for the admin Operations Intelligence Agent. Every tool is
 * a thin Zod-validated wrapper around exactly one services/security.service.ts function, which
 * itself only ever reads SecurityEvent/AiSecurityEvent via Prisma groupBy/aggregate - never raw
 * SQL, never a write. These tools are ONLY ever added to an agent instance when the AI Security
 * Gateway has classified the request as AUTHORIZED_SECURITY_ANALYSIS for an authenticated
 * ADMIN/SUPER_ADMIN actor (see agent/agent.ts's `runInvestigation` and security/aiGateway.ts);
 * they are never present in the public toolset.
 *
 * The AI may analyze/explain/summarize these metrics. It can never change a policy, grant or
 * revoke access, or modify any record - see this folder's and agent/tools.ts's header comments
 * for the full read-only boundary.
 */
import { tool } from '@langchain/core/tools';
import * as securitySvc from '../services/security.service';
import { securityEventListToolInput, securityPeriodToolInput } from '../schemas/agent.schema';

export const getSecurityOverviewTool = tool(async (input) => JSON.stringify(await securitySvc.getSecurityOverview(input)), {
  name: 'getSecurityOverview',
  description: 'Overall access-control activity for a period: total decisions, allow/deny counts, period-over-period change, and AI request screening totals.',
  schema: securityPeriodToolInput,
});

export const getAccessDecisionMetricsTool = tool(async (input) => JSON.stringify(await securitySvc.getAccessDecisionMetrics(input)), {
  name: 'getAccessDecisionMetrics',
  description: 'Access decisions broken down by actor role and by resource, for a period. Use this to see WHICH roles or resources have the most denials.',
  schema: securityPeriodToolInput,
});

export const getDeniedAccessEventsTool = tool(async (input) => JSON.stringify(await securitySvc.getDeniedAccessEvents(input)), {
  name: 'getDeniedAccessEvents',
  description: 'Individual recent DENY decisions (role, resource, action, policy, reason) for a period, for closer investigation of specific denials.',
  schema: securityEventListToolInput,
});

export const getPolicyViolationsTool = tool(async (input) => JSON.stringify(await securitySvc.getPolicyViolations(input)), {
  name: 'getPolicyViolations',
  description: 'Denied access attempts grouped by which policy produced the denial, ranked by count. Use this to find repeated/systematic access-control violations.',
  schema: securityPeriodToolInput,
});

export const getSecurityTrendsTool = tool(async (input) => JSON.stringify(await securitySvc.getSecurityTrends(input)), {
  name: 'getSecurityTrends',
  description: 'Daily allow/deny counts over a period, for spotting a spike or trend in access-control activity.',
  schema: securityPeriodToolInput,
});

export const getSecurityEventHistoryTool = tool(async (input) => JSON.stringify(await securitySvc.getSecurityEventHistory(input)), {
  name: 'getSecurityEventHistory',
  description: 'Recent access-control decisions (both ALLOW and DENY) for a period, most recent first.',
  schema: securityEventListToolInput,
});

export const getAiSecurityEventsTool = tool(async (input) => JSON.stringify(await securitySvc.getAiSecurityEvents(input)), {
  name: 'getAiSecurityEvents',
  description: 'Recent AI Security Gateway decisions (blocked and allowed investigation requests), with classification and reason - never the full original prompt.',
  schema: securityEventListToolInput,
});

/** The complete set of security-analysis tools, added to the admin agent only when the AI
 * Security Gateway authorizes a security-analysis investigation. */
export const SECURITY_TOOLS = [
  getSecurityOverviewTool,
  getAccessDecisionMetricsTool,
  getDeniedAccessEventsTool,
  getPolicyViolationsTool,
  getSecurityTrendsTool,
  getSecurityEventHistoryTool,
  getAiSecurityEventsTool,
];
