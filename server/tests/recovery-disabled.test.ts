import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { authCookie, superAdminUser } from './helpers/auth';
import type { PrismaMock } from './helpers/prisma-mock';

vi.mock('../src/lib/prisma', async () => {
  const { createPrismaMock } = await import('./helpers/prisma-mock.js');
  return { prisma: createPrismaMock() };
});

const fsMocks = { existsSync: vi.fn(), statSync: vi.fn() };
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, existsSync: fsMocks.existsSync, statSync: fsMocks.statSync };
});

// `config/env.ts` reads `process.env` once, the moment it is first imported, and the rest of
// this suite (loaded via other test files in the same worker, or even just via the static
// `vi.mock('../src/lib/prisma', ...)` above pulling in its own module graph) can cause it to be
// evaluated with DEMO_RECOVERY_ENABLED=true (set globally in vitest.config.mts) before this
// file's test body ever runs. Setting `process.env` at that point is too late. Mocking the env
// module directly is the reliable way to exercise the "disabled" branch.
vi.mock('../src/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/config/env.js')>();
  return { env: { ...actual.env, DEMO_RECOVERY_ENABLED: false } };
});

let prisma: PrismaMock;
let app: Express;

beforeAll(async () => {
  prisma = (await import('../src/lib/prisma.js')).prisma as unknown as PrismaMock;
  const { createApp } = await import('../src/app.js');
  app = createApp();
});

describe('System Recovery when DEMO_RECOVERY_ENABLED=false', () => {
  it('status reports disabled without touching the filesystem or running extra queries', async () => {
    const cookie = authCookie(prisma, superAdminUser);
    const res = await request(app).get('/api/v1/recovery/status').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      enabled: false,
      snapshot: { available: false, createdAt: null },
      currentState: null,
      lastRecovery: null,
    });
    expect(fsMocks.existsSync).not.toHaveBeenCalled();
    expect(prisma.donor.count).not.toHaveBeenCalled();
    expect(prisma.recoveryLog.findFirst).not.toHaveBeenCalled();
  });

  it('restore is refused even for SUPER_ADMIN, before touching the snapshot or the database', async () => {
    const cookie = authCookie(prisma, superAdminUser);
    const res = await request(app).post('/api/v1/recovery/restore').set('Cookie', cookie);

    expect(res.status).toBe(403);
    expect(fsMocks.existsSync).not.toHaveBeenCalled();
    expect(prisma.recoveryLog.create).not.toHaveBeenCalled();
  });
});
