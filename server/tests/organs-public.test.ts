import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { prisma as prismaClient } from '../src/lib/prisma';
import { toPublicOrgan } from '../src/services/mappers';
import type { PrismaMock } from './helpers/prisma-mock';

vi.mock('../src/lib/prisma', async () => {
  const { createPrismaMock } = await import('./helpers/prisma-mock.js');
  return { prisma: createPrismaMock() };
});

const prisma = prismaClient as unknown as PrismaMock;
const app = createApp();

const hospital = {
  id: 'h1',
  name: 'Demo General',
  city: 'Mangalore',
  state: 'Karnataka',
  address: '1 Demo Rd',
  phone: '+91 555 010 0001',
  email: null,
};

const row = {
  id: 'o1',
  organType: 'KIDNEY',
  otherOrganName: null,
  status: 'AVAILABLE',
  procurementDate: new Date('2026-08-14T00:00:00Z'),
  hospital,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/v1/organs/availability (public)', () => {
  it('returns hospital + organ info and no donor data', async () => {
    prisma.organ.findMany.mockResolvedValue([row]);
    prisma.organ.count.mockResolvedValue(1);

    const res = await request(app).get('/api/v1/organs/availability').query({ organType: 'KIDNEY', city: 'mangalore' });
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 1, pageSize: 10, total: 1, totalPages: 1 });
    expect(res.body.data[0]).toEqual({
      id: 'o1',
      organType: 'KIDNEY',
      otherOrganName: null,
      status: 'AVAILABLE',
      procurementDate: '2026-08-14',
      hospital,
    });
    expect(JSON.stringify(res.body)).not.toMatch(/donor/i);

    // The query must not select any donor relation and must default to AVAILABLE only.
    const args = prisma.organ.findMany.mock.calls[0]![0];
    expect(args.select.donor).toBeUndefined();
    expect(args.where).toMatchObject({
      status: 'AVAILABLE',
      organType: 'KIDNEY',
      hospital: { city: { contains: 'mangalore', mode: 'insensitive' } },
    });
  });

  it('"ALL" still excludes unverified (PENDING) organs', async () => {
    prisma.organ.findMany.mockResolvedValue([]);
    prisma.organ.count.mockResolvedValue(0);
    await request(app).get('/api/v1/organs/availability').query({ availability: 'ALL' });
    expect(prisma.organ.findMany.mock.calls[0]![0].where.status).toEqual({ in: ['AVAILABLE', 'UNAVAILABLE'] });
  });

  it('rejects unknown organ types and PENDING availability', async () => {
    expect((await request(app).get('/api/v1/organs/availability').query({ organType: 'BRAIN' })).status).toBe(400);
    expect((await request(app).get('/api/v1/organs/availability').query({ availability: 'PENDING' })).status).toBe(400);
  });

  it('mapper drops donor fields even if a query accidentally includes them', () => {
    const leaky = { ...row, donor: { firstName: 'Secret', phone: '123' } } as unknown as Parameters<typeof toPublicOrgan>[0];
    expect(toPublicOrgan(leaky)).not.toHaveProperty('donor');
  });
});

describe('GET /api/v1/organs/availability/summary', () => {
  it('reports real counts and zeros for types with no organs', async () => {
    prisma.organ.groupBy.mockResolvedValue([{ organType: 'KIDNEY', _count: { _all: 2 } }]);
    prisma.hospital.count.mockResolvedValueOnce(1).mockResolvedValueOnce(3);
    const res = await request(app).get('/api/v1/organs/availability/summary');
    expect(res.status).toBe(200);
    expect(res.body.data.totalAvailable).toBe(2);
    expect(res.body.data.hospitalsWithAvailability).toBe(1);
    expect(res.body.data.hospitalCount).toBe(3);
    expect(res.body.data.byType).toHaveLength(7);
    expect(res.body.data.byType.find((t: { organType: string }) => t.organType === 'HEART').available).toBe(0);
  });
});
