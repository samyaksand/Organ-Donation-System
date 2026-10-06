import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { prisma as prismaClient } from '../src/lib/prisma';
import { percentChange, previousPeriod, resolveWindow } from '../src/utils/timeWindow';
import { adminUser, authCookie, donorUser } from './helpers/auth';
import type { PrismaMock } from './helpers/prisma-mock';

vi.mock('../src/lib/prisma', async () => {
  const { createPrismaMock } = await import('./helpers/prisma-mock.js');
  return { prisma: createPrismaMock() };
});

const prisma = prismaClient as unknown as PrismaMock;
const app = createApp();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Analytics authorization', () => {
  it('ADMIN can reach every analytics endpoint', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.donor.groupBy.mockResolvedValue([]);
    prisma.organ.groupBy.mockResolvedValue([]);
    prisma.withdrawalRequest.groupBy.mockResolvedValue([]);
    prisma.hospital.count.mockResolvedValue(0);
    prisma.hospital.findMany.mockResolvedValue([]);
    prisma.donor.count.mockResolvedValue(0);
    prisma.withdrawalRequest.count.mockResolvedValue(0);
    prisma.withdrawalRequest.findMany.mockResolvedValue([]);
    prisma.withdrawalRequest.findFirst.mockResolvedValue(null);
    prisma.donor.findMany.mockResolvedValue([]);
    prisma.organ.findMany.mockResolvedValue([]);
    prisma.organRequest.groupBy.mockResolvedValue([]);
    prisma.organRequest.count.mockResolvedValue(0);
    prisma.organRequest.findMany.mockResolvedValue([]);
    prisma.organRequest.findFirst.mockResolvedValue(null);

    for (const path of ['overview', 'donors', 'organs', 'hospitals', 'withdrawals', 'organ-requests', 'trends']) {
      const res = await request(app).get(`/api/v1/analytics/${path}`).set('Cookie', cookie);
      expect(res.status).toBe(200);
    }
  });

  it('DONOR is denied with 403, not a narrower error', async () => {
    const cookie = authCookie(prisma, donorUser);
    const res = await request(app).get('/api/v1/analytics/overview').set('Cookie', cookie);
    expect(res.status).toBe(403);
  });

  it('an unauthenticated request is rejected', async () => {
    const res = await request(app).get('/api/v1/analytics/overview');
    expect(res.status).toBe(401);
  });

  it('rejects window and from/to together', async () => {
    const cookie = authCookie(prisma, adminUser);
    const res = await request(app)
      .get('/api/v1/analytics/donors')
      .query({ window: '7d', from: '2026-01-01', to: '2026-01-31' })
      .set('Cookie', cookie);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/analytics/withdrawals - deterministic KPI math', () => {
  it('7 pending requests -> pending KPI = 7', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.withdrawalRequest.groupBy.mockResolvedValue([{ status: 'PENDING', _count: { _all: 7 } }]);
    prisma.withdrawalRequest.count.mockResolvedValue(0);
    prisma.withdrawalRequest.findMany.mockImplementation(async (args: { where?: { status?: string } }) =>
      args?.where?.status === 'PENDING' ? Array.from({ length: 7 }, () => ({ createdAt: new Date() })) : [],
    );
    prisma.withdrawalRequest.findFirst.mockResolvedValue(null);

    const res = await request(app).get('/api/v1/analytics/withdrawals').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.byStatus.PENDING).toBe(7);
  });

  it('3 completed requests with known durations -> exact average', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.withdrawalRequest.groupBy.mockResolvedValue([]);
    prisma.withdrawalRequest.count.mockResolvedValue(0);
    const base = new Date('2026-01-01T00:00:00Z').getTime();
    // Durations: 2h, 4h, 6h -> average exactly 4h.
    const reviewed = [
      { createdAt: new Date(base), reviewedAt: new Date(base + 2 * 3_600_000) },
      { createdAt: new Date(base), reviewedAt: new Date(base + 4 * 3_600_000) },
      { createdAt: new Date(base), reviewedAt: new Date(base + 6 * 3_600_000) },
    ];
    prisma.withdrawalRequest.findMany.mockImplementation(async (args: { where?: { status?: unknown } }) =>
      args?.where?.status && typeof args.where.status === 'object' && 'in' in (args.where.status as object) ? reviewed : [],
    );
    prisma.withdrawalRequest.findFirst.mockResolvedValue(null);

    const res = await request(app).get('/api/v1/analytics/withdrawals').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.averageProcessingHours).toBe(4);
    expect(res.body.data.reviewedCount).toBe(3);
  });

  it('reports the oldest pending request and its age in days', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.withdrawalRequest.groupBy.mockResolvedValue([]);
    prisma.withdrawalRequest.count.mockResolvedValue(0);
    prisma.withdrawalRequest.findMany.mockResolvedValue([]);
    const twentyDaysAgo = new Date(Date.now() - 20 * 86_400_000);
    prisma.withdrawalRequest.findFirst.mockResolvedValue({ id: 'w_old', createdAt: twentyDaysAgo });

    const res = await request(app).get('/api/v1/analytics/withdrawals').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.oldestPending).toMatchObject({ id: 'w_old', ageDays: 20 });
  });

  it('flags a pending request older than the stale threshold', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.withdrawalRequest.groupBy.mockResolvedValue([]);
    prisma.withdrawalRequest.count.mockResolvedValue(0);
    prisma.withdrawalRequest.findFirst.mockResolvedValue(null);
    const fresh = { createdAt: new Date() };
    const stale = { createdAt: new Date(Date.now() - 30 * 86_400_000) };
    prisma.withdrawalRequest.findMany.mockImplementation(async (args: { where?: { status?: string } }) =>
      args?.where?.status === 'PENDING' ? [fresh, stale] : [],
    );

    const res = await request(app).get('/api/v1/analytics/withdrawals').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.stalePendingCount).toBe(1);
    expect(res.body.data.stalePendingThresholdDays).toBe(14);
  });

  it('returns null (not a misleading number) for zero reviewed requests', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.withdrawalRequest.groupBy.mockResolvedValue([]);
    prisma.withdrawalRequest.count.mockResolvedValue(0);
    prisma.withdrawalRequest.findMany.mockResolvedValue([]);
    prisma.withdrawalRequest.findFirst.mockResolvedValue(null);

    const res = await request(app).get('/api/v1/analytics/withdrawals').set('Cookie', cookie);
    expect(res.body.data.averageProcessingHours).toBeNull();
    expect(res.body.data.reviewedCount).toBe(0);
  });
});

describe('GET /api/v1/analytics/organ-requests - deterministic KPI math', () => {
  it('aggregates by status, average processing time, and stale-pending threshold', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.organRequest.groupBy.mockImplementation(async (args: { by: string[] }) =>
      args.by.includes('hospitalId') ? [] : [{ status: 'PENDING', _count: { _all: 2 } }],
    );
    prisma.organRequest.count.mockResolvedValue(0);
    const base = new Date('2026-01-01T00:00:00Z').getTime();
    prisma.organRequest.findMany.mockImplementation(async (args: { where?: { status?: unknown } }) => {
      if (args?.where?.status && typeof args.where.status === 'object' && 'in' in (args.where.status as object)) {
        return [{ createdAt: new Date(base), reviewedAt: new Date(base + 10 * 3_600_000) }];
      }
      if (args?.where?.status === 'PENDING') {
        return [{ createdAt: new Date(Date.now() - 10 * 86_400_000) }];
      }
      return [];
    });
    prisma.organRequest.findFirst.mockResolvedValue(null);

    const res = await request(app).get('/api/v1/analytics/organ-requests').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.byStatus.PENDING).toBe(2);
    expect(res.body.data.averageProcessingHours).toBe(10);
    expect(res.body.data.stalePendingThresholdDays).toBe(7);
    expect(res.body.data.stalePendingCount).toBe(1);
  });
});

describe('Period comparison', () => {
  it('10 current vs 5 previous -> +100%', () => {
    expect(percentChange(10, 5)).toBe(100);
  });

  it('5 current vs 10 previous -> -50%', () => {
    expect(percentChange(5, 10)).toBe(-50);
  });

  it('0 vs 0 -> 0% (not null/NaN)', () => {
    expect(percentChange(0, 0)).toBe(0);
  });

  it('any current vs 0 previous -> null (undefined/infinite change)', () => {
    expect(percentChange(5, 0)).toBeNull();
  });

  it('GET /donors reports the same current/previous/percentChange math end to end', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.donor.groupBy.mockResolvedValue([]);
    prisma.donor.count.mockImplementation(async () => {
      // First call is the "current window" count, second is "previous window".
      const callIndex = prisma.donor.count.mock.calls.length;
      return callIndex === 1 ? 10 : 5;
    });

    const res = await request(app).get('/api/v1/analytics/donors').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.registrations).toEqual({ current: 10, previous: 5, percentChange: 100 });
  });
});

describe('Time window resolution', () => {
  it('"today" resolves to a 1-day UTC range', () => {
    const w = resolveWindow({ window: 'today' });
    const diffDays = (w.end.getTime() - w.start.getTime()) / 86_400_000;
    expect(diffDays).toBe(1);
  });

  it('"7d" spans exactly 7 days', () => {
    const w = resolveWindow({ window: '7d' });
    expect((w.end.getTime() - w.start.getTime()) / 86_400_000).toBe(7);
  });

  it('explicit from/to is used verbatim (inclusive end)', () => {
    const w = resolveWindow({ from: '2026-01-01', to: '2026-01-03' });
    expect(w.start.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(w.end.toISOString()).toBe('2026-01-04T00:00:00.000Z');
  });

  it('previousPeriod has the same duration as the original window, ending where it starts', () => {
    const w = resolveWindow({ window: '7d' });
    const prev = previousPeriod(w);
    expect(prev.end.getTime()).toBe(w.start.getTime());
    expect(prev.end.getTime() - prev.start.getTime()).toBe(w.end.getTime() - w.start.getTime());
  });
});

describe('GET /api/v1/analytics/organs', () => {
  it('low-availability organ type and zero-result groups both resolve to 0, not missing keys', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.organ.groupBy.mockImplementation(async (args: { by: string[]; where?: { status?: string } }) => {
      if (args.by.includes('hospitalId')) return [];
      if (args.where?.status === 'AVAILABLE') return [{ organType: 'CORNEA', _count: { _all: 1 } }];
      return [{ organType: 'CORNEA', _count: { _all: 1 } }];
    });

    const res = await request(app).get('/api/v1/analytics/organs').set('Cookie', cookie);
    expect(res.status).toBe(200);
    const kidney = res.body.data.byOrganType.find((t: { organType: string }) => t.organType === 'KIDNEY');
    expect(kidney).toEqual({ organType: 'KIDNEY', total: 0, available: 0 });
    expect(res.body.data.byHospital).toEqual([]);
  });
});

describe('GET /api/v1/analytics/hospitals', () => {
  it('a hospital with zero AVAILABLE organs is listed under zeroAvailabilityHospitals', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.hospital.count.mockResolvedValue(1);
    prisma.hospital.findMany.mockResolvedValue([{ id: 'h1', name: 'Empty Hospital', city: 'Mumbai', state: 'Maharashtra' }]);
    prisma.organ.groupBy.mockResolvedValue([{ hospitalId: 'h1', status: 'PENDING', _count: { _all: 2 } }]);

    const res = await request(app).get('/api/v1/analytics/hospitals').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.zeroAvailability).toBe(1);
    expect(res.body.data.zeroAvailabilityHospitals).toEqual([{ id: 'h1', name: 'Empty Hospital', city: 'Mumbai' }]);
  });
});
