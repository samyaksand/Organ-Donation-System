import { CheckCircle2, ClipboardList, Clock, FileClock, Hourglass, XCircle } from 'lucide-react';
import { BarList } from '@/components/common/bar-list';
import { ErrorState } from '@/components/common/error-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendBars } from '@/components/common/trend-bars';
import { formatDateTime } from '@/lib/format';
import { useAnalyticsTrends, useOrganRequestAnalytics, useWithdrawalAnalytics } from '../hooks';
import { KpiCard } from './kpi-card';
import type { AnalyticsWindowParams } from '@/types/api';

/** The hospital organ request pipeline, plus withdrawal-request metrics ("WHAT is happening?" for the two review queues). */
export function RequestsTab({ period }: { period: AnalyticsWindowParams }) {
  const requests = useOrganRequestAnalytics(period);
  const withdrawals = useWithdrawalAnalytics(period);
  const trends = useAnalyticsTrends(period);

  if (requests.isError) return <ErrorState error={requests.error} onRetry={() => void requests.refetch()} retrying={requests.isFetching} />;

  const r = requests.data;

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Hospital organ requests</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Total" value={r?.byStatus.total} loading={requests.isPending} icon={ClipboardList} explain="All organ requests ever submitted." />
          <KpiCard label="Pending" value={r?.byStatus.PENDING} loading={requests.isPending} icon={Clock} tone="warning" explain="Awaiting an admin decision." href="/admin/organ-requests?status=PENDING" />
          <KpiCard label="Approved" value={r?.byStatus.APPROVED} loading={requests.isPending} icon={CheckCircle2} tone="success" explain="Organ allocated to the requesting hospital." />
          <KpiCard label="Declined" value={r?.byStatus.DECLINED} loading={requests.isPending} icon={XCircle} tone="destructive" explain="Request declined; organ availability unaffected." />
          <KpiCard
            label="Approval rate"
            value={r?.approvalRate ?? undefined}
            loading={requests.isPending}
            icon={CheckCircle2}
            explain="Share of reviewed requests (approved + declined) that were approved, in the selected period."
            hint={r?.approvalRate !== null && r?.approvalRate !== undefined ? '%' : undefined}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Request volume</CardTitle>
              <CardDescription>{r?.window.label}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {requests.isPending ? (
                <Skeleton className="h-28 w-full" />
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold tabular-nums">{r?.requests.current}</span>
                    <span className="text-sm text-muted-foreground">requests submitted</span>
                  </div>
                  <TrendBars data={trends.data?.organRequests ?? {}} label="organ requests" />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity by hospital</CardTitle>
              <CardDescription>Total requests submitted, all time.</CardDescription>
            </CardHeader>
            <CardContent>
              {requests.isPending ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <BarList
                  items={(r?.hospitalActivity ?? []).slice(0, 8).map((h) => ({
                    key: h.hospitalId,
                    label: h.hospitalName,
                    value: h.total,
                    sublabel: h.city ?? undefined,
                    href: `/admin/organ-requests?hospitalId=${h.hospitalId}`,
                  }))}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {!requests.isPending && r?.oldestPending && (
          <Card className="border-l-4 border-l-warning">
            <CardContent className="flex items-center gap-3 p-4 text-sm">
              <Hourglass className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              <p>
                Oldest pending organ request was submitted <strong>{formatDateTime(r.oldestPending.createdAt)}</strong> ({r.oldestPending.ageDays}{' '}
                day{r.oldestPending.ageDays === 1 ? '' : 's'} ago).
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Withdrawal requests</h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Pending" value={withdrawals.data?.byStatus.PENDING} loading={withdrawals.isPending} icon={FileClock} tone="warning" href="/admin/withdrawals?status=PENDING" explain="Donor withdrawal requests awaiting review." />
          <KpiCard label="Approved" value={withdrawals.data?.byStatus.APPROVED} loading={withdrawals.isPending} icon={CheckCircle2} tone="success" explain="Donor withdrawn; their organs taken out of circulation." />
          <KpiCard label="Declined" value={withdrawals.data?.byStatus.REJECTED} loading={withdrawals.isPending} icon={XCircle} tone="destructive" explain="Request rejected; donor remains active." />
          <KpiCard
            label="Avg. processing time"
            value={withdrawals.isPending ? undefined : withdrawals.data?.averageProcessingHours}
            loading={withdrawals.isPending}
            icon={Hourglass}
            tone="info"
            explain="Average hours between submission and review, for requests reviewed in the selected period."
            hint="hours"
          />
        </div>
        {!withdrawals.isPending && withdrawals.data?.oldestPending && (
          <Card className="border-l-4 border-l-warning">
            <CardContent className="flex items-center gap-3 p-4 text-sm">
              <Hourglass className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              <p>
                Oldest pending withdrawal was submitted <strong>{formatDateTime(withdrawals.data.oldestPending.createdAt)}</strong> (
                {withdrawals.data.oldestPending.ageDays} day{withdrawals.data.oldestPending.ageDays === 1 ? '' : 's'} ago).
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
