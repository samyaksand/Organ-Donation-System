import { describe, expect, it } from 'vitest';
import { findingLink } from '@/features/agent/links';
import type { AgentFinding } from '@/types/api';

function finding(evidence: string[]): AgentFinding {
  return { severity: 'high', title: 'Test', facts: ['fact'], interpretation: 'x', recommendation: 'y', evidence };
}

describe('findingLink', () => {
  it('links organ-request evidence to the organ requests queue', () => {
    expect(findingLink(finding(['getOrganRequestMetrics', 'getPendingRequests']))).toEqual({
      label: 'View organ requests',
      href: '/admin/organ-requests?status=PENDING',
    });
  });

  it('links withdrawal evidence to the withdrawals queue', () => {
    expect(findingLink(finding(['getWithdrawalMetrics']))?.href).toBe('/admin/withdrawals?status=PENDING');
  });

  it('links hospital/concentration evidence to hospital analytics', () => {
    expect(findingLink(finding(['getHospitalMetrics']))?.href).toBe('/admin/analytics?tab=hospitals');
    expect(findingLink(finding(['getOrganAvailabilityConcentration']))?.href).toBe('/admin/analytics?tab=hospitals');
  });

  it('returns null when no evidence tool maps to a page', () => {
    expect(findingLink(finding(['someUnknownTool']))).toBeNull();
  });
});
