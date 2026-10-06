import { Link } from 'react-router-dom';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface BarListItem {
  key: string;
  label: string;
  value: number;
  /** Optional secondary line under the label (e.g. a city). */
  sublabel?: string;
  /** Wraps the row in a Link when provided (drill-down). */
  href?: string;
  tone?: 'default' | 'warning' | 'destructive';
}

const toneBar: Record<NonNullable<BarListItem['tone']>, string> = {
  default: 'bg-primary/70',
  warning: 'bg-warning/70',
  destructive: 'bg-destructive/70',
};

/**
 * A plain horizontal bar list - deliberately not a chart library. Restrained, readable, and
 * shows the exact number alongside every bar rather than relying on visual estimation alone.
 */
export function BarList({ items, emptyLabel = 'No data for this period.' }: { items: BarListItem[]; emptyLabel?: string }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const row = (
          <div className="space-y-1">
            <div className="flex items-center gap-3 text-sm">
              <span className="min-w-0 flex-1 truncate">
                {item.label}
                {item.sublabel && <span className="ml-1.5 text-xs text-muted-foreground">{item.sublabel}</span>}
              </span>
              <span className="shrink-0 font-medium tabular-nums">{formatNumber(item.value)}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full', toneBar[item.tone ?? 'default'])}
                style={{ width: `${Math.max(2, Math.round((item.value / max) * 100))}%` }}
              />
            </div>
          </div>
        );
        return (
          <li key={item.key}>
            {item.href ? (
              <Link to={item.href} className="block rounded-md transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {row}
              </Link>
            ) : (
              row
            )}
          </li>
        );
      })}
    </ul>
  );
}
