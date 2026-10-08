import { ErrorState } from '@/components/common/error-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSecurityDecisions, useSecurityDenied } from '../hooks';
import type { AnalyticsWindowParams } from '@/types/api';

/** Access decisions by role and by resource - the access-control matrix in action over real
 * recorded decisions, plus the most recent individual denials for closer inspection. */
export function SecurityDecisionsTab({ period }: { period: AnalyticsWindowParams }) {
  const { data, isPending, isError, error, refetch, isFetching } = useSecurityDecisions(period);
  const denied = useSecurityDenied({ ...period, limit: 10 });

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} retrying={isFetching} />;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Decisions by role</CardTitle>
            <CardDescription>Allow/deny counts per actor role.</CardDescription>
          </CardHeader>
          <CardContent>
            {isPending ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <ul className="space-y-2 text-sm">
                {data?.byRole.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 border-b py-1.5 last:border-0">
                    <span className="font-medium">{r.role}</span>
                    <span className="flex items-center gap-2">
                      <Badge variant={r.decision === 'ALLOW' ? 'secondary' : 'destructive'}>{r.decision}</Badge>
                      <span className="tabular-nums text-muted-foreground">{r.count}</span>
                    </span>
                  </li>
                ))}
                {data?.byRole.length === 0 && <li className="text-muted-foreground">No access decisions recorded for this period.</li>}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Decisions by resource</CardTitle>
            <CardDescription>Which resources see the most activity.</CardDescription>
          </CardHeader>
          <CardContent>
            {isPending ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <ul className="space-y-2 text-sm">
                {data?.byResource.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 border-b py-1.5 last:border-0">
                    <span className="min-w-0 truncate font-medium">{r.resource}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <Badge variant={r.decision === 'ALLOW' ? 'secondary' : 'destructive'}>{r.decision}</Badge>
                      <span className="tabular-nums text-muted-foreground">{r.count}</span>
                    </span>
                  </li>
                ))}
                {data?.byResource.length === 0 && <li className="text-muted-foreground">No access decisions recorded for this period.</li>}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent denied access attempts</CardTitle>
          <CardDescription>Most recent DENY decisions, with the policy and reason.</CardDescription>
        </CardHeader>
        <CardContent>
          {denied.isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : denied.data && denied.data.events.length > 0 ? (
            <ul className="space-y-3 text-sm">
              {denied.data.events.map((e) => (
                <li key={e.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{e.actorRole}</Badge>
                    <span className="font-medium">{e.resource}</span>
                    <span className="text-muted-foreground">&middot; {e.action}</span>
                    <Badge variant="destructive" className="ml-auto">{e.classification}</Badge>
                  </div>
                  <p className="mt-2 text-muted-foreground">{e.reason}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Policy: {e.policyCode}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No denied access attempts recorded for this period.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
