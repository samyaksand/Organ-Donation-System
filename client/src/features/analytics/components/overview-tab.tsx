import { Building2, CheckCircle2, ClipboardList, Clock, FileClock, Hourglass, Users } from 'lucide-react';
import { ErrorState } from '@/components/common/error-state';
import { useAnalyticsOverview, useOrganRequestAnalytics, useWithdrawalAnalytics } from '../hooks';
import { KpiCard } from './kpi-card';
import type { AnalyticsWindowParams } from '@/types/api';

/**
 * "What is happening?" - the top-level KPI cards. Every card pulls from exactly one analytics
 * endpoint; nothing here is computed in React.
 */
export function OverviewTab({ period }: { period: AnalyticsWindowParams }) {
  const overview = useAnalyticsOverview();
  const withdrawals = useWithdrawalAnalytics(period);
  const organRequests = useOrganRequestAnalytics(period);

  if (overview.isError) {
    return <ErrorState error={overview.error} onRetry={() => void overview.refetch()} retrying={overview.isFetching} />;
  }

  const data = overview.data;
  const loading = overview.isPending;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Total donors"
        value={data?.donors.total}
        loading={loading}
        icon={Users}
        explain="Total registered donor accounts, across every status (pending, active, withdrawn). Source: Donor table, live count."
        hint={data && `${data.donors.ACTIVE} active · ${data.donors.PENDING} pending · ${data.donors.WITHDRAWN} withdrawn`}
        href="/admin/donors"
      />
      <KpiCard
        label="Available organs"
        value={data?.organs.AVAILABLE}
        loading={loading}
        icon={CheckCircle2}
        tone="success"
        explain="Organ records currently marked AVAILABLE (verified and not yet allocated or withdrawn). Source: Organ table, live count."
        hint={data && `${data.organs.total} organ records in total`}
        href="/admin/organs?status=AVAILABLE"
      />
      <KpiCard
        label="Hospitals"
        value={data?.hospitals.total}
        loading={loading}
        icon={Building2}
        explain="Registered hospitals. 'With availability' means at least one AVAILABLE organ is currently recorded there."
        hint={data && `${data.hospitals.withAvailability} with availability · ${data.hospitals.zeroAvailability} with none`}
        href="/admin/hospitals"
      />
      <KpiCard
        label="Pending withdrawals"
        value={data?.withdrawals.PENDING}
        loading={loading}
        icon={FileClock}
        tone="warning"
        explain="Donor withdrawal requests awaiting admin review. Source: WithdrawalRequest table, status = PENDING."
        href="/admin/withdrawals?status=PENDING"
      />
      <KpiCard
        label="Pending organ requests"
        value={data?.organRequests.PENDING}
        loading={loading}
        icon={ClipboardList}
        tone="warning"
        explain="Hospital organ requests awaiting admin decision. Source: OrganRequest table, status = PENDING."
        href="/admin/organ-requests?status=PENDING"
      />
      <KpiCard
        label="Stale requests"
        value={(withdrawals.data?.stalePendingCount ?? 0) + (organRequests.data?.stalePendingCount ?? 0)}
        loading={withdrawals.isPending || organRequests.isPending}
        icon={Clock}
        tone="destructive"
        explain={
          <>
            Pending withdrawal requests older than {withdrawals.data?.stalePendingThresholdDays ?? 14} days, plus pending organ requests
            older than {organRequests.data?.stalePendingThresholdDays ?? 7} days. A fixed, deterministic age threshold - not a prediction.
          </>
        }
        hint={
          withdrawals.data &&
          organRequests.data && (
            <>
              {withdrawals.data.stalePendingCount} withdrawal{withdrawals.data.stalePendingCount === 1 ? '' : 's'} ·{' '}
              {organRequests.data.stalePendingCount} organ request{organRequests.data.stalePendingCount === 1 ? '' : 's'}
            </>
          )
        }
      />
      <KpiCard
        label="Avg. withdrawal processing"
        value={withdrawals.isPending ? undefined : withdrawals.data?.averageProcessingHours}
        loading={withdrawals.isPending}
        icon={Hourglass}
        tone="info"
        explain="Average time between a withdrawal request being submitted and it being approved or rejected, for requests reviewed in the selected period. Shown only when at least one request has been reviewed."
        hint={withdrawals.data && `hours · based on ${withdrawals.data.reviewedCount} reviewed request${withdrawals.data.reviewedCount === 1 ? '' : 's'}`}
      />
      <KpiCard
        label="Avg. organ request processing"
        value={organRequests.isPending ? undefined : organRequests.data?.averageProcessingHours}
        loading={organRequests.isPending}
        icon={Hourglass}
        tone="info"
        explain="Average time between an organ request being submitted and it being approved or declined, for requests reviewed in the selected period."
        hint={
          organRequests.data && `hours · based on ${organRequests.data.reviewedCount} reviewed request${organRequests.data.reviewedCount === 1 ? '' : 's'}`
        }
      />
    </div>
  );
}
