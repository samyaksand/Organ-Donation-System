import type { HospitalAnalytics, OrganAnalytics, OrganRequestAnalytics, WithdrawalAnalytics } from '@/types/api';

export interface Bottleneck {
  id: string;
  severity: 'high' | 'medium';
  title: string;
  evidence: string;
  metric: string;
  affected: string;
  href: string;
}

/**
 * Deterministic management-alert rules evaluated purely over numbers the analytics API already
 * returned - no new aggregation, no AI/LLM interpretation. Each rule is a plain threshold check
 * against figures from server/src/services/analytics.service.ts. Never called "AI insights".
 */
export function computeBottlenecks(data: {
  organs?: OrganAnalytics;
  hospitals?: HospitalAnalytics;
  withdrawals?: WithdrawalAnalytics;
  organRequests?: OrganRequestAnalytics;
}): Bottleneck[] {
  const items: Bottleneck[] = [];

  if (data.organRequests && data.organRequests.stalePendingCount > 0) {
    const r = data.organRequests;
    items.push({
      id: 'stale-organ-requests',
      severity: 'high',
      title: 'Organ request processing backlog',
      evidence: `${r.stalePendingCount} request${r.stalePendingCount === 1 ? '' : 's'} pending for more than ${r.stalePendingThresholdDays} days.`,
      metric: r.averageProcessingHours !== null ? `Average processing time: ${r.averageProcessingHours}h` : 'No completed requests yet to measure processing time',
      affected: `${r.byStatus.PENDING} request${r.byStatus.PENDING === 1 ? '' : 's'} currently pending`,
      href: '/admin/organ-requests?status=PENDING',
    });
  }

  if (data.withdrawals && data.withdrawals.stalePendingCount > 0) {
    const w = data.withdrawals;
    items.push({
      id: 'stale-withdrawals',
      severity: 'high',
      title: 'Withdrawal review backlog',
      evidence: `${w.stalePendingCount} withdrawal request${w.stalePendingCount === 1 ? '' : 's'} pending for more than ${w.stalePendingThresholdDays} days.`,
      metric: w.averageProcessingHours !== null ? `Average processing time: ${w.averageProcessingHours}h` : 'No completed reviews yet to measure processing time',
      affected: `${w.byStatus.PENDING} request${w.byStatus.PENDING === 1 ? '' : 's'} currently pending`,
      href: '/admin/withdrawals?status=PENDING',
    });
  }

  if (data.hospitals && data.hospitals.zeroAvailability > 0) {
    const h = data.hospitals;
    items.push({
      id: 'zero-availability-hospitals',
      severity: 'medium',
      title: 'Hospitals with zero organ availability',
      evidence: `${h.zeroAvailability} of ${h.total} hospitals currently have no available organs.`,
      metric: `${h.zeroAvailabilityHospitals.map((x) => x.name).slice(0, 3).join(', ')}${h.zeroAvailabilityHospitals.length > 3 ? ', …' : ''}`,
      affected: `${h.zeroAvailability} hospital${h.zeroAvailability === 1 ? '' : 's'}`,
      href: '/admin/hospitals',
    });
  }

  if (data.organs) {
    const zeroTypes = data.organs.byOrganType.filter((t) => t.total > 0 && t.available === 0);
    if (zeroTypes.length > 0) {
      items.push({
        id: 'zero-availability-organ-types',
        severity: 'medium',
        title: 'Organ types with zero availability',
        evidence: `${zeroTypes.map((t) => t.organType).join(', ')} currently have no available organs anywhere in the registry.`,
        metric: `${zeroTypes.length} of ${data.organs.byOrganType.filter((t) => t.total > 0).length} tracked organ types affected`,
        affected: zeroTypes.map((t) => t.organType).join(', '),
        href: '/admin/organs?status=AVAILABLE',
      });
    }

    // Concentration: one hospital holding an unusually large share of all AVAILABLE organs.
    const totalAvailable = data.organs.byHospital.reduce((sum, h) => sum + h.available, 0);
    const top = [...data.organs.byHospital].sort((a, b) => b.available - a.available)[0];
    if (top && totalAvailable > 0 && top.available / totalAvailable >= 0.4 && data.organs.byHospital.length > 1) {
      items.push({
        id: 'concentrated-availability',
        severity: 'medium',
        title: 'Organ availability concentrated at one hospital',
        evidence: `${top.hospitalName} holds ${top.available} of ${totalAvailable} available organs (${Math.round((top.available / totalAvailable) * 100)}%).`,
        metric: `${Math.round((top.available / totalAvailable) * 100)}% concentration`,
        affected: top.hospitalName,
        href: `/admin/organs?hospitalId=${top.hospitalId}&status=AVAILABLE`,
      });
    }
  }

  return items;
}
