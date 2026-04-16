/**
 * Parse a 'YYYY-MM-DD' date string as local midnight time (not UTC midnight).
 *
 * Problem: `new Date('2026-04-17')` creates 2026-04-17T00:00:00.000Z (UTC midnight),
 * which is 2026-04-16T16:00:00 in UTC+8. This means records created on 2026-04-17
 * in UTC+8 before 08:00 UTC would be missed when filtering by "today".
 *
 * Fix: Append 'T00:00:00' (no timezone suffix) so the JS engine uses the local
 * timezone of the server process (which should be UTC+8 in production).
 */
export function parseDateLocal(str: string | undefined): Date | undefined {
  if (!str) return undefined;
  // 'YYYY-MM-DDT00:00:00' is parsed as local time by the JS engine
  return new Date(str + "T00:00:00");
}

/**
 * Parse a 'YYYY-MM-DD' date string as local end-of-day (23:59:59.999) time.
 * Use this for the upper bound of a date range filter.
 */
export function parseDateLocalEnd(str: string | undefined): Date | undefined {
  if (!str) return undefined;
  return new Date(str + "T23:59:59.999");
}
