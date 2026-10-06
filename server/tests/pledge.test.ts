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
});

const validBody = {
  fullName: 'Asha Verma',
  email: 'asha@example.com',
  city: 'Mumbai',
  organPreference: 'KIDNEY',
  consent: true,
};

describe('POST /api/v1/pledges - no authentication required', () => {
  it('reachable with no cookie at all', async () => {
    prisma.pledge.create.mockResolvedValue({
      id: 'p1',
      referenceId: 'PLG-ABCD1234',
      fullName: 'Asha Verma',
      email: 'asha@example.com',
      city: 'Mumbai',
      organPreference: 'KIDNEY',
      consentedAt: new Date(),
      createdAt: new Date(),
    });
    const res = await request(app).post('/api/v1/pledges').send(validBody);
    expect(res.status).toBe(201);
  });
});

describe('POST /api/v1/pledges - validation', () => {
  it('rejects a missing consent flag', async () => {
    const { consent: _consent, ...withoutConsent } = validBody;
    const res = await request(app).post('/api/v1/pledges').send(withoutConsent);
    expect(res.status).toBe(400);
    expect(prisma.pledge.create).not.toHaveBeenCalled();
  });

  it('rejects consent: false (must be exactly true)', async () => {
    const res = await request(app).post('/api/v1/pledges').send({ ...validBody, consent: false });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid email', async () => {
    const res = await request(app).post('/api/v1/pledges').send({ ...validBody, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid organPreference', async () => {
    const res = await request(app).post('/api/v1/pledges').send({ ...validBody, organPreference: 'BRAIN' });
    expect(res.status).toBe(400);
  });

  it('rejects unknown fields (strict schema) - e.g. an attempt to pass medical/ID fields', async () => {
    const res = await request(app)
      .post('/api/v1/pledges')
      .send({ ...validBody, aadhaarNumber: '123456789012', bloodType: 'O_POS' });
    expect(res.status).toBe(400);
    expect(prisma.pledge.create).not.toHaveBeenCalled();
  });

  it('rejects an empty full name', async () => {
    const res = await request(app).post('/api/v1/pledges').send({ ...validBody, fullName: '' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/pledges - creation never touches User/Donor', () => {
  it('only writes to the Pledge table, never User or Donor', async () => {
    prisma.pledge.create.mockResolvedValue({
      id: 'p1',
      referenceId: 'PLG-ABCD1234',
      fullName: 'Asha Verma',
      email: 'asha@example.com',
      city: 'Mumbai',
      organPreference: 'KIDNEY',
      consentedAt: new Date(),
      createdAt: new Date(),
    });
    const res = await request(app).post('/api/v1/pledges').send(validBody);
    expect(res.status).toBe(201);
    expect(prisma.pledge.create).toHaveBeenCalledTimes(1);
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.donor.create).not.toHaveBeenCalled();
  });

  it('the stored record contains no medical/next-of-kin/government-ID fields', async () => {
    let storedData: Record<string, unknown> | undefined;
    prisma.pledge.create.mockImplementation(async (args: { data: Record<string, unknown> }) => {
      storedData = args.data;
      return { id: 'p1', referenceId: 'PLG-ABCD1234', createdAt: new Date(), consentedAt: new Date(), ...args.data };
    });
    await request(app).post('/api/v1/pledges').send(validBody);
    expect(Object.keys(storedData!).sort()).toEqual(['city', 'consentedAt', 'email', 'fullName', 'organPreference', 'referenceId'].sort());
  });
});

describe('Reference ID format', () => {
  it('generates a PLG-XXXXXXXX reference id', async () => {
    let generatedId = '';
    prisma.pledge.create.mockImplementation(async (args: { data: { referenceId: string } }) => {
      generatedId = args.data.referenceId;
      return { id: 'p1', createdAt: new Date(), consentedAt: new Date(), ...args.data };
    });
    await request(app).post('/api/v1/pledges').send(validBody);
    expect(generatedId).toMatch(/^PLG-[A-Z0-9]{8}$/);
  });
});

describe('GET /api/v1/pledges/:referenceId/certificate', () => {
  it('returns a PDF for a valid reference id, no authentication required', async () => {
    prisma.pledge.findUnique.mockResolvedValue({
      id: 'p1',
      referenceId: 'PLG-ABCD1234',
      fullName: 'Asha Verma',
      email: 'asha@example.com',
      city: 'Mumbai',
      organPreference: 'KIDNEY',
      consentedAt: new Date(),
      createdAt: new Date(),
    });
    const res = await request(app).get('/api/v1/pledges/PLG-ABCD1234/certificate');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('PLG-ABCD1234');
  });

  it('returns 404 for an unknown reference id', async () => {
    prisma.pledge.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/api/v1/pledges/PLG-ZZZZ9999/certificate');
    expect(res.status).toBe(404);
  });

  it('rejects a malformed reference id before hitting the database', async () => {
    const res = await request(app).get('/api/v1/pledges/not-a-valid-id/certificate');
    expect(res.status).toBe(400);
    expect(prisma.pledge.findUnique).not.toHaveBeenCalled();
  });

  it('never includes the pledger email in the certificate response headers', async () => {
    prisma.pledge.findUnique.mockResolvedValue({
      id: 'p1',
      referenceId: 'PLG-ABCD1234',
      fullName: 'Asha Verma',
      email: 'secret-email@example.com',
      city: 'Mumbai',
      organPreference: 'KIDNEY',
      consentedAt: new Date(),
      createdAt: new Date(),
    });
    const res = await request(app).get('/api/v1/pledges/PLG-ABCD1234/certificate');
    expect(JSON.stringify(res.headers)).not.toContain('secret-email@example.com');
  });
});
