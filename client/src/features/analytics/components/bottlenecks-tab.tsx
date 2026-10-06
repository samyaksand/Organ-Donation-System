import { useHospitalAnalytics, useOrganAnalytics, useOrganRequestAnalytics, useWithdrawalAnalytics } from '../hooks';
import { computeBottlenecks } from '../bottlenecks';
import { BottleneckList } from './bottleneck-list';
import type { AnalyticsWindowParams } from '@/types/api';

/** "Where are operational bottlenecks? What should management investigate?" */
export function BottlenecksTab({ period }: { period: AnalyticsWindowParams }) {
  const organs = useOrganAnalytics();
  const hospitals = useHospitalAnalytics();
  const withdrawals = useWithdrawalAnalytics(period);
  const organRequests = useOrganRequestAnalytics(period);

  const loading = organs.isPending || hospitals.isPending || withdrawals.isPending || organRequests.isPending;
  const items = computeBottlenecks({
    organs: organs.data,
    hospitals: hospitals.data,
    withdrawals: withdrawals.data,
    organRequests: organRequests.data,
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Deterministic threshold checks over the figures above - not AI-generated. Each item links to the underlying records.
      </p>
      <BottleneckList items={items} loading={loading} />
    </div>
  );
}
