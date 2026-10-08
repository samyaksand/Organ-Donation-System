import { ErrorState } from '@/components/common/error-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';
import { useAiSecurityBreakdown, useAiSecurityEvents } from '../hooks';
import type { AnalyticsWindowParams } from '@/types/api';

/**
 * AI Security Gateway decisions - every investigation request (admin or public) is classified
 * and recorded here BEFORE any LangGraph/provider call. A BLOCK row means the question never
 * reached an AI provider at all. Never shows the full original prompt, only a short excerpt.
 */
export function SecurityAiGatewayTab({ period }: { period: AnalyticsWindowParams }) {
  const breakdown = useAiSecurityBreakdown(period);
  const events = useAiSecurityEvents({ ...period, limit: 20 });

  if (breakdown.isError) return <ErrorState error={breakdown.error} onRetry={() => void breakdown.refetch()} retrying={breakdown.isFetching} />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Requests by classification</CardTitle>
          <CardDescription>AI provides analysis and explanation only. OrganFlow&rsquo;s security policies enforce access.</CardDescription>
        </CardHeader>
        <CardContent>
          {breakdown.isPending ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {breakdown.data?.byClassification.map((c, i) => (
                <li key={i} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                  <span className="min-w-0 truncate font-medium">{c.classification}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge variant={c.decision === 'ALLOW' ? 'secondary' : 'destructive'}>{c.decision}</Badge>
                    <span className="tabular-nums text-muted-foreground">{c.count}</span>
                  </span>
                </li>
              ))}
              {breakdown.data?.byClassification.length === 0 && <li className="text-sm text-muted-foreground">No AI investigation requests screened for this period.</li>}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent gateway decisions</CardTitle>
          <CardDescription>Most recent investigation requests, allowed and blocked.</CardDescription>
        </CardHeader>
        <CardContent>
          {events.isPending ? (
            <Skeleton className="h-48 w-full" />
          ) : events.data && events.data.events.length > 0 ? (
            <ul className="space-y-3 text-sm">
              {events.data.events.map((e) => (
                <li key={e.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{e.surface}</Badge>
                    <Badge variant="outline">{e.actorRole}</Badge>
                    <Badge variant={e.decision === 'ALLOW' ? 'secondary' : 'destructive'}>{e.classification}</Badge>
                    <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(e.createdAt)}</span>
                  </div>
                  {e.questionExcerpt && <p className="mt-2 italic text-muted-foreground">&ldquo;{e.questionExcerpt}&rdquo;</p>}
                  <p className="mt-1 text-muted-foreground">{e.reason}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No AI investigation requests screened for this period.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
