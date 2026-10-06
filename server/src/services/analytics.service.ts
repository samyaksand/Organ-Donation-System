/**
 * Deterministic, read-only operations/analytics layer. Every figure here is a direct database
 * aggregate (count/groupBy/avg) - nothing is estimated, interpolated, or derived from an LLM.
 * This is the intended future data source for a controlled AI Operations Agent: the agent would
 * call these same endpoints as read-only tools and explain/contextualize the numbers, never
 * compute or invent them independently. See prisma/schema.prisma (WorkflowEvent) for how
 * processing-duration figures are derived from real recorded transitions.
 *
 * Every query here is a single aggregate query (groupBy/count/aggregate) or a small fixed
 * number of them run in parallel via Promise.all - never a per-row loop (no N+1).
 */
import type { DonorStatus, OrganStatus, OrganType, WithdrawalStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { DONOR_STATUSES, ORGAN_REQUEST_STATUSES, ORGAN_STATUSES, ORGAN_TYPES, WITHDRAWAL_STATUSES } from '../schemas/common';
import type { AnalyticsWindowQuery, TrendsQuery } from '../schemas/analytics.schema';
import { percentChange, previousPeriod, resolveWindow, type ResolvedWindow } from '../utils/timeWindow';

function zeroRecord<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
}

// ---------------------------------------------------------------------------
// Overview - the single "front page" of operational figures.
// ---------------------------------------------------------------------------

export async function getOverview() {
  const [donorsByStatus, organsByStatus, withdrawalsByStatus, organRequestsByStatus, hospitalCount, hospitalsWithAvailability] =
    await Promise.all([
      prisma.donor.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.organ.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.withdrawalRequest.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.organRequest.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.hospital.count(),
      prisma.hospital.count({ where: { organs: { some: { status: 'AVAILABLE' } } } }),
    ]);

  const donors = zeroRecord(DONOR_STATUSES);
  for (const g of donorsByStatus) donors[g.status] = g._count._all;

  const organs = zeroRecord(ORGAN_STATUSES);
  for (const g of organsByStatus) organs[g.status] = g._count._all;

  const withdrawals = zeroRecord(WITHDRAWAL_STATUSES);
  for (const g of withdrawalsByStatus) withdrawals[g.status] = g._count._all;

  const organRequests = zeroRecord(ORGAN_REQUEST_STATUSES);
  for (const g of organRequestsByStatus) organRequests[g.status] = g._count._all;

  const donorTotal = Object.values(donors).reduce((a, b) => a + b, 0);
  const organTotal = Object.values(organs).reduce((a, b) => a + b, 0);
  const withdrawalTotal = Object.values(withdrawals).reduce((a, b) => a + b, 0);
  const organRequestTotal = Object.values(organRequests).reduce((a, b) => a + b, 0);

  return {
    donors: { ...donors, total: donorTotal },
    organs: { ...organs, total: organTotal },
    withdrawals: { ...withdrawals, total: withdrawalTotal },
    organRequests: { ...organRequests, total: organRequestTotal },
    hospitals: { total: hospitalCount, withAvailability: hospitalsWithAvailability, zeroAvailability: hospitalCount - hospitalsWithAvailability },
  };
}

// ---------------------------------------------------------------------------
// Donors
// ---------------------------------------------------------------------------

export async function getDonorAnalytics(query: AnalyticsWindowQuery) {
  const window = resolveWindow(query);
  const previous = previousPeriod(window);

  const [byStatus, byBloodType, registrationsInWindow, registrationsInPrevious] = await Promise.all([
    prisma.donor.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.donor.groupBy({ by: ['bloodType'], _count: { _all: true } }),
    prisma.donor.count({ where: { createdAt: { gte: window.start, lt: window.end } } }),
    prisma.donor.count({ where: { createdAt: { gte: previous.start, lt: previous.end } } }),
  ]);

  const statusCounts = zeroRecord(DONOR_STATUSES);
  for (const g of byStatus) statusCounts[g.status] = g._count._all;

  // bloodType is nullable (not collected by the original registration form); report it
  // explicitly as "UNKNOWN" rather than silently dropping those donors from the distribution.
  const bloodTypeCounts: Record<string, number> = {};
  for (const g of byBloodType) bloodTypeCounts[g.bloodType ?? 'UNKNOWN'] = g._count._all;

  return {
    window: { label: window.label, start: window.start.toISOString(), end: window.end.toISOString() },
    byStatus: { ...statusCounts, total: Object.values(statusCounts).reduce((a, b) => a + b, 0) },
    byBloodType: bloodTypeCounts,
    registrations: {
      current: registrationsInWindow,
      previous: registrationsInPrevious,
      percentChange: percentChange(registrationsInWindow, registrationsInPrevious),
    },
  };
}

// ---------------------------------------------------------------------------
// Organs
// ---------------------------------------------------------------------------

export async function getOrganAnalytics() {
  const [byStatus, byType, availableByType, byHospital] = await Promise.all([
    prisma.organ.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.organ.groupBy({ by: ['organType'], _count: { _all: true } }),
    prisma.organ.groupBy({ by: ['organType'], where: { status: 'AVAILABLE' }, _count: { _all: true } }),
    prisma.organ.groupBy({ by: ['hospitalId', 'status'], _count: { _all: true } }),
  ]);

  const statusCounts = zeroRecord(ORGAN_STATUSES);
  for (const g of byStatus) statusCounts[g.status] = g._count._all;

  const typeCounts = new Map<OrganType, number>(byType.map((g) => [g.organType, g._count._all]));
  const availableCounts = new Map<OrganType, number>(availableByType.map((g) => [g.organType, g._count._all]));
  const byOrganType = ORGAN_TYPES.map((organType) => ({
    organType,
    total: typeCounts.get(organType) ?? 0,
    available: availableCounts.get(organType) ?? 0,
  }));

  // Aggregate the (hospitalId, status) groups into one row per hospital without a second query
  // per hospital (no N+1): a single Map built from the one groupBy result above.
  const hospitalIds = [...new Set(byHospital.map((g) => g.hospitalId))];
  const hospitals = hospitalIds.length
    ? await prisma.hospital.findMany({ where: { id: { in: hospitalIds } }, select: { id: true, name: true, city: true } })
    : [];
  const hospitalById = new Map(hospitals.map((h) => [h.id, h]));

  const perHospital = new Map<string, { available: number; pending: number; unavailable: number }>();
  for (const g of byHospital) {
    const row = perHospital.get(g.hospitalId) ?? { available: 0, pending: 0, unavailable: 0 };
    if (g.status === 'AVAILABLE') row.available = g._count._all;
    if (g.status === 'PENDING') row.pending = g._count._all;
    if (g.status === 'UNAVAILABLE') row.unavailable = g._count._all;
    perHospital.set(g.hospitalId, row);
  }

  const byHospitalRows = [...perHospital.entries()]
    .map(([hospitalId, counts]) => ({
      hospitalId,
      hospitalName: hospitalById.get(hospitalId)?.name ?? 'Unknown hospital',
      city: hospitalById.get(hospitalId)?.city ?? null,
      ...counts,
      total: counts.available + counts.pending + counts.unavailable,
    }))
    .sort((a, b) => b.available - a.available);

  return {
    byStatus: { ...statusCounts, total: Object.values(statusCounts).reduce((a, b) => a + b, 0) },
    byOrganType,
    byHospital: byHospitalRows,
  };
}

/**
 * Share of all AVAILABLE organs held by the single most-stocked hospital. A pure derived view
 * over getOrganAnalytics()'s own byHospital rows - no new aggregation query. Exists as its own
 * named function because "where is availability concentrated" is a distinct management/agent
 * question from the full per-hospital breakdown.
 */
export async function getOrganAvailabilityConcentration() {
  const { byHospital } = await getOrganAnalytics();
  const totalAvailable = byHospital.reduce((sum, h) => sum + h.available, 0);
  const ranked = [...byHospital].filter((h) => h.available > 0).sort((a, b) => b.available - a.available);
  const top = ranked[0] ?? null;

  return {
    totalAvailable,
    topHospital: top && totalAvailable > 0
      ? {
          hospitalId: top.hospitalId,
          hospitalName: top.hospitalName,
          city: top.city,
          available: top.available,
          sharePercent: Math.round((top.available / totalAvailable) * 1000) / 10,
        }
      : null,
    byHospital: ranked.map((h) => ({
      hospitalId: h.hospitalId,
      hospitalName: h.hospitalName,
      city: h.city,
      available: h.available,
      sharePercent: totalAvailable > 0 ? Math.round((h.available / totalAvailable) * 1000) / 10 : 0,
    })),
  };
}

// ---------------------------------------------------------------------------
// Hospitals
// ---------------------------------------------------------------------------

export async function getHospitalAnalytics() {
  const [total, hospitals, organsByHospitalStatus] = await Promise.all([
    prisma.hospital.count(),
    prisma.hospital.findMany({ select: { id: true, name: true, city: true, state: true } }),
    prisma.organ.groupBy({ by: ['hospitalId', 'status'], _count: { _all: true } }),
  ]);

  const perHospital = new Map<string, { available: number; pending: number; unavailable: number }>();
  for (const g of organsByHospitalStatus) {
    const row = perHospital.get(g.hospitalId) ?? { available: 0, pending: 0, unavailable: 0 };
    if (g.status === 'AVAILABLE') row.available = g._count._all;
    if (g.status === 'PENDING') row.pending = g._count._all;
    if (g.status === 'UNAVAILABLE') row.unavailable = g._count._all;
    perHospital.set(g.hospitalId, row);
  }

  const rows = hospitals.map((h) => {
    const counts = perHospital.get(h.id) ?? { available: 0, pending: 0, unavailable: 0 };
    return {
      id: h.id,
      name: h.name,
      city: h.city,
      state: h.state,
      ...counts,
      totalOrgans: counts.available + counts.pending + counts.unavailable,
    };
  });

  const withAvailability = rows.filter((r) => r.available > 0);
  const zeroAvailability = rows.filter((r) => r.available === 0);

  return {
    total,
    withAvailability: withAvailability.length,
    zeroAvailability: zeroAvailability.length,
    hospitals: rows.sort((a, b) => b.available - a.available),
    zeroAvailabilityHospitals: zeroAvailability.map((r) => ({ id: r.id, name: r.name, city: r.city })),
  };
}

// ---------------------------------------------------------------------------
// Withdrawals
// ---------------------------------------------------------------------------

/** Age threshold (days) above which a PENDING withdrawal request is flagged as stale. */
const STALE_PENDING_DAYS = 14;

export async function getWithdrawalAnalytics(query: AnalyticsWindowQuery) {
  const window = resolveWindow(query);
  const previous = previousPeriod(window);

  const [byStatus, requestsInWindow, requestsInPrevious, reviewed, oldestPending, allPending] = await Promise.all([
    prisma.withdrawalRequest.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.withdrawalRequest.count({ where: { createdAt: { gte: window.start, lt: window.end } } }),
    prisma.withdrawalRequest.count({ where: { createdAt: { gte: previous.start, lt: previous.end } } }),
    prisma.withdrawalRequest.findMany({
      where: { status: { in: ['APPROVED', 'REJECTED'] }, reviewedAt: { not: null } },
      select: { createdAt: true, reviewedAt: true },
    }),
    prisma.withdrawalRequest.findFirst({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: { id: true, createdAt: true },
    }),
    prisma.withdrawalRequest.findMany({ where: { status: 'PENDING' }, select: { createdAt: true } }),
  ]);

  const statusCounts = zeroRecord(WITHDRAWAL_STATUSES);
  for (const g of byStatus) statusCounts[g.status] = g._count._all;

  const durationsMs = reviewed
    .filter((r) => r.reviewedAt)
    .map((r) => r.reviewedAt!.getTime() - r.createdAt.getTime());
  const averageProcessingHours = durationsMs.length
    ? Math.round((durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length / 3_600_000) * 10) / 10
    : null;

  const now = Date.now();
  const stalePendingCount = allPending.filter((r) => (now - r.createdAt.getTime()) / 86_400_000 > STALE_PENDING_DAYS).length;

  return {
    window: { label: window.label, start: window.start.toISOString(), end: window.end.toISOString() },
    byStatus: { ...statusCounts, total: Object.values(statusCounts).reduce((a, b) => a + b, 0) },
    requests: {
      current: requestsInWindow,
      previous: requestsInPrevious,
      percentChange: percentChange(requestsInWindow, requestsInPrevious),
    },
    averageProcessingHours,
    reviewedCount: durationsMs.length,
    oldestPending: oldestPending
      ? { id: oldestPending.id, createdAt: oldestPending.createdAt.toISOString(), ageDays: Math.floor((now - oldestPending.createdAt.getTime()) / 86_400_000) }
      : null,
    stalePendingThresholdDays: STALE_PENDING_DAYS,
    stalePendingCount,
  };
}

// ---------------------------------------------------------------------------
// Organ requests (hospital organ request & fulfillment workflow)
// ---------------------------------------------------------------------------

/** Age threshold (days) above which a PENDING organ request is flagged as stale. */
const STALE_ORGAN_REQUEST_DAYS = 7;

export async function getOrganRequestAnalytics(query: AnalyticsWindowQuery) {
  const window = resolveWindow(query);
  const previous = previousPeriod(window);

  const [byStatus, requestsInWindow, requestsInPrevious, reviewed, oldestPending, allPending, byHospital, byOrganType] =
    await Promise.all([
      prisma.organRequest.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.organRequest.count({ where: { createdAt: { gte: window.start, lt: window.end } } }),
      prisma.organRequest.count({ where: { createdAt: { gte: previous.start, lt: previous.end } } }),
      prisma.organRequest.findMany({
        where: { status: { in: ['APPROVED', 'DECLINED'] }, reviewedAt: { not: null } },
        select: { createdAt: true, reviewedAt: true },
      }),
      prisma.organRequest.findFirst({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        select: { id: true, createdAt: true },
      }),
      prisma.organRequest.findMany({ where: { status: 'PENDING' }, select: { createdAt: true } }),
      prisma.organRequest.groupBy({ by: ['hospitalId', 'status'], _count: { _all: true } }),
      prisma.organRequest.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

  const statusCounts = zeroRecord(ORGAN_REQUEST_STATUSES);
  for (const g of byStatus) statusCounts[g.status] = g._count._all;

  const durationsMs = reviewed.filter((r) => r.reviewedAt).map((r) => r.reviewedAt!.getTime() - r.createdAt.getTime());
  const averageProcessingHours = durationsMs.length
    ? Math.round((durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length / 3_600_000) * 10) / 10
    : null;

  const now = Date.now();
  const stalePendingCount = allPending.filter((r) => (now - r.createdAt.getTime()) / 86_400_000 > STALE_ORGAN_REQUEST_DAYS).length;

  // Hospital activity: total requests and approval/decline split per hospital, aggregated from
  // a single groupBy (no N+1 per hospital).
  const hospitalIds = [...new Set(byHospital.map((g) => g.hospitalId))];
  const hospitals = hospitalIds.length
    ? await prisma.hospital.findMany({ where: { id: { in: hospitalIds } }, select: { id: true, name: true, city: true } })
    : [];
  const hospitalById = new Map(hospitals.map((h) => [h.id, h]));
  const perHospital = new Map<string, Record<string, number>>();
  for (const g of byHospital) {
    const row = perHospital.get(g.hospitalId) ?? zeroRecord(ORGAN_REQUEST_STATUSES);
    row[g.status] = g._count._all;
    perHospital.set(g.hospitalId, row);
  }
  const hospitalActivity = [...perHospital.entries()]
    .map(([hospitalId, counts]) => ({
      hospitalId,
      hospitalName: hospitalById.get(hospitalId)?.name ?? 'Unknown hospital',
      city: hospitalById.get(hospitalId)?.city ?? null,
      ...counts,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.total - a.total);

  const organTypeTotal = byOrganType.reduce((sum, g) => sum + g._count._all, 0);

  return {
    window: { label: window.label, start: window.start.toISOString(), end: window.end.toISOString() },
    byStatus: { ...statusCounts, total: Object.values(statusCounts).reduce((a, b) => a + b, 0) },
    requests: {
      current: requestsInWindow,
      previous: requestsInPrevious,
      percentChange: percentChange(requestsInWindow, requestsInPrevious),
    },
    averageProcessingHours,
    reviewedCount: durationsMs.length,
    approvalRate: durationsMs.length ? Math.round((statusCounts.APPROVED / (statusCounts.APPROVED + statusCounts.DECLINED || 1)) * 1000) / 10 : null,
    oldestPending: oldestPending
      ? {
          id: oldestPending.id,
          createdAt: oldestPending.createdAt.toISOString(),
          ageDays: Math.floor((now - oldestPending.createdAt.getTime()) / 86_400_000),
        }
      : null,
    stalePendingThresholdDays: STALE_ORGAN_REQUEST_DAYS,
    stalePendingCount,
    hospitalActivity,
    requestVolumeTotal: organTypeTotal,
  };
}

/**
 * Organ-request performance for one specific hospital: volume, pending/stale counts, processing
 * time and approval/decline split, scoped with `hospitalId` on top of the same queries
 * getOrganRequestAnalytics() runs unscoped. Used by the hospital drill-down and by the
 * Operations Intelligence Agent's `getHospitalRequestPerformance` tool.
 */
export async function getHospitalRequestPerformance(hospitalId: string, query: AnalyticsWindowQuery) {
  const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId }, select: { id: true, name: true, city: true } });
  if (!hospital) return null;

  const window = resolveWindow(query);
  const previous = previousPeriod(window);

  const [byStatus, requestsInWindow, requestsInPrevious, reviewed, oldestPending, allPending] = await Promise.all([
    prisma.organRequest.groupBy({ by: ['status'], where: { hospitalId }, _count: { _all: true } }),
    prisma.organRequest.count({ where: { hospitalId, createdAt: { gte: window.start, lt: window.end } } }),
    prisma.organRequest.count({ where: { hospitalId, createdAt: { gte: previous.start, lt: previous.end } } }),
    prisma.organRequest.findMany({
      where: { hospitalId, status: { in: ['APPROVED', 'DECLINED'] }, reviewedAt: { not: null } },
      select: { createdAt: true, reviewedAt: true },
    }),
    prisma.organRequest.findFirst({
      where: { hospitalId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: { id: true, createdAt: true },
    }),
    prisma.organRequest.findMany({ where: { hospitalId, status: 'PENDING' }, select: { createdAt: true } }),
  ]);

  const statusCounts = zeroRecord(ORGAN_REQUEST_STATUSES);
  for (const g of byStatus) statusCounts[g.status] = g._count._all;

  const durationsMs = reviewed.filter((r) => r.reviewedAt).map((r) => r.reviewedAt!.getTime() - r.createdAt.getTime());
  const averageProcessingHours = durationsMs.length
    ? Math.round((durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length / 3_600_000) * 10) / 10
    : null;

  const now = Date.now();
  const stalePendingCount = allPending.filter((r) => (now - r.createdAt.getTime()) / 86_400_000 > STALE_ORGAN_REQUEST_DAYS).length;

  return {
    hospital: { id: hospital.id, name: hospital.name, city: hospital.city },
    window: { label: window.label, start: window.start.toISOString(), end: window.end.toISOString() },
    byStatus: { ...statusCounts, total: Object.values(statusCounts).reduce((a, b) => a + b, 0) },
    requests: {
      current: requestsInWindow,
      previous: requestsInPrevious,
      percentChange: percentChange(requestsInWindow, requestsInPrevious),
    },
    averageProcessingHours,
    reviewedCount: durationsMs.length,
    approvalRate: durationsMs.length ? Math.round((statusCounts.APPROVED / (statusCounts.APPROVED + statusCounts.DECLINED || 1)) * 1000) / 10 : null,
    oldestPending: oldestPending
      ? {
          id: oldestPending.id,
          createdAt: oldestPending.createdAt.toISOString(),
          ageDays: Math.floor((now - oldestPending.createdAt.getTime()) / 86_400_000),
        }
      : null,
    stalePendingThresholdDays: STALE_ORGAN_REQUEST_DAYS,
    stalePendingCount,
  };
}

// ---------------------------------------------------------------------------
// Trends - registrations / organs / withdrawals over time, bucketed by day/week/month.
// ---------------------------------------------------------------------------

function bucketKey(date: Date, granularity: 'day' | 'week' | 'month'): string {
  if (granularity === 'month') return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  if (granularity === 'week') {
    // ISO week start (Monday), UTC.
    const d = new Date(date);
    const day = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - day);
    return d.toISOString().slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function bucketCounts(dates: Date[], granularity: 'day' | 'week' | 'month'): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const d of dates) {
    const key = bucketKey(d, granularity);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export async function getTrends(query: TrendsQuery) {
  const window = resolveWindow(query);
  const granularity = query.granularity ?? 'day';

  const [donorRows, organRows, withdrawalRows, organRequestRows] = await Promise.all([
    prisma.donor.findMany({ where: { createdAt: { gte: window.start, lt: window.end } }, select: { createdAt: true } }),
    prisma.organ.findMany({ where: { createdAt: { gte: window.start, lt: window.end } }, select: { createdAt: true, status: true } }),
    prisma.withdrawalRequest.findMany({
      where: { createdAt: { gte: window.start, lt: window.end } },
      select: { createdAt: true, status: true, reviewedAt: true },
    }),
    prisma.organRequest.findMany({
      where: { createdAt: { gte: window.start, lt: window.end } },
      select: { createdAt: true, status: true, reviewedAt: true },
    }),
  ]);

  const approvedWithdrawals = withdrawalRows.filter((w) => w.status === 'APPROVED').map((w) => w.reviewedAt ?? w.createdAt);
  const declinedWithdrawals = withdrawalRows.filter((w) => w.status === 'REJECTED').map((w) => w.reviewedAt ?? w.createdAt);
  const approvedOrganRequests = organRequestRows.filter((r) => r.status === 'APPROVED').map((r) => r.reviewedAt ?? r.createdAt);
  const declinedOrganRequests = organRequestRows.filter((r) => r.status === 'DECLINED').map((r) => r.reviewedAt ?? r.createdAt);

  return {
    window: { label: window.label, start: window.start.toISOString(), end: window.end.toISOString(), granularity },
    donorRegistrations: bucketCounts(donorRows.map((d) => d.createdAt), granularity),
    organRegistrations: bucketCounts(organRows.map((o) => o.createdAt), granularity),
    withdrawalRequests: bucketCounts(withdrawalRows.map((w) => w.createdAt), granularity),
    withdrawalApprovals: bucketCounts(approvedWithdrawals, granularity),
    withdrawalDeclines: bucketCounts(declinedWithdrawals, granularity),
    organRequests: bucketCounts(organRequestRows.map((r) => r.createdAt), granularity),
    organRequestApprovals: bucketCounts(approvedOrganRequests, granularity),
    organRequestDeclines: bucketCounts(declinedOrganRequests, granularity),
  };
}

// ---------------------------------------------------------------------------
// Threshold breaches - the deterministic bottleneck rules also surfaced in the admin
// Analytics "Bottlenecks" tab (client/src/features/analytics/bottlenecks.ts), computed here
// server-side so the Operations Intelligence Agent (and any other server-side caller) reads
// the exact same rule set rather than a parallel reimplementation. Every item is a plain
// threshold check over numbers the analytics functions above already compute - no AI, no
// invented values.
// ---------------------------------------------------------------------------

export interface ThresholdBreach {
  id: string;
  severity: 'high' | 'medium';
  title: string;
  evidence: string;
  metric: string;
  affected: string;
}

const CONCENTRATION_SHARE_THRESHOLD = 40;

export async function getThresholdBreaches(query: AnalyticsWindowQuery): Promise<ThresholdBreach[]> {
  const [organRequests, withdrawals, hospitals, organs, concentration] = await Promise.all([
    getOrganRequestAnalytics(query),
    getWithdrawalAnalytics(query),
    getHospitalAnalytics(),
    getOrganAnalytics(),
    getOrganAvailabilityConcentration(),
  ]);

  const items: ThresholdBreach[] = [];

  if (organRequests.stalePendingCount > 0) {
    items.push({
      id: 'stale-organ-requests',
      severity: 'high',
      title: 'Organ request processing backlog',
      evidence: `${organRequests.stalePendingCount} request(s) pending for more than ${organRequests.stalePendingThresholdDays} days.`,
      metric:
        organRequests.averageProcessingHours !== null
          ? `Average processing time: ${organRequests.averageProcessingHours}h`
          : 'No completed requests yet to measure processing time',
      affected: `${organRequests.byStatus.PENDING} request(s) currently pending`,
    });
  }

  if (withdrawals.stalePendingCount > 0) {
    items.push({
      id: 'stale-withdrawals',
      severity: 'high',
      title: 'Withdrawal review backlog',
      evidence: `${withdrawals.stalePendingCount} withdrawal request(s) pending for more than ${withdrawals.stalePendingThresholdDays} days.`,
      metric:
        withdrawals.averageProcessingHours !== null
          ? `Average processing time: ${withdrawals.averageProcessingHours}h`
          : 'No completed reviews yet to measure processing time',
      affected: `${withdrawals.byStatus.PENDING} request(s) currently pending`,
    });
  }

  if (hospitals.zeroAvailability > 0) {
    items.push({
      id: 'zero-availability-hospitals',
      severity: 'medium',
      title: 'Hospitals with zero organ availability',
      evidence: `${hospitals.zeroAvailability} of ${hospitals.total} hospitals currently have no available organs.`,
      metric: hospitals.zeroAvailabilityHospitals.map((h) => h.name).join(', '),
      affected: `${hospitals.zeroAvailability} hospital(s)`,
    });
  }

  const zeroTypes = organs.byOrganType.filter((t) => t.total > 0 && t.available === 0);
  if (zeroTypes.length > 0) {
    items.push({
      id: 'zero-availability-organ-types',
      severity: 'medium',
      title: 'Organ types with zero availability',
      evidence: `${zeroTypes.map((t) => t.organType).join(', ')} currently have no available organs anywhere in the registry.`,
      metric: `${zeroTypes.length} of ${organs.byOrganType.filter((t) => t.total > 0).length} tracked organ types affected`,
      affected: zeroTypes.map((t) => t.organType).join(', '),
    });
  }

  if (concentration.topHospital && concentration.topHospital.sharePercent >= CONCENTRATION_SHARE_THRESHOLD && concentration.byHospital.length > 1) {
    items.push({
      id: 'concentrated-availability',
      severity: 'medium',
      title: 'Organ availability concentrated at one hospital',
      evidence: `${concentration.topHospital.hospitalName} holds ${concentration.topHospital.available} of ${concentration.totalAvailable} available organs (${concentration.topHospital.sharePercent}%).`,
      metric: `${concentration.topHospital.sharePercent}% concentration`,
      affected: concentration.topHospital.hospitalName,
    });
  }

  return items;
}

// Re-exported only for tests that want the resolved window without hitting the database.
export type { ResolvedWindow };
export type { DonorStatus, OrganStatus, WithdrawalStatus };
