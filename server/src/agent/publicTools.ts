/**
 * The PUBLIC Operations Intelligence toolset - a completely separate, smaller tool list from
 * agent/tools.ts's ADMIN_TOOLS. This is the backend enforcement of the public/admin boundary:
 * the public investigation endpoint (controllers/publicAgent.controller.ts) is built with
 * ONLY this array, so there is no code path by which a public request can reach
 * getPendingRequests, getWorkflowHistory, getHospitalRequestPerformance, getDonorMetrics,
 * getWithdrawalMetrics, or getOrganRequestMetrics - the admin-only tools that touch individual
 * records or workflow/administrative detail. This is enforced by which tools are ever
 * constructed into an agent instance, not by LLM prompt wording (see agent/agent.ts's
 * PUBLIC_SYSTEM_PROMPT for the prompt-level reinforcement, which is a second layer, not the
 * only one).
 *
 * Every tool here calls analytics.service.ts directly (the same deterministic functions the
 * admin tools and the admin/public Analytics APIs already use) - no parallel calculation, and
 * nothing here ever touches a donor/withdrawal/organ-request row's individual fields.
 */
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import * as analytics from '../services/analytics.service';
import { periodToolInput } from '../schemas/agent.schema';

const emptyInput = z.object({}).strict();

export const getPublicOrganAvailabilityTool = tool(
  async () => {
    const data = await analytics.getOrganAnalytics();
    // Only status/type/hospital-name availability counts - no donor, no procurement detail.
    return JSON.stringify({ byStatus: data.byStatus, byOrganType: data.byOrganType, byHospital: data.byHospital });
  },
  {
    name: 'getPublicOrganAvailability',
    description: 'Organ availability counts: overall status totals, availability by organ type, and availability by hospital. Use this for "which organ types/hospitals have availability" questions.',
    schema: emptyInput,
  },
);

export const getPublicHospitalAvailabilityTool = tool(
  async () => {
    const data = await analytics.getHospitalAnalytics();
    return JSON.stringify({
      total: data.total,
      withAvailability: data.withAvailability,
      zeroAvailability: data.zeroAvailability,
      zeroAvailabilityHospitals: data.zeroAvailabilityHospitals,
      hospitals: data.hospitals.map((h) => ({ id: h.id, name: h.name, city: h.city, available: h.available, totalOrgans: h.totalOrgans })),
    });
  },
  {
    name: 'getPublicHospitalAvailability',
    description: 'Per-hospital organ availability and the list of hospitals with zero currently-available organs. Use this for "which hospitals have availability" or "which hospitals need attention" questions.',
    schema: emptyInput,
  },
);

export const getPublicConcentrationTool = tool(
  async () => JSON.stringify(await analytics.getOrganAvailabilityConcentration()),
  {
    name: 'getPublicConcentration',
    description: 'Share of all currently-available organs held by each hospital, ranked, with the top hospital\'s percentage share. Use this for "where is availability concentrated" questions.',
    schema: emptyInput,
  },
);

export const getPublicTrendsTool = tool(
  async (input) => {
    const trends = await analytics.getTrends(input);
    // Public trend is organ registrations only - donor/withdrawal/organ-request trends stay admin-only.
    return JSON.stringify({ window: trends.window, organRegistrations: trends.organRegistrations });
  },
  {
    name: 'getPublicTrends',
    description: 'Organ-registration trend over a period, bucketed by day/week/month. Use this for "what changed recently" or "how has availability trended" questions.',
    schema: periodToolInput,
  },
);

/**
 * The complete public toolset. Deliberately small and aggregate-only - see file header. Do not
 * add a tool here that returns an individual record, a donor-identifying field, or any
 * withdrawal/organ-request/workflow detail.
 */
export const PUBLIC_TOOLS = [
  getPublicOrganAvailabilityTool,
  getPublicHospitalAvailabilityTool,
  getPublicConcentrationTool,
  getPublicTrendsTool,
];
