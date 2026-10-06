import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runPublicInvestigation } from '../src/agent/agent';
import { PUBLIC_TOOLS } from '../src/agent/publicTools';
import { ADMIN_TOOLS } from '../src/agent/tools';
import { createApp } from '../src/app';

vi.mock('../src/lib/prisma', async () => {
  const { createPrismaMock } = await import('./helpers/prisma-mock.js');
  return { prisma: createPrismaMock() };
});

vi.mock('../src/agent/agent', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/agent/agent')>();
  return { ...actual, runPublicInvestigation: vi.fn() };
});

const app = createApp();
const mockedRun = vi.mocked(runPublicInvestigation);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('agent/publicTools.ts - tool isolation from admin tools', () => {
  it('PUBLIC_TOOLS contains none of the admin-only tool names', () => {
    const adminNames = new Set<string>(ADMIN_TOOLS.map((t) => t.name));
    const publicNames: string[] = PUBLIC_TOOLS.map((t) => t.name);
    for (const name of publicNames) {
      // Public tools are entirely separate implementations, not a filtered admin list - assert
      // they share no name with an admin tool, and specifically none of the sensitive ones.
      expect(adminNames.has(name)).toBe(false);
    }
    const forbidden = ['getPendingRequests', 'getWorkflowHistory', 'getHospitalRequestPerformance', 'getDonorMetrics', 'getWithdrawalMetrics', 'getOrganRequestMetrics'];
    for (const name of forbidden) {
      expect(publicNames).not.toContain(name);
    }
  });

  it('PUBLIC_TOOLS is a small, fixed, aggregate-only set', () => {
    expect(PUBLIC_TOOLS.map((t) => t.name).sort()).toEqual(
      ['getPublicConcentration', 'getPublicHospitalAvailability', 'getPublicOrganAvailability', 'getPublicTrends'].sort(),
    );
  });
});

describe('POST /api/v1/public/agent/investigate - no authentication required', () => {
  it('reachable with no cookie at all', async () => {
    mockedRun.mockResolvedValue({
      ok: true,
      result: { summary: 'ok', findings: [], toolsUsed: ['getPublicOrganAvailability'], insufficientEvidence: false },
      generatedAt: new Date().toISOString(),
    });
    const res = await request(app).post('/api/v1/public/agent/investigate').send({});
    expect(res.status).toBe(200);
  });

  it('is called with the restricted PUBLIC_TOOLS, never ADMIN_TOOLS', async () => {
    mockedRun.mockResolvedValue({
      ok: true,
      result: { summary: 'ok', findings: [], toolsUsed: [], insufficientEvidence: false },
      generatedAt: new Date().toISOString(),
    });
    await request(app).post('/api/v1/public/agent/investigate').send({ question: 'Which hospitals have availability?' });
    expect(mockedRun).toHaveBeenCalledWith('Which hospitals have availability?', PUBLIC_TOOLS);
  });

  it('rejects unknown fields (strict schema) same as the admin endpoint', async () => {
    const res = await request(app).post('/api/v1/public/agent/investigate').send({ question: 'x', sql: 'DROP TABLE donors' });
    expect(res.status).toBe(400);
  });

  it('reports 503 without exposing provider/internal detail when unavailable', async () => {
    mockedRun.mockResolvedValue({ ok: false, reason: 'NO_PROVIDER' });
    const res = await request(app).post('/api/v1/public/agent/investigate').send({});
    expect(res.status).toBe(503);
    expect(JSON.stringify(res.body)).not.toMatch(/gemini|groq|openrouter/i);
  });
});
