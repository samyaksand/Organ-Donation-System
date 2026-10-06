import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { prisma as prismaClient } from '../src/lib/prisma';
import { adminUser, authCookie, donorUser } from './helpers/auth';
import type { PrismaMock } from './helpers/prisma-mock';

vi.mock('../src/lib/prisma', async () => {
  const { createPrismaMock } = await import('./helpers/prisma-mock.js');
  return { prisma: createPrismaMock() };
});

const prisma = prismaClient as unknown as PrismaMock;
const app = createApp();

const hospital = { id: 'h1', name: 'Demo General', city: 'Mangalore', state: null, address: '1 Rd', phone: '+91 555 010 0001', email: null };

const organRequestRow = {
  id: 'or1',
  status: 'PENDING',
  notes: null,
  declineReason: null,
  reviewedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  organ: {
    id: 'organ_1',
    organType: 'KIDNEY',
    otherOrganName: null,
    status: 'AVAILABLE',
    procurementDate: new Date('2026-01-01T00:00:00Z'),
    donor: { id: 'donor_1', donorCode: 'DNTEST01' },
  },
  hospital,
  requestedBy: { displayName: 'Test Admin' },
  reviewedBy: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('authorization', () => {
  it('DONOR is denied with 403', async () => {
    const cookie = authCookie(prisma, donorUser);
    const res = await request(app).get('/api/v1/organ-requests').set('Cookie', cookie);
    expect(res.status).toBe(403);
  });

  it('unauthenticated is rejected with 401', async () => {
    const res = await request(app).get('/api/v1/organ-requests');
    expect(res.status).toBe(401);
  });
});

describe('POST /organ-requests - creation', () => {
  it('creates a request for an AVAILABLE organ at a valid hospital', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.organ.findUnique.mockResolvedValue({ id: 'organ_1', status: 'AVAILABLE' });
    prisma.hospital.findUnique.mockResolvedValue({ id: 'h1' });
    prisma.organRequest.findFirst.mockResolvedValue(null);
    prisma.organRequest.create.mockResolvedValue(organRequestRow);

    const res = await request(app).post('/api/v1/organ-requests').set('Cookie', cookie).send({ organId: 'organ_1', hospitalId: 'h1' });
    expect(res.status).toBe(201);
    expect(prisma.organRequest.create.mock.calls[0]![0].data).toMatchObject({ organId: 'organ_1', hospitalId: 'h1', requestedById: 'admin_1' });
    expect(prisma.workflowEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ entityType: 'ORGAN_REQUEST', eventType: 'CREATED', toStatus: 'PENDING' }) }),
    );
  });

  it('rejects a request for an organ that does not exist', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.organ.findUnique.mockResolvedValue(null);
    const res = await request(app).post('/api/v1/organ-requests').set('Cookie', cookie).send({ organId: 'nope', hospitalId: 'h1' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.fields[0].path).toBe('organId');
    expect(prisma.organRequest.create).not.toHaveBeenCalled();
  });

  it('rejects a request for an organ that is not AVAILABLE', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.organ.findUnique.mockResolvedValue({ id: 'organ_1', status: 'PENDING' });
    const res = await request(app).post('/api/v1/organ-requests').set('Cookie', cookie).send({ organId: 'organ_1', hospitalId: 'h1' });
    expect(res.status).toBe(409);
    expect(prisma.organRequest.create).not.toHaveBeenCalled();
  });

  it('rejects a request for a hospital that does not exist', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.organ.findUnique.mockResolvedValue({ id: 'organ_1', status: 'AVAILABLE' });
    prisma.hospital.findUnique.mockResolvedValue(null);
    const res = await request(app).post('/api/v1/organ-requests').set('Cookie', cookie).send({ organId: 'organ_1', hospitalId: 'missing' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.fields[0].path).toBe('hospitalId');
  });

  it('rejects a duplicate active (PENDING) request for the same organ', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.organ.findUnique.mockResolvedValue({ id: 'organ_1', status: 'AVAILABLE' });
    prisma.hospital.findUnique.mockResolvedValue({ id: 'h1' });
    prisma.organRequest.findFirst.mockResolvedValue({ id: 'existing' });
    const res = await request(app).post('/api/v1/organ-requests').set('Cookie', cookie).send({ organId: 'organ_1', hospitalId: 'h1' });
    expect(res.status).toBe(409);
    expect(prisma.organRequest.create).not.toHaveBeenCalled();
  });
});

describe('PATCH /organ-requests/:id - review', () => {
  it('approval marks the organ UNAVAILABLE and records both WorkflowEvents', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.organRequest.findUnique.mockResolvedValue({ status: 'PENDING', organId: 'organ_1' });
    prisma.organ.findUnique.mockResolvedValue({ status: 'AVAILABLE' });
    prisma.organRequest.update.mockResolvedValue({ ...organRequestRow, status: 'APPROVED', organ: { ...organRequestRow.organ, status: 'UNAVAILABLE' } });

    const res = await request(app).patch('/api/v1/organ-requests/or1').set('Cookie', cookie).send({ status: 'APPROVED' });
    expect(res.status).toBe(200);
    expect(prisma.organ.update).toHaveBeenCalledWith({ where: { id: 'organ_1' }, data: { status: 'UNAVAILABLE' } });

    const eventCalls = prisma.workflowEvent.create.mock.calls.map((c) => c[0].data);
    expect(eventCalls).toContainEqual(
      expect.objectContaining({ entityType: 'ORGAN', entityId: 'organ_1', fromStatus: 'AVAILABLE', toStatus: 'UNAVAILABLE' }),
    );
    expect(eventCalls).toContainEqual(
      expect.objectContaining({ entityType: 'ORGAN_REQUEST', entityId: 'or1', fromStatus: 'PENDING', toStatus: 'APPROVED' }),
    );
  });

  it('decline requires a reason and never touches the organ', async () => {
    const cookie = authCookie(prisma, adminUser);
    const res = await request(app).patch('/api/v1/organ-requests/or1').set('Cookie', cookie).send({ status: 'DECLINED' });
    expect(res.status).toBe(400);
    expect(prisma.organRequest.findUnique).not.toHaveBeenCalled();
  });

  it('decline with a reason leaves organ status untouched', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.organRequest.findUnique.mockResolvedValue({ status: 'PENDING', organId: 'organ_1' });
    prisma.organRequest.update.mockResolvedValue({ ...organRequestRow, status: 'DECLINED', declineReason: 'Organ reassigned' });

    const res = await request(app)
      .patch('/api/v1/organ-requests/or1')
      .set('Cookie', cookie)
      .send({ status: 'DECLINED', declineReason: 'Organ reassigned' });
    expect(res.status).toBe(200);
    expect(prisma.organ.update).not.toHaveBeenCalled();
    expect(prisma.organ.findUnique).not.toHaveBeenCalled();
  });

  it('rejects approval when the organ is no longer AVAILABLE (race with another allocation)', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.organRequest.findUnique.mockResolvedValue({ status: 'PENDING', organId: 'organ_1' });
    prisma.organ.findUnique.mockResolvedValue({ status: 'UNAVAILABLE' });
    const res = await request(app).patch('/api/v1/organ-requests/or1').set('Cookie', cookie).send({ status: 'APPROVED' });
    expect(res.status).toBe(409);
    expect(prisma.organRequest.update).not.toHaveBeenCalled();
  });

  it('an already-reviewed request cannot be reviewed again', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.organRequest.findUnique.mockResolvedValue({ status: 'APPROVED', organId: 'organ_1' });
    const res = await request(app).patch('/api/v1/organ-requests/or1').set('Cookie', cookie).send({ status: 'APPROVED' });
    expect(res.status).toBe(409);
    expect(prisma.organ.update).not.toHaveBeenCalled();
  });
});

describe('PATCH /organ-requests/:id/cancel', () => {
  it('cancels a pending request without touching the organ', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.organRequest.findUnique.mockResolvedValue({ status: 'PENDING' });
    prisma.organRequest.update.mockResolvedValue({ ...organRequestRow, status: 'CANCELLED' });
    const res = await request(app).patch('/api/v1/organ-requests/or1/cancel').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(prisma.organ.update).not.toHaveBeenCalled();
  });

  it('cannot cancel an already-decided request', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.organRequest.findUnique.mockResolvedValue({ status: 'DECLINED' });
    const res = await request(app).patch('/api/v1/organ-requests/or1/cancel').set('Cookie', cookie);
    expect(res.status).toBe(409);
  });
});

describe('GET /organ-requests - list & filtering', () => {
  it('filters by status', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.organRequest.findMany.mockResolvedValue([organRequestRow]);
    prisma.organRequest.count.mockResolvedValue(1);
    const res = await request(app).get('/api/v1/organ-requests').query({ status: 'PENDING' }).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(prisma.organRequest.findMany.mock.calls[0]![0].where).toMatchObject({ status: 'PENDING' });
    expect(res.body.data[0].organ.donorCode).toBe('DNTEST01');
    // Mapper must never leak the donor's name/contact info in an organ request row.
    expect(res.body.data[0].organ).not.toHaveProperty('donor');
    expect(JSON.stringify(res.body.data[0])).not.toMatch(/firstName|lastName/);
  });

  it('GET /:id returns 404 for an unknown request', async () => {
    const cookie = authCookie(prisma, adminUser);
    prisma.organRequest.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/api/v1/organ-requests/missing').set('Cookie', cookie);
    expect(res.status).toBe(404);
  });
});
