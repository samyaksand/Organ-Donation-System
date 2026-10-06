import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runInvestigation } from '../src/agent/agent';
import { createApp } from '../src/app';
import { prisma as prismaClient } from '../src/lib/prisma';
import { adminUser, authCookie, donorUser } from './helpers/auth';
import type { PrismaMock } from './helpers/prisma-mock';

vi.mock('../src/lib/prisma', async () => {
  const { createPrismaMock } = await import('./helpers/prisma-mock.js');
  return { prisma: createPrismaMock() };
});

// Mock the LangGraph agent boundary itself: these tests cover the HTTP layer (auth, validation,
// error mapping, rate limiting), not live model behavior. Tool-level determinism is covered in
// agent-tools.test.ts against the Prisma mock directly.
vi.mock('../src/agent/agent', () => ({ runInvestigation: vi.fn() }));

const prisma = prismaClient as unknown as PrismaMock;
const app = createApp();
const mockedRunInvestigation = vi.mocked(runInvestigation);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/v1/agent/investigate - authorization', () => {
  it('unauthenticated is rejected with 401', async () => {
    const res = await request(app).post('/api/v1/agent/investigate').send({});
    expect(res.status).toBe(401);
  });

  it('DONOR is denied with 403, not a narrower error', async () => {
    const cookie = authCookie(prisma, donorUser);
    const res = await request(app).post('/api/v1/agent/investigate').set('Cookie', cookie).send({});
    expect(res.status).toBe(403);
  });

  it('ADMIN is allowed through to the agent', async () => {
    mockedRunInvestigation.mockResolvedValue({
      ok: true,
      result: { summary: 'No issues found.', findings: [], toolsUsed: ['getOverviewMetrics'], insufficientEvidence: false },
      generatedAt: new Date().toISOString(),
    });
    const cookie = authCookie(prisma, adminUser);
    const res = await request(app).post('/api/v1/agent/investigate').set('Cookie', cookie).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.summary).toBe('No issues found.');
  });
});

describe('POST /api/v1/agent/investigate - input validation', () => {
  it('rejects a question over the length limit', async () => {
    const cookie = authCookie(prisma, adminUser);
    const res = await request(app)
      .post('/api/v1/agent/investigate')
      .set('Cookie', cookie)
      .send({ question: 'x'.repeat(501) });
    expect(res.status).toBe(400);
  });

  it('rejects unknown fields (strict schema)', async () => {
    const cookie = authCookie(prisma, adminUser);
    const res = await request(app).post('/api/v1/agent/investigate').set('Cookie', cookie).send({ question: 'ok', sql: 'DROP TABLE donors' });
    expect(res.status).toBe(400);
  });

  it('accepts an empty body (general "analyze operations" mode)', async () => {
    mockedRunInvestigation.mockResolvedValue({
      ok: true,
      result: { summary: 'ok', findings: [], toolsUsed: [], insufficientEvidence: false },
      generatedAt: new Date().toISOString(),
    });
    const cookie = authCookie(prisma, adminUser);
    const res = await request(app).post('/api/v1/agent/investigate').set('Cookie', cookie).send({});
    expect(res.status).toBe(200);
  });
});

describe('POST /api/v1/agent/investigate - failure handling', () => {
  it('reports 503 when no provider is configured/available, without exposing internals', async () => {
    mockedRunInvestigation.mockResolvedValue({ ok: false, reason: 'NO_PROVIDER' });
    const cookie = authCookie(prisma, adminUser);
    const res = await request(app).post('/api/v1/agent/investigate').set('Cookie', cookie).send({});
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('reports 502 for malformed/unvalidated model output rather than passing it through', async () => {
    mockedRunInvestigation.mockResolvedValue({ ok: false, reason: 'MALFORMED_OUTPUT' });
    const cookie = authCookie(prisma, adminUser);
    const res = await request(app).post('/api/v1/agent/investigate').set('Cookie', cookie).send({});
    expect(res.status).toBe(502);
  });

  it('reports 502 on an unexpected agent error rather than crashing the request', async () => {
    mockedRunInvestigation.mockResolvedValue({ ok: false, reason: 'AGENT_ERROR' });
    const cookie = authCookie(prisma, adminUser);
    const res = await request(app).post('/api/v1/agent/investigate').set('Cookie', cookie).send({});
    expect(res.status).toBe(502);
  });

  it('passes through an insufficient-evidence result as a normal 200, not an error', async () => {
    mockedRunInvestigation.mockResolvedValue({
      ok: true,
      result: { summary: 'Insufficient evidence to determine the cause.', findings: [], toolsUsed: ['getOrganRequestMetrics'], insufficientEvidence: true },
      generatedAt: new Date().toISOString(),
    });
    const cookie = authCookie(prisma, adminUser);
    const res = await request(app).post('/api/v1/agent/investigate').set('Cookie', cookie).send({ question: 'Why did organ type X disappear?' });
    expect(res.status).toBe(200);
    expect(res.body.data.insufficientEvidence).toBe(true);
    expect(res.body.data.findings).toEqual([]);
  });
});
