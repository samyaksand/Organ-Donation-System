import type { AgentFinding } from '@/types/api';

/**
 * Maps a finding's `evidence` tool names to the most relevant existing admin page, so every
 * finding can offer a "View records" action without the agent itself choosing a URL (it only
 * ever returns tool names). Falls back to the Analytics bottlenecks tab when no more specific
 * page applies.
 */
export function findingLink(finding: AgentFinding): { label: string; href: string } | null {
  const evidence = finding.evidence.join(' ');
  if (evidence.includes('getPendingRequests') || evidence.includes('getOrganRequestMetrics') || evidence.includes('getHospitalRequestPerformance')) {
    return { label: 'View organ requests', href: '/admin/organ-requests?status=PENDING' };
  }
  if (evidence.includes('getWithdrawalMetrics')) {
    return { label: 'View withdrawal requests', href: '/admin/withdrawals?status=PENDING' };
  }
  if (evidence.includes('getHospitalMetrics') || evidence.includes('getOrganAvailabilityConcentration')) {
    return { label: 'View hospital analytics', href: '/admin/analytics?tab=hospitals' };
  }
  if (evidence.includes('getOrganMetrics')) {
    return { label: 'View organ analytics', href: '/admin/analytics?tab=organs' };
  }
  if (evidence.includes('getDonorMetrics')) {
    return { label: 'View donor analytics', href: '/admin/analytics?tab=donors' };
  }
  if (evidence.includes('getThresholdBreaches')) {
    return { label: 'View bottlenecks', href: '/admin/analytics?tab=bottlenecks' };
  }
  return null;
}
