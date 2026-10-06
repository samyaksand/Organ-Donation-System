/**
 * Read-only data-gathering functions backing the Operations Intelligence Agent's tools
 * (see agent/tools.ts). Every function here either calls an existing analytics/service
 * function directly or adds a thin, deterministic transformation on top of one - none of them
 * run arbitrary SQL, accept raw queries, or hold database credentials themselves (that stays in
 * server/src/lib/prisma.ts, never passed to or reachable from the LLM). This file is the
 * complete surface the agent can touch; nothing here can write to the database.
 */
import { prisma } from '../lib/prisma';
import * as analytics from '../services/analytics.service';
import * as organRequestService from '../services/organRequest.service';
import * as withdrawalService from '../services/withdrawal.service';
import { getWorkflowHistory } from '../services/workflowEvent.service';
import type {
  ComparePeriodsToolInput,
  HospitalPerformanceToolInput,
  PendingRequestsToolInput,
  PeriodToolInput,
  TrendsToolInput,
  WorkflowHistoryToolInput,
} from '../schemas/agent.schema';
import { percentChange } from '../utils/timeWindow';

export async function getOverviewMetrics() {
  return analytics.getOverview();
}

export async function getOrganMetrics() {
  return analytics.getOrganAnalytics();
}

export async function getOrganAvailabilityConcentration() {
  return analytics.getOrganAvailabilityConcentration();
}

export async function getHospitalMetrics() {
  return analytics.getHospitalAnalytics();
}

export async function getHospitalRequestPerformance(input: HospitalPerformanceToolInput) {
  const result = await analytics.getHospitalRequestPerformance(input.hospitalId, input);
  if (!result) return { error: `No hospital found with id ${input.hospitalId}` };
  return result;
}

export async function getDonorMetrics(input: PeriodToolInput) {
  return analytics.getDonorAnalytics(input);
}

export async function getWithdrawalMetrics(input: PeriodToolInput) {
  return analytics.getWithdrawalAnalytics(input);
}

export async function getOrganRequestMetrics(input: PeriodToolInput) {
  return analytics.getOrganRequestAnalytics(input);
}

/**
 * Pending/stale request records for investigation. Deliberately narrow field selection - just
 * enough for the agent to reason about aging and distribution, never donor identity or medical
 * detail (mirrors the same reduced donor view already used in every admin organ-request/
 * withdrawal list response).
 */
export async function getPendingRequests(input: PendingRequestsToolInput) {
  if (input.type === 'ORGAN_REQUEST') {
    const { items } = await organRequestService.list({
      status: (input.status as 'PENDING' | 'APPROVED' | 'DECLINED' | 'CANCELLED' | undefined) ?? 'PENDING',
      hospitalId: input.hospitalId,
      page: 1,
      pageSize: input.limit,
    });
    return items.map((r) => ({
      id: r.id,
      status: r.status,
      hospital: r.hospital.name,
      organType: r.organ.organType,
      organStatus: r.organ.status,
      createdAt: r.createdAt,
      ageDays: Math.floor((Date.now() - new Date(r.createdAt).getTime()) / 86_400_000),
    }));
  }

  const { items } = await withdrawalService.listForAdmin({
    status: input.status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined,
    page: 1,
    pageSize: input.limit,
  });
  return items.map((w) => ({
    id: w.id,
    status: w.status,
    donorCode: w.donor.donorCode,
    createdAt: w.createdAt,
    ageDays: Math.floor((Date.now() - new Date(w.createdAt).getTime()) / 86_400_000),
  }));
}

export async function getTrends(input: TrendsToolInput) {
  const trends = await analytics.getTrends(input);
  const data: Record<string, Record<string, number>> = {
    donorRegistrations: trends.donorRegistrations,
    organRegistrations: trends.organRegistrations,
    withdrawalRequests: trends.withdrawalRequests,
    organRequests: trends.organRequests,
  };
  return { window: trends.window, metric: input.metric, data: data[input.metric] };
}

/**
 * Generic period-over-period comparison for a named metric. Reuses the exact current/previous
 * counts already computed by the relevant analytics function - never a second aggregation.
 */
export async function comparePeriods(input: ComparePeriodsToolInput) {
  const period = { window: input.currentWindow };
  if (input.metric === 'donorRegistrations') {
    const d = await analytics.getDonorAnalytics(period);
    return { metric: input.metric, window: d.window, ...d.registrations };
  }
  if (input.metric === 'organRequestVolume') {
    const r = await analytics.getOrganRequestAnalytics(period);
    return { metric: input.metric, window: r.window, ...r.requests };
  }
  const w = await analytics.getWithdrawalAnalytics(period);
  return { metric: input.metric, window: w.window, ...w.requests, percentChange: percentChange(w.requests.current, w.requests.previous) };
}

export async function getThresholdBreaches(input: PeriodToolInput) {
  return analytics.getThresholdBreaches(input);
}

export async function getWorkflowHistoryTool(input: WorkflowHistoryToolInput) {
  // Confirm the entity exists before returning an (empty) history, so the agent can tell
  // "no history recorded" apart from "this id doesn't exist".
  const exists = await entityExists(input.entityType, input.entityId);
  if (!exists) return { error: `No ${input.entityType} found with id ${input.entityId}` };
  return getWorkflowHistory(input.entityType, input.entityId);
}

async function entityExists(entityType: WorkflowHistoryToolInput['entityType'], id: string): Promise<boolean> {
  switch (entityType) {
    case 'DONOR':
      return Boolean(await prisma.donor.findUnique({ where: { id }, select: { id: true } }));
    case 'ORGAN':
      return Boolean(await prisma.organ.findUnique({ where: { id }, select: { id: true } }));
    case 'WITHDRAWAL_REQUEST':
      return Boolean(await prisma.withdrawalRequest.findUnique({ where: { id }, select: { id: true } }));
    case 'ORGAN_REQUEST':
      return Boolean(await prisma.organRequest.findUnique({ where: { id }, select: { id: true } }));
    default:
      return false;
  }
}
