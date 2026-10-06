import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Bottleneck } from '../bottlenecks';

const severityStyle: Record<Bottleneck['severity'], string> = {
  high: 'border-l-4 border-l-destructive',
  medium: 'border-l-4 border-l-warning',
};

const severityDot: Record<Bottleneck['severity'], string> = {
  high: 'bg-destructive',
  medium: 'bg-warning',
};

/**
 * Deterministic management alerts (see ../bottlenecks.ts). Never labeled "AI insights" - these
 * are plain threshold checks over figures the analytics API already computed.
 */
export function BottleneckList({ items, loading }: { items: Bottleneck[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="No operational bottlenecks detected"
        description="Pending queues, hospital availability and organ-type coverage are all within normal thresholds."
        className="py-10"
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id} className={cn('p-0', severityStyle[item.severity])}>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', severityDot[item.severity])} aria-hidden="true" />
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  {item.title}
                </p>
                <p className="text-sm text-muted-foreground">{item.evidence}</p>
                <p className="text-xs text-muted-foreground">
                  {item.metric} · Affected: {item.affected}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" asChild className="shrink-0">
              <Link to={item.href}>
                View records <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
