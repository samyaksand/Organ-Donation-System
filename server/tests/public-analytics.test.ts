import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { prisma as prismaClient } from '../src/lib/prisma';
import type { PrismaMock } from './helpers/prisma-mock';

vi.mock('../src/lib/prisma', async () => {
  const { createPrismaMock } = await import('./helpers/prisma-mock.js');
  return { prisma: createPrismaMock() };
});

const prisma = prismaClient as unknown as PrismaMock;
const app = createApp();

beforeEach(() => {
  vi.clearAllMocks();
  prisma.donor.groupBy.mockResolvedValue([]);
  prisma.organ.groupBy.mockResolvedValue([]);
  prisma.withdrawalRequest.groupBy.mockResolvedValue([]);
  prisma.organRequest.groupBy.mockResolvedValue([]);
  prisma.hospital.count.mockResolvedValue(0);
  prisma.hospital.findMany.mockResolvedValue([]);
  prisma.donor.count.mockResolvedValue(0);
  prisma.donor.findMany.mockResolvedValue([]);
  prisma.organ.findMany.mockResolvedValue([]);
  prisma.withdrawalRequest.count.mockResolvedValue(0);
  prisma.withdrawalRequest.findMany.mockResolvedValue([]);
  prisma.withdrawalRequest.findFirst.mockResolvedValue(null);
  prisma.organRequest.count.mockResolvedValue(0);
  prisma.organRequest.findMany.mockResolvedValue([]);
  prisma.organRequest.findFirst.mockResolvedValue(null);
});

describe('GET /api/v1/public/analytics/* - no authentication required', () => {
  it.each(['overview', 'organs', 'hospitals', 'concentration', 'trends', 'breaches'])(
    '%s is reachable with no cookie at all',
    async (path) => {
      const res = await request(app).get(`/api/v1/public/analytics/${path}`);
      expect(res.status).toBe(200);
    },
  );
});

describe('GET /api/v1/public/analytics/overview - aggregate-only response shape', () => {
  it('never includes donor/withdrawal/organ-request detail, only organs + hospitals', async () => {
    const res = await request(app).get('/api/v1/public/analytics/overview');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('organs');
    expect(res.body.data).toHaveProperty('hospitals');
    expect(res.body.data).not.toHaveProperty('donors');
    expect(res.body.data).not.toHaveProperty('withdrawals');
    expect(res.body.data).not.toHaveProperty('organRequests');
  });
});

describe('GET /api/v1/public/analytics/hospitals - no individual donor/organ identifiers', () => {
  it('only returns hospital-level aggregates', async () => {
    prisma.hospital.count.mockResolvedValue(1);
    prisma.hospital.findMany.mockResolvedValue([{ id: 'h1', name: 'Test Hospital', city: 'Mumbai', state: 'MH' }]);
    prisma.organ.groupBy.mockResolvedValue([{ hospitalId: 'h1', status: 'AVAILABLE', _count: { _all: 3 } }]);

    const res = await request(app).get('/api/v1/public/analytics/hospitals');
    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/donorCode|firstName|lastName|medicalConditions|phone|address/i);
  });
});

describe('GET /api/v1/public/analytics/trends - organ registrations only', () => {
  it('never returns donor/withdrawal/organ-request trend series', async () => {
    const res = await request(app).get('/api/v1/public/analytics/trends');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('organRegistrations');
    expect(res.body.data).not.toHaveProperty('donorRegistrations');
    expect(res.body.data).not.toHaveProperty('withdrawalRequests');
    expect(res.body.data).not.toHaveProperty('organRequests');
  });
});

describe('Public analytics input validation', () => {
  it('rejects conflicting window + from/to on trends, same as the admin endpoint', async () => {
    const res = await request(app)
      .get('/api/v1/public/analytics/trends')
      .query({ window: '30d', from: '2026-01-01', to: '2026-01-31' });
    expect(res.status).toBe(400);
  });
});

describe('Public analytics rate limit - realistic browsing volume', () => {
  it('several repeated page loads (6 parallel requests each) do not trip the rate limit', async () => {
    const endpoints = ['overview', 'organs', 'hospitals', 'concentration', 'trends', 'breaches'];
    // Simulate 5 page loads/reloads of the public Analytics page (30 requests total) - this
    // regression-tests the PUBLIC_RATE_LIMIT_MAX default actually being generous enough for
    // normal browsing, not just a single page view (see config/env.ts for the real default).
    for (let page = 0; page < 5; page++) {
      const responses = await Promise.all(endpoints.map((ep) => request(app).get(`/api/v1/public/analytics/${ep}`)));
      for (const res of responses) expect(res.status).toBe(200);
    }
  });
});
