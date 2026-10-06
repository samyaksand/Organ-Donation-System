import { Clock, UserCheck, Users, UserX } from 'lucide-react';
import { BarList } from '@/components/common/bar-list';
import { ErrorState } from '@/components/common/error-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAnalyticsTrends, useDonorAnalytics } from '../hooks';
import { KpiCard } from './kpi-card';
import { TrendBars } from '@/components/common/trend-bars';
import type { AnalyticsWindowParams } from '@/types/api';

const BLOOD_TYPE_LABELS: Record<string, string> = {
  A_POS: 'A+', A_NEG: 'A-', B_POS: 'B+', B_NEG: 'B-',
  AB_POS: 'AB+', AB_NEG: 'AB-', O_POS: 'O+', O_NEG: 'O-',
  UNKNOWN: 'Not recorded',
};

/** "What is happening?" / "How has it changed?" for the donor population. Aggregated only - no identity or medical detail. */
export function DonorsTab({ period }: { period: AnalyticsWindowParams }) {
  const { data, isPending, isError, error, refetch, isFetching } = useDonorAnalytics(period);
  const trends = useAnalyticsTrends(period);

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total donors"
          value={data?.byStatus.total}
          loading={isPending}
          icon={Users}
          explain="All registered donor accounts, any status."
        />
        <KpiCard label="Active" value={data?.byStatus.ACTIVE} loading={isPending} icon={UserCheck} tone="success" explain="Registered and in good standing." />
        <KpiCard label="Pending verification" value={data?.byStatus.PENDING} loading={isPending} icon={Clock} tone="warning" explain="Registered but not yet verified by an admin." />
        <KpiCard label="Withdrawn" value={data?.byStatus.WITHDRAWN} loading={isPending} icon={UserX} explain="Withdrawal request approved." />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
            <div className="space-y-1">
              <CardTitle>Registrations</CardTitle>
              <CardDescription>{data?.window.label}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isPending ? (
              <Skeleton className="h-28 w-full" />
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tabular-nums">{data?.registrations.current}</span>
                  <span className="text-sm text-muted-foreground">new donors</span>
                </div>
                <TrendBars data={trends.data?.donorRegistrations ?? {}} label="donor registrations" />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Blood type distribution</CardTitle>
            <CardDescription>Across all registered donors.</CardDescription>
          </CardHeader>
          <CardContent>
            {isPending ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <BarList
                items={Object.entries(data?.byBloodType ?? {})
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => ({ key: type, label: BLOOD_TYPE_LABELS[type] ?? type, value: count }))}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
