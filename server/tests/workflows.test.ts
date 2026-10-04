import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { prisma as prismaClient } from '../src/lib/prisma';
import { adminUser, authCookie, donorUser } from './helpers/auth';
import type { PrismaMock } from './helpers/prisma-mock';

vi.mock('../src/lib/prisma', async () => {
  const { createPrismaMock } = await import('./helpers/prisma-mock');
  return { prisma: createPrismaMock() };
});

const prisma = prismaClient as unknown as PrismaMock;
const app = createApp();

const hospital = { id: 'h1', name: 'Demo General', city: 'Mangalore', state: null, address: '1 Rd', phone: '+91 555 010 0001', email: null };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('donor self-service', () => {
  it('PATCH /donors/me rejects the legacy "field" + "newvalue" shape', async () => {
    const cookie = authCookie(prisma, donorUser);
    const res = await request(app).patch('/api/v1/donors/me').set('Cookie', cookie).send({ field: 'Password', newvalue: 'x' });
    expect(res.status).toBe(400);
    expect(prisma.donor.update).not.toHaveBeenCalled();
  });

  it('PUT /donors/me/next-of-kin upserts for the signed-in donor only', async () => {
    const cookie = authCookie(prisma, donorUser);
    prisma.nextOfKin.upsert.mockResolvedValue({ name: 'Kin', phone: '+91 91234 56789', relationship: null });
    const res = await request(app).put('/api/v1/donors/me/next-of-kin').set('Cookie', cookie).send({ name: 'Kin', phone: '+91 91234 56789' });
    expect(res.status).toBe(200);
    expect(prisma.nextOfKin.upsert.mock.calls[0]![0].where).toEqual({ donorId: donorUser.donor.id });
  });

  it('POST /donors/me/organs creates a PENDING organ linked to an existing hospital', async () => {
    const cookie = authCookie(prisma, donorUser);
    prisma.donor.findUnique.mockResolvedValue({ status: 'ACTIVE' });
    prisma.hospital.findUnique.mockResolvedValue({ id: 'h1' });
    prisma.organ.create.mockResolvedValue({
      id: 'o1',
      organType: 'LIVER',
      otherOrganName: null,
      status: 'PENDING',
      procurementDate: new Date('2026-09-01T00:00:00Z'),
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      hospital,
    });
    const res = await request(app)
      .post('/api/v1/donors/me/organs')
      .set('Cookie', cookie)
      .send({ organType: 'LIVER', hospitalId: 'h1', procurementDate: '2026-09-01' });
    expect(res.status).toBe(201);
    expect(prisma.organ.create.mock.calls[0]![0].data).toMatchObject({ donorId: 'donor_1', hospitalId: 'h1', status: 'PENDING' });
  });

  it('rejects an organ for a hospital that does not exist (real FK, not free text)', async () => {
    const cookie = authCookie(prisma, donorUser);
    prisma.donor.findUnique.mockResolvedValue({ status: 'ACTIVE' });
    prisma.hospital.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/v1/donors/me/organs')
      .set('Cookie', cookie)
      .send({ organType: 'KIDNEY', hospitalId: 'KMC Manipal', procurementDate: '2026-09-01' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.fields[0].path).toBe('hospitalId');
  });

  it('withdrawn donors cannot add organs', async () => {
    const cookie = authCookie(prisma, donorUser);
    prisma.donor.findUnique.mockResolvedValue({ status: 'WITHDRAWN' });
    const res = await request(app)
      .post('/api/v1/donors/me/organs')
      .set('Cookie', cookie)
      .send({ organType: 'KIDNEY', hospitalId: 'h1', procurementDate: '2026-09-01' });
    expect(res.status).toBe(403);
  });
});

describe('withdrawal requests', () => {
  it('donor cannot submit a second request while one is pending', async () => {
    const cookie = authCookie(prisma, donorUser);
    prisma.donor.findUnique.mockResolvedValue({ status: 'ACTIVE' });
    prisma.withdrawalRequest.findFirst.mockResolvedValue({ id: 'w_existing' });
    const res = await request(app).post('/api/v1/withdrawals').set('Cookie', cookie).send({ reason: 'Changed my mind about this' });
    expect(res.status).toBe(409);
    expect(prisma.withdrawalRequest.create).not.toHaveBeenCalled();
  });

  it('admin approval withdraws the donor and takes their organs out of circulation', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.withdrawalRequest.findUnique.mockResolvedValue({ status: 'PENDING', donorId: 'donor_1' });
    prisma.withdrawalRequest.update.mockResolvedValue({
      id: 'w1',
      reason: 'Moving abroad permanently',
      status: 'APPROVED',
      adminNote: null,
      reviewedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      reviewedBy: { displayName: 'Test Admin' },
      donor: { id: 'donor_1', donorCode: 'DNTEST01', firstName: 'Test', lastName: 'Donor', status: 'WITHDRAWN', _count: { organs: 2 } },
    });

    const res = await request(app).patch('/api/v1/withdrawals/w1').set('Cookie', cookie).send({ status: 'APPROVED' });
    expect(res.status).toBe(200);
    expect(prisma.donor.update).toHaveBeenCalledWith({ where: { id: 'donor_1' }, data: { status: 'WITHDRAWN' } });
    expect(prisma.organ.updateMany).toHaveBeenCalledWith({
      where: { donorId: 'donor_1', status: { in: ['PENDING', 'AVAILABLE'] } },
      data: { status: 'UNAVAILABLE' },
    });
    expect(prisma.withdrawalRequest.update.mock.calls[0]![0].data).toMatchObject({ status: 'APPROVED', reviewedById: 'admin_1' });
  });

  it('a reviewed request cannot be reviewed again', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.withdrawalRequest.findUnique.mockResolvedValue({ status: 'REJECTED', donorId: 'donor_1' });
    const res = await request(app).patch('/api/v1/withdrawals/w1').set('Cookie', cookie).send({ status: 'APPROVED' });
    expect(res.status).toBe(409);
    expect(prisma.donor.update).not.toHaveBeenCalled();
  });
});

describe('admin donor & hospital management', () => {
  it('DELETE /donors/:id deletes the user (cascading to donor records)', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.donor.findUnique.mockResolvedValue({ userId: 'user_x' });
    prisma.user.delete.mockResolvedValue({});
    const res = await request(app).delete('/api/v1/donors/donor_x').set('Cookie', cookie);
    expect(res.status).toBe(204);
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user_x' } });
  });

  it('DELETE /donors/:id returns 404 for an unknown donor (legacy "No such username exists")', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.donor.findUnique.mockResolvedValue(null);
    const res = await request(app).delete('/api/v1/donors/missing').set('Cookie', cookie);
    expect(res.status).toBe(404);
  });

  it('admin creates an organ by Donor ID', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.donor.findUnique.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/v1/organs')
      .set('Cookie', cookie)
      .send({ donorCode: 'DNNOPE00', organType: 'HEART', hospitalId: 'h1', procurementDate: '2026-09-01' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.fields[0].path).toBe('donorCode');
  });

  it('a hospital with organ records cannot be deleted', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.hospital.findUnique.mockResolvedValue({ id: 'h1', _count: { organs: 3 } });
    const res = await request(app).delete('/api/v1/hospitals/h1').set('Cookie', cookie);
    expect(res.status).toBe(409);
    expect(prisma.hospital.delete).not.toHaveBeenCalled();
  });
});

describe('error handling', () => {
  it('unknown API routes return the error envelope', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('malformed JSON returns 400 instead of crashing', async () => {
    const res = await request(app).post('/api/v1/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('sets security headers', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
