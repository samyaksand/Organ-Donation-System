/** Parse a `YYYY-MM-DD` string as a UTC calendar date (stored in Postgres DATE columns). */
export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Serialize a DATE column back to `YYYY-MM-DD` so clients never shift it by timezone. */
export function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function todayDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}
