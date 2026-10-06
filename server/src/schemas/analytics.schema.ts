import { z } from 'zod';

/**
 * Shared time-window query for analytics endpoints. Exactly one of a named `window` or an
 * explicit `{ from, to }` range applies; `window` is the common case (today / 7d / 30d / 90d /
 * this/last calendar month). Dates are inclusive, UTC calendar days, matching how the rest of
 * the API already treats DATE-only values (see utils/dates.ts).
 */
export const ANALYTICS_WINDOWS = ['today', '7d', '30d', '90d', 'thisMonth', 'lastMonth'] as const;
export type AnalyticsWindow = (typeof ANALYTICS_WINDOWS)[number];

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD');

export const analyticsWindowQuery = z
  .object({
    window: z.enum(ANALYTICS_WINDOWS).optional(),
    from: dateOnly.optional(),
    to: dateOnly.optional(),
  })
  .strict()
  .refine((d) => !(d.from && !d.to) && !(d.to && !d.from), {
    message: '"from" and "to" must be provided together',
    path: ['to'],
  })
  .refine((d) => !(d.window && (d.from || d.to)), {
    message: 'Provide either "window" or "from"/"to", not both',
    path: ['window'],
  });

export type AnalyticsWindowQuery = z.infer<typeof analyticsWindowQuery>;

export const trendsQuery = analyticsWindowQuery.and(
  z.object({
    /** Bucket granularity for the trends endpoint only. Defaults to "day". */
    granularity: z.enum(['day', 'week', 'month']).optional(),
  }),
);

export type TrendsQuery = z.infer<typeof trendsQuery>;
