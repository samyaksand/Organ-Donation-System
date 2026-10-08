import { ErrorState } from '@/components/common/error-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSecurityViolations } from '../hooks';
import type { AnalyticsWindowParams } from '@/types/api';

/** Denied access attempts grouped by which policy produced the denial - surfaces repeated or
 * systematic access-control violations, ranked by count. */
export function SecurityViolationsTab({ period }: { period: AnalyticsWindowParams }) {
  const { data, isPending, isError, error, refetch, isFetching } = useSecurityViolations(period);

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Policy violations</CardTitle>
        <CardDescription>Denied access attempts grouped by policy, ranked by count.</CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-48 w-full" />
        ) : data && data.violations.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {data.violations.map((v, i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{v.policyCode}</p>
                  <p className="text-xs text-muted-foreground">{v.resource} &middot; {v.role}</p>
                </div>
                <span className="shrink-0 tabular-nums text-muted-foreground">{v.count}&times;</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No policy violations recorded for this period.</p>
        )}
      </CardContent>
    </Card>
  );
}
