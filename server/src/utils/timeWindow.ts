import type { AnalyticsWindowQuery } from '../schemas/analytics.schema';

export interface ResolvedWindow {
  /** Inclusive start, UTC midnight. */
  start: Date;
  /** Exclusive end (start of the day after the window's last day), UTC. */
  end: Date;
  /** Human-readable label for the response, e.g. "last 30 days", "this month". */
  label: string;
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * Resolves a query's `window` or explicit `from`/`to` into a concrete [start, end) range.
 * Defaults to the last 30 days when neither is given, matching the other time-boxed figures
 * already shown in the admin console (recent donors/withdrawals take 5 most recent, not
 * time-boxed; this default only applies to the new analytics endpoints).
 */
export function resolveWindow(query: AnalyticsWindowQuery, now: Date = new Date()): ResolvedWindow {
  const today = startOfUtcDay(now);

  if (query.from && query.to) {
    const start = new Date(`${query.from}T00:00:00.000Z`);
    const end = addDays(new Date(`${query.to}T00:00:00.000Z`), 1);
    return { start, end, label: `${query.from} to ${query.to}` };
  }

  switch (query.window) {
    case 'today':
      return { start: today, end: addDays(today, 1), label: 'today' };
    case '7d':
      return { start: addDays(today, -6), end: addDays(today, 1), label: 'last 7 days' };
    case '90d':
      return { start: addDays(today, -89), end: addDays(today, 1), label: 'last 90 days' };
    case 'thisMonth': {
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      return { start, end: addDays(today, 1), label: 'this month' };
    }
    case 'lastMonth': {
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
      const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      return { start, end, label: 'last month' };
    }
    case '30d':
    default:
      return { start: addDays(today, -29), end: addDays(today, 1), label: 'last 30 days' };
  }
}

/** The window immediately preceding `window`, with the same duration. For period-over-period comparison. */
export function previousPeriod(window: ResolvedWindow): ResolvedWindow {
  const durationMs = window.end.getTime() - window.start.getTime();
  const end = window.start;
  const start = new Date(end.getTime() - durationMs);
  return { start, end, label: `previous period (${window.label})` };
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null; // undefined/infinite % change from zero
  return Math.round(((current - previous) / previous) * 1000) / 10; // one decimal place
}
