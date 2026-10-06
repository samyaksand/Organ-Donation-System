/**
 * LangGraph tool definitions for the Operations Intelligence Agent. Each tool is a thin
 * Zod-validated wrapper around exactly one function in agent/tools.service.ts, which in turn
 * calls only the existing deterministic analytics/service layer - never raw SQL, never a
 * database connection string, never an unrestricted query. This file (plus tools.service.ts)
 * is the complete, auditable boundary of what the LLM can read. It can never write.
 *
 * ADMIN_TOOLS is the full set available to this phase's admin-only investigation endpoint.
 * PUBLIC_TOOL_NAMES marks which of these would be safe to expose to a future public agent
 * (Phase 4) - aggregated availability figures only, nothing about requests, withdrawals, or
 * workflow history. No public endpoint exists yet; this is a forward-looking boundary only,
 * enforced by which tools are ever handed to an agent instance, never by LLM prompt wording.
 */
import { tool } from '@langchain/core/tools';
import * as svc from './tools.service';
import {
  comparePeriodsToolInput,
  hospitalPerformanceToolInput,
  pendingRequestsToolInput,
  periodToolInput,
  trendsToolInput,
  workflowHistoryToolInput,
} from '../schemas/agent.schema';
import { z } from 'zod';

const emptyInput = z.object({}).strict();

export const getOverviewMetricsTool = tool(async () => JSON.stringify(await svc.getOverviewMetrics()), {
  name: 'getOverviewMetrics',
  description: 'System-wide KPI snapshot: donor/organ/withdrawal/organ-request status counts and hospital availability counts. No period argument - always current.',
  schema: emptyInput,
});

export const getOrganMetricsTool = tool(async () => JSON.stringify(await svc.getOrganMetrics()), {
  name: 'getOrganMetrics',
  description: 'Organ counts by status (available/pending/unavailable), by organ type, and by hospital. Use this to see WHERE organs are and which types/hospitals have zero availability.',
  schema: emptyInput,
});

export const getOrganAvailabilityConcentrationTool = tool(
  async () => JSON.stringify(await svc.getOrganAvailabilityConcentration()),
  {
    name: 'getOrganAvailabilityConcentration',
    description: 'Share of all currently-available organs held by each hospital, ranked, with the top hospital\'s percentage share called out. Use this to answer "where is availability concentrated".',
    schema: emptyInput,
  },
);

export const getHospitalMetricsTool = tool(async () => JSON.stringify(await svc.getHospitalMetrics()), {
  name: 'getHospitalMetrics',
  description: 'Per-hospital organ availability/activity, plus the list of hospitals with zero currently-available organs. Use this to find WHICH hospitals need attention.',
  schema: emptyInput,
});

export const getHospitalRequestPerformanceTool = tool(
  async (input) => JSON.stringify(await svc.getHospitalRequestPerformance(input)),
  {
    name: 'getHospitalRequestPerformance',
    description: 'Organ-request volume, pending/stale counts, processing time and approval rate for ONE specific hospital (by hospitalId) over a period. Call getHospitalMetrics or getOrganRequestMetrics first to find the hospitalId(s) worth investigating.',
    schema: hospitalPerformanceToolInput,
  },
);

export const getDonorMetricsTool = tool(async (input) => JSON.stringify(await svc.getDonorMetrics(input)), {
  name: 'getDonorMetrics',
  description: 'Aggregated donor statistics for a period: status breakdown, blood-type distribution, registrations vs. the previous period. Aggregated counts only - no donor names or contact/medical detail.',
  schema: periodToolInput,
});

export const getWithdrawalMetricsTool = tool(async (input) => JSON.stringify(await svc.getWithdrawalMetrics(input)), {
  name: 'getWithdrawalMetrics',
  description: 'Withdrawal-request status counts, backlog (stale pending count + threshold), average processing time, and period-over-period volume change.',
  schema: periodToolInput,
});

export const getOrganRequestMetricsTool = tool(async (input) => JSON.stringify(await svc.getOrganRequestMetrics(input)), {
  name: 'getOrganRequestMetrics',
  description: 'Hospital organ-request status counts, backlog, average processing time, approval rate, and per-hospital activity breakdown for a period.',
  schema: periodToolInput,
});

export const getPendingRequestsTool = tool(async (input) => JSON.stringify(await svc.getPendingRequests(input)), {
  name: 'getPendingRequests',
  description: 'Lists individual pending/stale organ-request or withdrawal-request records (id, status, hospital or donor code, age in days) for closer investigation - e.g. to name the specific oldest requests in a finding. Never returns donor names or medical detail.',
  schema: pendingRequestsToolInput,
});

export const getTrendsTool = tool(async (input) => JSON.stringify(await svc.getTrends(input)), {
  name: 'getTrends',
  description: 'Deterministic historical trend for one metric (donorRegistrations, organRegistrations, withdrawalRequests, or organRequests), bucketed by day/week/month over a period.',
  schema: trendsToolInput,
});

export const comparePeriodsTool = tool(async (input) => JSON.stringify(await svc.comparePeriods(input)), {
  name: 'comparePeriods',
  description: 'Current vs. previous comparable period for one metric (donorRegistrations, organRequestVolume, or withdrawalVolume): current value, previous value, and percentage change (null when mathematically undefined). Use this to answer "how has X changed".',
  schema: comparePeriodsToolInput,
});

export const getThresholdBreachesTool = tool(async (input) => JSON.stringify(await svc.getThresholdBreaches(input)), {
  name: 'getThresholdBreaches',
  description: 'The deterministic operational bottleneck rules OrganFlow already defines (stale backlogs, zero-availability hospitals/organ-types, concentrated availability) for a period. Call this first for broad "what are the biggest issues" questions, then investigate further with the more specific tools.',
  schema: periodToolInput,
});

export const getWorkflowHistoryTool = tool(async (input) => JSON.stringify(await svc.getWorkflowHistoryTool(input)), {
  name: 'getWorkflowHistory',
  description: 'The recorded CREATED/STATUS_CHANGED event history for one specific entity (by entityType and entityId) - e.g. to see exactly when a particular stale request was created and whether it has had any status change since.',
  schema: workflowHistoryToolInput,
});

/** The full admin investigation toolset. */
export const ADMIN_TOOLS = [
  getOverviewMetricsTool,
  getOrganMetricsTool,
  getOrganAvailabilityConcentrationTool,
  getHospitalMetricsTool,
  getHospitalRequestPerformanceTool,
  getDonorMetricsTool,
  getWithdrawalMetricsTool,
  getOrganRequestMetricsTool,
  getPendingRequestsTool,
  getTrendsTool,
  comparePeriodsTool,
  getThresholdBreachesTool,
  getWorkflowHistoryTool,
];

/**
 * Forward-looking only (see file header): names of tools that would be safe for a future
 * public, unauthenticated agent - aggregated availability figures with no request/withdrawal/
 * workflow detail. Not wired to any route in this phase.
 */
export const PUBLIC_TOOL_NAMES = new Set(['getOrganMetrics', 'getHospitalMetrics', 'getTrends']);
