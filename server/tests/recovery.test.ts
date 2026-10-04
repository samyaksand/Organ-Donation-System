import bcrypt from 'bcryptjs';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { prisma as prismaClient } from '../src/lib/prisma';
import { adminUser, authCookie, donorUser, superAdminUser } from './helpers/auth';
import type { PrismaMock } from './helpers/prisma-mock';

vi.mock('../src/lib/prisma', async () => {
  const { createPrismaMock } = await import('./helpers/prisma-mock.js');
  return { prisma: createPrismaMock() };
});

// Never run a real pg_dump/pg_restore in tests; only the service's own logic is under test.
vi.mock('../src/utils/pgTools', () => ({
  dumpDatabase: vi.fn(async () => ({ ok: true, message: 'Snapshot created' })),
  restoreDatabase: vi.fn(async () => ({ ok: true, message: 'Database restored from the known-good snapshot' })),
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, existsSync: vi.fn(), statSync: vi.fn() };
});

const prisma = prismaClient as unknown as PrismaMock;
const app = createApp();

let superAdminHash: string;
beforeAll(async () => {
  superAdminHash = await bcrypt.hash('Correct-horse1', 4);
});

beforeEach(() => {
  vi.clearAllMocks();
  prisma.user.update.mockResolvedValue({});
});

describe('SUPER_ADMIN authentication', () => {
  it('signs in through the same public "ADMIN" portal as a regular admin', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...superAdminUser, passwordHash: superAdminHash });
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: superAdminUser.email, password: 'Correct-horse1', portal: 'ADMIN' });
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ id: superAdminUser.id, role: 'SUPER_ADMIN' });
  });

  it('is rejected through the "DONOR" portal, just like a regular admin would be', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...superAdminUser, passwordHash: superAdminHash });
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: superAdminUser.email, password: 'Correct-horse1', portal: 'DONOR' });
    expect(res.status).toBe(401);
  });

  it('a SUPER_ADMIN session can also use ordinary admin endpoints (all ADMIN capabilities)', async () => {
    const cookie = authCookie(prisma, superAdminUser);
    prisma.donor.groupBy.mockResolvedValue([]);
    prisma.organ.groupBy.mockResolvedValue([]);
    prisma.hospital.count.mockResolvedValue(0);
    prisma.withdrawalRequest.count.mockResolvedValue(0);
    prisma.donor.findMany.mockResolvedValue([]);
    prisma.withdrawalRequest.findMany.mockResolvedValue([]);
    const res = await request(app).get('/api/v1/admin/overview').set('Cookie', cookie);
    expect(res.status).toBe(200);
  });
});

describe('System Recovery authorization', () => {
  it('SUPER_ADMIN can reach the recovery status endpoint', async () => {
    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ mtime: new Date() } as ReturnType<typeof fs.statSync>);
    prisma.donor.count.mockResolvedValue(20);
    prisma.organ.count.mockResolvedValue(28);
    prisma.hospital.count.mockResolvedValue(10);
    prisma.recoveryLog.findFirst.mockResolvedValue(null);

    const cookie = authCookie(prisma, superAdminUser);
    const res = await request(app).get('/api/v1/recovery/status').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.enabled).toBe(true);
  });

  it('ADMIN gets a 403, not the recovery data (same treatment as a donor)', async () => {
    const cookie = authCookie(prisma, adminUser);
    const res = await request(app).get('/api/v1/recovery/status').set('Cookie', cookie);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('DONOR gets a 403', async () => {
    const cookie = authCookie(prisma, donorUser);
    const res = await request(app).get('/api/v1/recovery/status').set('Cookie', cookie);
    expect(res.status).toBe(403);
  });

  it('ADMIN cannot trigger a restore', async () => {
    const cookie = authCookie(prisma, adminUser);
    const res = await request(app).post('/api/v1/recovery/restore').set('Cookie', cookie);
    expect(res.status).toBe(403);
    expect(prisma.recoveryLog.create).not.toHaveBeenCalled();
  });

  it('DONOR cannot trigger a restore', async () => {
    const cookie = authCookie(prisma, donorUser);
    const res = await request(app).post('/api/v1/recovery/restore').set('Cookie', cookie);
    expect(res.status).toBe(403);
    expect(prisma.recoveryLog.create).not.toHaveBeenCalled();
  });

  it('an unauthenticated request is rejected before any recovery logic runs', async () => {
    const res = await request(app).post('/api/v1/recovery/restore');
    expect(res.status).toBe(401);
    expect(prisma.recoveryLog.create).not.toHaveBeenCalled();
  });
});

describe('System Recovery restore flow', () => {
  it('SUPER_ADMIN can restore when a snapshot exists, and it is audit logged', async () => {
    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReturnValue(true);
    prisma.recoveryLog.create.mockResolvedValue({ id: 'log_1' });

    const cookie = authCookie(prisma, superAdminUser);
    const res = await request(app).post('/api/v1/recovery/restore').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(true);

    // Audit log: who, when, success/failure — written once, after the restore attempt finishes
    // (never before: pg_restore recreates recovery_logs itself, so a pre-restore row would be
    // wiped out by the very operation it is meant to record).
    expect(prisma.recoveryLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        initiatedBy: superAdminUser.id,
        initiatorEmail: superAdminUser.email,
        status: 'SUCCEEDED',
        startedAt: expect.any(Date),
        finishedAt: expect.any(Date),
      }),
    });
  });

  it('refuses to restore when no snapshot exists yet', async () => {
    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const cookie = authCookie(prisma, superAdminUser);
    const res = await request(app).post('/api/v1/recovery/restore').set('Cookie', cookie);

    expect(res.status).toBe(409);
    expect(prisma.recoveryLog.create).not.toHaveBeenCalled();
  });

  it('records a FAILED outcome when pg_restore itself fails, without leaking its error output', async () => {
    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReturnValue(true);
    prisma.recoveryLog.create.mockResolvedValue({ id: 'log_2' });

    const pgTools = await import('../src/utils/pgTools.js');
    vi.mocked(pgTools.restoreDatabase).mockResolvedValueOnce({
      ok: false,
      message: 'pg_restore failed. Check server logs on the database host, not the application logs.',
    });

    const cookie = authCookie(prisma, superAdminUser);
    const res = await request(app).post('/api/v1/recovery/restore').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(false);
    // The response and the stored log message are both the fixed, safe string: no stdout/stderr,
    // no connection string, no file path ever reaches either.
    expect(res.body.data.message).not.toMatch(/postgres(ql)?:\/\//i);
    expect(prisma.recoveryLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: 'FAILED' }),
    });
  });

  it('still returns the real restore result even if writing the audit log itself fails', async () => {
    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReturnValue(true);
    prisma.recoveryLog.create.mockRejectedValue(new Error('recovery_logs table temporarily unavailable'));

    const cookie = authCookie(prisma, superAdminUser);
    const res = await request(app).post('/api/v1/recovery/restore').set('Cookie', cookie);

    // The restore itself (mocked as successful) is reported correctly; a broken audit write is a
    // secondary concern and must not be surfaced as a restore failure to the Super Admin.
    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(true);
  });
});

describe('Recovery response never exposes internals', () => {
  it('the status payload never contains a connection string, file path, or raw SQL', async () => {
    const fs = await import('node:fs');
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ mtime: new Date() } as ReturnType<typeof fs.statSync>);
    prisma.donor.count.mockResolvedValue(1);
    prisma.organ.count.mockResolvedValue(1);
    prisma.hospital.count.mockResolvedValue(1);
    prisma.recoveryLog.findFirst.mockResolvedValue(null);

    const cookie = authCookie(prisma, superAdminUser);
    const res = await request(app).get('/api/v1/recovery/status').set('Cookie', cookie);

    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toMatch(/postgres(ql)?:\/\//i);
    expect(serialized.toLowerCase()).not.toContain('password');
    expect(serialized).not.toMatch(/backups[\\/]/);
  });
});
