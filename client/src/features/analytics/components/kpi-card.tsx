import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type * as React from 'react';
import { Link } from 'react-router-dom';
import { InfoTooltip } from '@/components/common/info-tooltip';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PeriodComparison } from '@/types/api';

interface KpiCardProps {
  label: string;
  value: number | undefined | null;
  icon: LucideIcon;
  loading?: boolean;
  tone?: 'default' | 'success' | 'warning' | 'info' | 'destructive';
  /** Explain-affordance content: definition + how it's calculated. */
  explain?: React.ReactNode;
  /** Period-over-period comparison, when the metric supports one. */
  comparison?: PeriodComparison;
  /** Extra context line (e.g. "for the selected period"). */
  hint?: React.ReactNode;
  /** Drill-down destination. */
  href?: string;
}

const toneClasses: Record<NonNullable<KpiCardProps['tone']>, string> = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
  destructive: 'bg-destructive/10 text-destructive',
};

function ChangeIndicator({ comparison }: { comparison: PeriodComparison }) {
  if (comparison.percentChange === null) {
    return <span className="text-muted-foreground">No prior-period data</span>;
  }
  if (comparison.percentChange === 0) {
    return (
      <span className="flex items-center gap-1 text-muted-foreground">
        <Minus className="h-3 w-3" aria-hidden="true" /> No change vs previous period
      </span>
    );
  }
  const up = comparison.percentChange > 0;
  return (
    <span className={cn('flex items-center gap-1', up ? 'text-success' : 'text-destructive')}>
      {up ? <TrendingUp className="h-3 w-3" aria-hidden="true" /> : <TrendingDown className="h-3 w-3" aria-hidden="true" />}
      {Math.abs(comparison.percentChange)}% vs previous period ({formatNumber(comparison.previous)})
    </span>
  );
}

export function KpiCard({ label, value, icon: Icon, loading, tone = 'default', explain, comparison, hint, href }: KpiCardProps) {
  const content = (
    <Card className={cn('p-5', href && 'transition-colors hover:border-primary/40')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            {explain && <InfoTooltip label={label}>{explain}</InfoTooltip>}
          </div>
          {loading || value === undefined ? (
            <Skeleton className="h-8 w-16" />
          ) : value === null ? (
            <p className="text-2xl font-semibold text-muted-foreground">N/A</p>
          ) : (
            <p className="text-2xl font-semibold tabular-nums text-foreground">{formatNumber(value)}</p>
          )}
        </div>
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', toneClasses[tone])}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      {(comparison || hint) && (
        <div className="mt-3 text-xs">
          {comparison && <ChangeIndicator comparison={comparison} />}
          {hint && <div className={cn('text-muted-foreground', comparison && 'mt-1')}>{hint}</div>}
        </div>
      )}
    </Card>
  );

  return href ? (
    <Link to={href} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {content}
    </Link>
  ) : (
    content
  );
}
