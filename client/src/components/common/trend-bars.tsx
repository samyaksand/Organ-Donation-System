/**
 * Minimal bucketed-trend visualization (equal-width bars, one per period key, tallest = max).
 * Deliberately not a charting library - this renders the exact server-computed bucket counts
 * from GET /analytics/trends with no client-side interpolation or smoothing.
 */
export function TrendBars({ data, label }: { data: Record<string, number>; label: string }) {
  const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No {label} in this period.</p>;
  }

  const max = Math.max(1, ...entries.map(([, v]) => v));

  return (
    <div className="flex h-28 items-end gap-1" role="img" aria-label={`${label} trend over the selected period`}>
      {entries.map(([key, value]) => (
        <div key={key} className="group relative flex-1">
          <div
            className="mx-auto w-full rounded-t bg-primary/60 transition-colors group-hover:bg-primary"
            style={{ height: `${Math.max(3, Math.round((value / max) * 100))}%` }}
          />
          <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md group-hover:block">
            {key}: {value}
          </div>
        </div>
      ))}
    </div>
  );
}
