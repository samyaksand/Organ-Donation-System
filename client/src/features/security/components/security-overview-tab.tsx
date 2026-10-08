import { CheckCircle2, ShieldAlert, ShieldCheck, Sparkles } from 'lucide-react';
import { ErrorState } from '@/components/common/error-state';
import { KpiCard } from '@/features/analytics/components/kpi-card';
import { useSecurityOverview, useSecurityTrends } from '../hooks';
import type { AnalyticsWindowParams } from '@/types/api';

/** "What is happening?" for access control - real counts from SecurityEvent/AiSecurityEvent. */
export function SecurityOverviewTab({ period }: { period: AnalyticsWindowParams }) {
  const { data, isPending, isError, error, refetch, isFetching } = useSecurityOverview(period);
  const trends = useSecurityTrends(period);

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Access decisions"
          value={data?.totalEvents}
          loading={isPending}
          icon={ShieldCheck}
          hint={data?.percentChangeVsPreviousPeriod != null ? `${data.percentChangeVsPreviousPeriod}% vs previous period` : undefined}
          explain="Every RBAC/ownership/ABAC decision recorded by the policy engine, allow or deny."
        />
        <KpiCard label="Allowed" value={data?.allowCount} loading={isPending} icon={CheckCircle2} tone="success" explain="Access decisions that resolved to ALLOW." />
        <KpiCard label="Denied" value={data?.denyCount} loading={isPending} icon={ShieldAlert} tone="destructive" explain="Access decisions that resolved to DENY." />
        <KpiCard
          label="AI requests blocked"
          value={data?.aiRequestsBlocked}
          loading={isPending}
          icon={Sparkles}
          tone="warning"
          hint={data ? `of ${data.aiRequestsScreened} screened` : undefined}
          explain="Investigation requests the AI Security Gateway blocked before any provider call was made."
        />
      </div>

      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Deterministic figures over real recorded decisions - not AI-generated. {trends.data ? `${trends.data.points.length} day(s) with activity in ${data?.window ?? 'this period'}.` : null}
      </div>
    </div>
  );
}
