import { CheckCircle2, Clock, CircleSlash, Package } from 'lucide-react';
import { BarList } from '@/components/common/bar-list';
import { ErrorState } from '@/components/common/error-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ORGAN_TYPE_LABELS } from '@/lib/domain';
import { useOrganAnalytics } from '../hooks';
import { KpiCard } from './kpi-card';

/** "Where is availability?" - organ-type and hospital-level breakdowns. */
export function OrgansTab() {
  const { data, isPending, isError, error, refetch, isFetching } = useOrganAnalytics();

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} />;

  const zeroTypes = data?.byOrganType.filter((t) => t.total > 0 && t.available === 0) ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total organs" value={data?.byStatus.total} loading={isPending} icon={Package} explain="All organ records regardless of status." />
        <KpiCard label="Available" value={data?.byStatus.AVAILABLE} loading={isPending} icon={CheckCircle2} tone="success" explain="Verified and not yet allocated or withdrawn." />
        <KpiCard label="Pending review" value={data?.byStatus.PENDING} loading={isPending} icon={Clock} tone="warning" explain="Registered but not yet verified by an admin." />
        <KpiCard label="Unavailable" value={data?.byStatus.UNAVAILABLE} loading={isPending} icon={CircleSlash} tone="default" explain="Allocated, withdrawn, or otherwise no longer available." />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Availability by organ type</CardTitle>
            <CardDescription>Available vs. total records per type.</CardDescription>
          </CardHeader>
          <CardContent>
            {isPending ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <BarList
                items={(data?.byOrganType ?? [])
                  .filter((t) => t.total > 0)
                  .map((t) => ({
                    key: t.organType,
                    label: ORGAN_TYPE_LABELS[t.organType],
                    value: t.available,
                    sublabel: `of ${t.total}`,
                    tone: t.available === 0 ? 'destructive' : 'default',
                    href: `/admin/organs?organType=${t.organType}`,
                  }))}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Availability by hospital</CardTitle>
            <CardDescription>Hospitals ranked by available organ count.</CardDescription>
          </CardHeader>
          <CardContent>
            {isPending ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <BarList
                items={(data?.byHospital ?? []).slice(0, 10).map((h) => ({
                  key: h.hospitalId,
                  label: h.hospitalName,
                  value: h.available,
                  sublabel: h.city ?? undefined,
                  tone: h.available === 0 ? 'destructive' : 'default',
                  href: `/admin/organs?hospitalId=${h.hospitalId}`,
                }))}
                emptyLabel="No organ records yet."
              />
            )}
          </CardContent>
        </Card>
      </div>

      {!isPending && zeroTypes.length > 0 && (
        <Card className="border-l-4 border-l-warning">
          <CardContent className="flex items-center gap-3 p-4 text-sm">
            <CircleSlash className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <p>
              <strong>{zeroTypes.map((t) => ORGAN_TYPE_LABELS[t.organType]).join(', ')}</strong> currently{' '}
              {zeroTypes.length === 1 ? 'has' : 'have'} zero available organs in the registry.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
