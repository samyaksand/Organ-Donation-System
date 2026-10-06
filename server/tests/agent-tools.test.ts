import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as tools from '../src/agent/tools.service';
import { prisma as prismaClient } from '../src/lib/prisma';
import {
  findingSchema,
  hospitalPerformanceToolInput,
  investigationResultSchema,
  periodToolInput,
  pendingRequestsToolInput,
  workflowHistoryToolInput,
} from '../src/schemas/agent.schema';
import type { PrismaMock } from './helpers/prisma-mock';

vi.mock('../src/lib/prisma', async () => {
  const { createPrismaMock } = await import('./helpers/prisma-mock.js');
  return { prisma: createPrismaMock() };
});

const prisma = prismaClient as unknown as PrismaMock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('agent tool input validation (Zod schemas)', () => {
  it('rejects pending-requests input with an invalid "type"', () => {
    const parsed = pendingRequestsToolInput.safeParse({ type: 'RECIPIENT_MATCH' });
    expect(parsed.success).toBe(false);
  });

  it('rejects workflow-history input for an unsupported entity type', () => {
    const parsed = workflowHistoryToolInput.safeParse({ entityType: 'PATIENT', entityId: 'x' });
    expect(parsed.success).toBe(false);
  });

  it('rejects unknown fields on period input (no arbitrary query injection via extra keys)', () => {
    const parsed = periodToolInput.safeParse({ window: '30d', rawSql: 'SELECT * FROM donors' });
    expect(parsed.success).toBe(false);
  });

  it('accepts a valid hospital-performance input', () => {
    const parsed = hospitalPerformanceToolInput.safeParse({ hospitalId: 'h1', window: '30d' });
    expect(parsed.success).toBe(true);
  });
});

describe('agent tools reuse the deterministic analytics layer (no parallel calculation)', () => {
  it('getOverviewMetrics returns exactly what analytics.getOverview computes', async () => {
    prisma.donor.groupBy.mockResolvedValue([{ status: 'ACTIVE', _count: { _all: 5 } }]);
    prisma.organ.groupBy.mockResolvedValue([{ status: 'AVAILABLE', _count: { _all: 3 } }]);
    prisma.withdrawalRequest.groupBy.mockResolvedValue([]);
    prisma.organRequest.groupBy.mockResolvedValue([]);
    prisma.hospital.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);

    const result = await tools.getOverviewMetrics();
    expect(result.donors.ACTIVE).toBe(5);
    expect(result.organs.AVAILABLE).toBe(3);
    expect(result.hospitals).toEqual({ total: 2, withAvailability: 1, zeroAvailability: 1 });
  });

  it('getThresholdBreaches surfaces a stale organ-request backlog deterministically', async () => {
    prisma.organRequest.groupBy.mockImplementation(async (args: { by: string[] }) =>
      args.by.includes('hospitalId') ? [] : [{ status: 'PENDING', _count: { _all: 3 } }],
    );
    prisma.organRequest.count.mockResolvedValue(0);
    prisma.organRequest.findMany.mockImplementation(async (args: { where?: { status?: unknown } }) => {
      if (args?.where?.status === 'PENDING') {
        return [{ createdAt: new Date(Date.now() - 20 * 86_400_000) }, { createdAt: new Date(Date.now() - 1 * 86_400_000) }];
      }
      return [];
    });
    prisma.organRequest.findFirst.mockResolvedValue(null);
    prisma.withdrawalRequest.groupBy.mockResolvedValue([]);
    prisma.withdrawalRequest.count.mockResolvedValue(0);
    prisma.withdrawalRequest.findMany.mockResolvedValue([]);
    prisma.withdrawalRequest.findFirst.mockResolvedValue(null);
    prisma.hospital.count.mockResolvedValue(0);
    prisma.hospital.findMany.mockResolvedValue([]);
    prisma.organ.groupBy.mockResolvedValue([]);

    const breaches = await tools.getThresholdBreaches({});
    const stale = breaches.find((b) => b.id === 'stale-organ-requests');
    expect(stale).toBeDefined();
    expect(stale?.evidence).toContain('1 request(s) pending for more than 7 days');
  });

  it('getPendingRequests never includes donor name/contact/medical fields', async () => {
    prisma.organRequest.findMany.mockResolvedValue([
      {
        id: 'or1',
        status: 'PENDING',
        notes: null,
        declineReason: null,
        reviewedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        organ: { id: 'o1', organType: 'KIDNEY', otherOrganName: null, status: 'AVAILABLE', procurementDate: new Date(), donor: { id: 'd1', donorCode: 'DNTEST01' } },
        hospital: { id: 'h1', name: 'Test Hospital', city: 'Mumbai', state: null, address: 'x', phone: 'x', email: null },
        requestedBy: null,
        reviewedBy: null,
      },
    ]);
    prisma.organRequest.count.mockResolvedValue(1);

    const result = await tools.getPendingRequests({ type: 'ORGAN_REQUEST', limit: 10 });
    expect(JSON.stringify(result)).not.toMatch(/firstName|lastName|phone|medicalConditions/);
    expect(result[0]).toMatchObject({ id: 'or1', hospital: 'Test Hospital', organType: 'KIDNEY' });
  });

  it('getWorkflowHistoryTool reports a clear error for a non-existent entity instead of an empty array', async () => {
    prisma.organRequest.findUnique.mockResolvedValue(null);
    const result = await tools.getWorkflowHistoryTool({ entityType: 'ORGAN_REQUEST', entityId: 'missing' });
    expect(result).toEqual({ error: 'No ORGAN_REQUEST found with id missing' });
  });

  it('getHospitalRequestPerformance reports a clear error for an unknown hospital', async () => {
    prisma.hospital.findUnique.mockResolvedValue(null);
    const result = await tools.getHospitalRequestPerformance({ hospitalId: 'missing' } as never);
    expect(result).toEqual({ error: 'No hospital found with id missing' });
  });
});

describe('output contract validation', () => {
  it('rejects a finding with no facts (every finding must cite deterministic facts)', () => {
    const parsed = findingSchema.safeParse({
      severity: 'high',
      title: 'Backlog',
      facts: [],
      interpretation: 'Something is wrong',
      recommendation: 'Review it',
      evidence: ['getOrganRequestMetrics'],
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts a well-formed investigation result', () => {
    const parsed = investigationResultSchema.safeParse({
      summary: '1 issue identified.',
      findings: [
        {
          severity: 'high',
          title: 'Request Processing Backlog',
          facts: ['10 pending requests', '3 exceed the 7-day threshold'],
          interpretation: 'The backlog is concentrated across two hospitals.',
          recommendation: 'Review the oldest pending requests.',
          evidence: ['getOrganRequestMetrics', 'getPendingRequests'],
        },
      ],
      toolsUsed: ['getOrganRequestMetrics', 'getPendingRequests'],
      insufficientEvidence: false,
    });
    expect(parsed.success).toBe(true);
  });

  it('defaults insufficientEvidence to false when omitted', () => {
    const parsed = investigationResultSchema.safeParse({ summary: 'ok', findings: [], toolsUsed: [] });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.insufficientEvidence).toBe(false);
  });
});
