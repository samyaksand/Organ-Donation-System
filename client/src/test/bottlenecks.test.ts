import { describe, expect, it } from 'vitest';
import { computeBottlenecks } from '@/features/analytics/bottlenecks';
import type { HospitalAnalytics, OrganAnalytics, OrganRequestAnalytics, WithdrawalAnalytics } from '@/types/api';

const emptyOrganRequests: OrganRequestAnalytics = {
  window: { label: 'last 30 days', start: '', end: '' },
  byStatus: { PENDING: 0, APPROVED: 0, DECLINED: 0, CANCELLED: 0, total: 0 },
  requests: { current: 0, previous: 0, percentChange: 0 },
  averageProcessingHours: null,
  reviewedCount: 0,
  approvalRate: null,
  oldestPending: null,
  stalePendingThresholdDays: 7,
  stalePendingCount: 0,
  hospitalActivity: [],
  requestVolumeTotal: 0,
};

const emptyWithdrawals: WithdrawalAnalytics = {
  window: { label: 'last 30 days', start: '', end: '' },
  byStatus: { PENDING: 0, APPROVED: 0, REJECTED: 0, total: 0 },
  requests: { current: 0, previous: 0, percentChange: 0 },
  averageProcessingHours: null,
  reviewedCount: 0,
  oldestPending: null,
  stalePendingThresholdDays: 14,
  stalePendingCount: 0,
};

describe('computeBottlenecks', () => {
  it('returns no bottlenecks for a clean dataset', () => {
    const items = computeBottlenecks({ withdrawals: emptyWithdrawals, organRequests: emptyOrganRequests });
    expect(items).toEqual([]);
  });

  it('flags a stale organ-request backlog', () => {
    const items = computeBottlenecks({
      organRequests: { ...emptyOrganRequests, stalePendingCount: 3, byStatus: { ...emptyOrganRequests.byStatus, PENDING: 5 } },
    });
    expect(items.map((i) => i.id)).toContain('stale-organ-requests');
    expect(items[0]!.evidence).toContain('3 requests pending for more than 7 days');
  });

  it('flags a stale withdrawal backlog', () => {
    const items = computeBottlenecks({ withdrawals: { ...emptyWithdrawals, stalePendingCount: 1 } });
    expect(items.map((i) => i.id)).toContain('stale-withdrawals');
    expect(items[0]!.evidence).toContain('1 withdrawal request');
  });

  it('flags hospitals with zero availability', () => {
    const hospitals: HospitalAnalytics = {
      total: 5,
      withAvailability: 4,
      zeroAvailability: 1,
      hospitals: [],
      zeroAvailabilityHospitals: [{ id: 'h1', name: 'Empty Hospital', city: 'Mumbai' }],
    };
    const items = computeBottlenecks({ hospitals });
    expect(items.map((i) => i.id)).toContain('zero-availability-hospitals');
  });

  it('flags organ types with zero availability (ignoring types with zero total records)', () => {
    const organs: OrganAnalytics = {
      byStatus: { PENDING: 0, AVAILABLE: 0, UNAVAILABLE: 0, total: 0 },
      byOrganType: [
        { organType: 'KIDNEY', total: 5, available: 0 },
        { organType: 'LIVER', total: 3, available: 2 },
        { organType: 'PANCREAS', total: 0, available: 0 }, // no records at all -> not flagged
      ],
      byHospital: [],
    };
    const items = computeBottlenecks({ organs });
    const flagged = items.find((i) => i.id === 'zero-availability-organ-types');
    expect(flagged?.evidence).toContain('KIDNEY');
    expect(flagged?.evidence).not.toContain('PANCREAS');
  });

  it('flags concentrated availability at a single hospital (>=40% share)', () => {
    const organs: OrganAnalytics = {
      byStatus: { PENDING: 0, AVAILABLE: 10, UNAVAILABLE: 0, total: 10 },
      byOrganType: [],
      byHospital: [
        { hospitalId: 'h1', hospitalName: 'Big Hospital', city: 'Mumbai', available: 6, pending: 0, unavailable: 0, total: 6 },
        { hospitalId: 'h2', hospitalName: 'Small Hospital', city: 'Delhi', available: 4, pending: 0, unavailable: 0, total: 4 },
      ],
    };
    const items = computeBottlenecks({ organs });
    expect(items.map((i) => i.id)).toContain('concentrated-availability');
  });

  it('does not flag concentration with only one hospital in the dataset', () => {
    const organs: OrganAnalytics = {
      byStatus: { PENDING: 0, AVAILABLE: 5, UNAVAILABLE: 0, total: 5 },
      byOrganType: [],
      byHospital: [{ hospitalId: 'h1', hospitalName: 'Only Hospital', city: 'Mumbai', available: 5, pending: 0, unavailable: 0, total: 5 }],
    };
    const items = computeBottlenecks({ organs });
    expect(items.map((i) => i.id)).not.toContain('concentrated-availability');
  });
});
