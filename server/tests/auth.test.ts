import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
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

let donorHash: string;
beforeAll(async () => {
  donorHash = await bcrypt.hash('Correct-horse1', 4);
});

beforeEach(() => {
  vi.clearAllMocks();
  prisma.user.update.mockResolvedValue({});
  // Session creation (see services/session.service.ts's createSession, called by every login/
  // register) needs a UserSession row to exist before it can be "updated" with the real token
  // hash - a plain id is enough for these HTTP-layer tests, which don't assert on session rows.
  prisma.userSession.create.mockResolvedValue({ id: 'session_1' });
  prisma.userSession.update.mockResolvedValue({});
});

function cookieHeader(res: request.Response): string {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  return raw?.find((c) => c.startsWith('ods_token=')) ?? '';
}

describe('POST /api/v1/auth/login', () => {
  it('rejects a malformed body with a 400 validation envelope', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.fields.map((f: { path: string }) => f.path)).toEqual(expect.arrayContaining(['email', 'password']));
  });

  it('returns 401 INVALID_CREDENTIALS for an unknown email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'nobody@example.com', password: 'whatever1' });
    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
  });

  it('returns the same 401 for a wrong password (no account enumeration)', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...donorUser, passwordHash: donorHash });
    const res = await request(app).post('/api/v1/auth/login').send({ email: donorUser.email, password: 'Wrong-pass1' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('signs in with valid credentials, sets a secure httpOnly cookie and never returns the hash', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...donorUser, passwordHash: donorHash });
    const res = await request(app).post('/api/v1/auth/login').send({ email: donorUser.email, password: 'Correct-horse1', portal: 'DONOR' });
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ id: donorUser.id, role: 'DONOR' });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    const cookie = cookieHeader(res);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { lastLoginAt: expect.any(Date) } }));
  });

  it('treats signing in through the wrong portal as invalid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...adminUser, passwordHash: donorHash });
    const res = await request(app).post('/api/v1/auth/login').send({ email: adminUser.email, password: 'Correct-horse1', portal: 'DONOR' });
    expect(res.status).toBe(401);
  });

  it('no longer accepts a plaintext admin password (legacy bug)', async () => {
    // Legacy app compared `password === results[0].Password`. A plaintext value in the hash column must not work.
    prisma.user.findUnique.mockResolvedValue({ ...adminUser, passwordHash: 'admin123' });
    const res = await request(app).post('/api/v1/auth/login').send({ email: adminUser.email, password: 'admin123', portal: 'ADMIN' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/register', () => {
  const valid = {
    email: 'new@example.com',
    password: 'Str0ngpass',
    confirmPassword: 'Str0ngpass',
    firstName: 'Ana',
    lastName: 'Lee',
    gender: 'FEMALE',
    dateOfBirth: '1990-05-01',
    phone: '+91 98765 43210',
    address: '1 Main Road',
    city: 'Mangalore',
    state: 'Karnataka',
    nextOfKin: { name: 'Sam Lee', phone: '+91 91234 56789' },
  };

  it('rejects mismatched passwords', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ ...valid, confirmPassword: 'different1' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.fields).toEqual(expect.arrayContaining([expect.objectContaining({ path: 'confirmPassword' })]));
  });

  it('rejects unknown fields such as role escalation attempts', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ ...valid, role: 'ADMIN' });
    expect(res.status).toBe(400);
  });

  it('returns 409 when the email is already registered', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing' });
    const res = await request(app).post('/api/v1/auth/register').send(valid);
    expect(res.status).toBe(409);
    expect(res.body.error.details.fields[0].path).toBe('email');
  });

  it('creates User + Donor + NextOfKin with a bcrypt hash and DN donor code', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(async (args: { data: Record<string, unknown> }) => ({
      id: 'u_new',
      email: valid.email,
      role: 'DONOR',
      donor: { id: 'd_new', donorCode: 'DNABCDEF', firstName: 'Ana', lastName: 'Lee', status: 'ACTIVE' },
      admin: null,
      _args: args,
    }));
    const res = await request(app).post('/api/v1/auth/register').send(valid);
    expect(res.status).toBe(201);
    expect(cookieHeader(res)).toMatch(/HttpOnly/i);

    const data = prisma.user.create.mock.calls[0]![0].data;
    expect(data.role).toBe('DONOR');
    expect(data.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(data.passwordHash).not.toContain(valid.password);
    expect(data.donor.create.donorCode).toMatch(/^DN[2-9A-HJKMNP-Z]{6}$/);
    expect(data.donor.create.nextOfKin.create).toMatchObject({ name: 'Sam Lee' });
  });
});

describe('session & role-based access', () => {
  it('GET /auth/me without a cookie returns 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a token signed with another secret', async () => {
    const forged = jwt.sign({ role: 'ADMIN' }, 'some-other-secret-that-is-long-enough!!', { subject: adminUser.id });
    const res = await request(app).get('/api/v1/auth/me').set('Cookie', `ods_token=${forged}`);
    expect(res.status).toBe(401);
  });

  it('rejects a valid token whose user no longer exists', async () => {
    const cookie = authCookie(prisma, donorUser);
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(401);
  });

  it('returns the session user for a valid cookie', async () => {
    const cookie = authCookie(prisma, donorUser);
    const res = await request(app).get('/api/v1/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.user.donor.donorCode).toBe('DNTEST01');
  });

  it('forbids donors from admin endpoints (403)', async () => {
    const cookie = authCookie(prisma, donorUser);
    for (const path of ['/api/v1/admin/overview', '/api/v1/donors', '/api/v1/organs', '/api/v1/withdrawals']) {
      const res = await request(app).get(path).set('Cookie', cookie);
      expect(res.status, path).toBe(403);
    }
    const del = await request(app).delete('/api/v1/donors/donor_2').set('Cookie', cookie);
    expect(del.status).toBe(403);
  });

  it('forbids admins from donor self-service endpoints (403)', async () => {
    const cookie = authCookie(prisma, adminUser);
    const res = await request(app).get('/api/v1/donors/me').set('Cookie', cookie);
    expect(res.status).toBe(403);
  });

  it('POST /auth/logout clears the cookie', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(204);
    expect(cookieHeader(res)).toMatch(/ods_token=;/);
  });
});

describe('PATCH /api/v1/auth/password', () => {
  it('requires the correct current password', async () => {
    const cookie = authCookie(prisma, donorUser);
    const base = prisma.user.findUnique.getMockImplementation()!;
    prisma.user.findUnique.mockImplementation(async (args: { where: { id?: string }; select?: Record<string, unknown> }) =>
      args.select && 'passwordHash' in args.select ? { passwordHash: donorHash } : base(args),
    );
    const res = await request(app)
      .patch('/api/v1/auth/password')
      .set('Cookie', cookie)
      .send({ currentPassword: 'Wrong-pass1', newPassword: 'NewPass123', confirmPassword: 'NewPass123' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.fields[0].path).toBe('currentPassword');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
