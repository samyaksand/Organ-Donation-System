/**
 * Deterministic security/access-control analytics, computed with Prisma groupBy/aggregate over
 * SecurityEvent and AiSecurityEvent - never raw per-row loops, matching the convention set by
 * analytics.service.ts. This is the ONE source of security metrics: the admin Security
 * dashboard and the admin investigation agent's security tools (agent/securityTools.ts) both
 * call these same functions - no parallel calculation.
 */
import { prisma } from '../lib/prisma';
import { resolveWindow, percentChange, previousPeriod } from '../utils/timeWindow';
import type { AnalyticsWindowQuery } from '../schemas/analytics.schema';

export async function getSecurityOverview(query: AnalyticsWindowQuery = {}) {
  const window = resolveWindow(query);
  const prev = previousPeriod(window);

  const [totalEvents, allowCount, denyCount, prevTotal, aiTotal, aiBlocked] = await Promise.all([
    prisma.securityEvent.count({ where: { createdAt: { gte: window.start, lt: window.end } } }),
    prisma.securityEvent.count({ where: { createdAt: { gte: window.start, lt: window.end }, decision: 'ALLOW' } }),
    prisma.securityEvent.count({ where: { createdAt: { gte: window.start, lt: window.end }, decision: 'DENY' } }),
    prisma.securityEvent.count({ where: { createdAt: { gte: prev.start, lt: prev.end } } }),
    prisma.aiSecurityEvent.count({ where: { createdAt: { gte: window.start, lt: window.end } } }),
    prisma.aiSecurityEvent.count({ where: { createdAt: { gte: window.start, lt: window.end }, decision: 'DENY' } }),
  ]);

  return {
    window: window.label,
    totalEvents,
    allowCount,
    denyCount,
    percentChangeVsPreviousPeriod: percentChange(totalEvents, prevTotal),
    aiRequestsScreened: aiTotal,
    aiRequestsBlocked: aiBlocked,
  };
}

export async function getAccessDecisionMetrics(query: AnalyticsWindowQuery = {}) {
  const window = resolveWindow(query);
  const where = { createdAt: { gte: window.start, lt: window.end } } as const;

  const [byRole, byResource, byDecision] = await Promise.all([
    prisma.securityEvent.groupBy({ by: ['actorRole', 'decision'], where, _count: { _all: true } }),
    prisma.securityEvent.groupBy({ by: ['resource', 'decision'], where, _count: { _all: true } }),
    prisma.securityEvent.groupBy({ by: ['decision'], where, _count: { _all: true } }),
  ]);

  return {
    window: window.label,
    byRole: byRole.map((r) => ({ role: r.actorRole, decision: r.decision, count: r._count._all })),
    byResource: byResource.map((r) => ({ resource: r.resource, decision: r.decision, count: r._count._all })),
    byDecision: byDecision.map((r) => ({ decision: r.decision, count: r._count._all })),
  };
}

export async function getDeniedAccessEvents(query: AnalyticsWindowQuery & { limit?: number } = {}) {
  const window = resolveWindow(query);
  const events = await prisma.securityEvent.findMany({
    where: { decision: 'DENY', createdAt: { gte: window.start, lt: window.end } },
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 20,
    select: {
      id: true,
      actorRole: true,
      resource: true,
      action: true,
      classification: true,
      policyCode: true,
      reason: true,
      createdAt: true,
    },
  });
  return { window: window.label, events };
}

export async function getPolicyViolations(query: AnalyticsWindowQuery = {}) {
  const window = resolveWindow(query);
  const violations = await prisma.securityEvent.groupBy({
    by: ['policyCode', 'resource', 'actorRole'],
    where: { decision: 'DENY', createdAt: { gte: window.start, lt: window.end } },
    _count: { _all: true },
    orderBy: { _count: { policyCode: 'desc' } },
  });
  return {
    window: window.label,
    violations: violations.map((v) => ({ policyCode: v.policyCode, resource: v.resource, role: v.actorRole, count: v._count._all })),
  };
}

export async function getSecurityTrends(query: AnalyticsWindowQuery = {}) {
  const window = resolveWindow(query);
  const events = await prisma.securityEvent.findMany({
    where: { createdAt: { gte: window.start, lt: window.end } },
    select: { createdAt: true, decision: true },
  });

  const byDay = new Map<string, { allow: number; deny: number }>();
  for (const e of events) {
    const day = e.createdAt.toISOString().slice(0, 10);
    const bucket = byDay.get(day) ?? { allow: 0, deny: 0 };
    if (e.decision === 'ALLOW') bucket.allow += 1;
    else bucket.deny += 1;
    byDay.set(day, bucket);
  }

  return {
    window: window.label,
    points: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, counts]) => ({ date, ...counts })),
  };
}

export async function getSecurityEventHistory(query: AnalyticsWindowQuery & { limit?: number } = {}) {
  const window = resolveWindow(query);
  const events = await prisma.securityEvent.findMany({
    where: { createdAt: { gte: window.start, lt: window.end } },
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 50,
    select: {
      id: true,
      actorRole: true,
      resource: true,
      action: true,
      classification: true,
      decision: true,
      policyCode: true,
      reason: true,
      createdAt: true,
    },
  });
  return { window: window.label, events };
}

export async function getAiSecurityEvents(query: AnalyticsWindowQuery & { limit?: number } = {}) {
  const window = resolveWindow(query);
  const events = await prisma.aiSecurityEvent.findMany({
    where: { createdAt: { gte: window.start, lt: window.end } },
    orderBy: { createdAt: 'desc' },
    take: query.limit ?? 50,
    select: {
      id: true,
      actorRole: true,
      surface: true,
      classification: true,
      decision: true,
      reason: true,
      questionExcerpt: true,
      createdAt: true,
    },
  });
  return { window: window.label, events };
}

export async function getAiSecurityBreakdown(query: AnalyticsWindowQuery = {}) {
  const window = resolveWindow(query);
  const byClassification = await prisma.aiSecurityEvent.groupBy({
    by: ['classification', 'decision'],
    where: { createdAt: { gte: window.start, lt: window.end } },
    _count: { _all: true },
  });
  return {
    window: window.label,
    byClassification: byClassification.map((c) => ({ classification: c.classification, decision: c.decision, count: c._count._all })),
  };
}
