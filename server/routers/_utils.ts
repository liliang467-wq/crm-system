/**
 * Beijing Time (UTC+8) date utilities for server-side use.
 *
 * Problem: The server runs in America/New_York (UTC-4). Using `new Date()` or
 * `new Date('YYYY-MM-DD')` produces wrong results for Beijing-time-based queries.
 *
 * Solution: All date parsing and range calculations explicitly use UTC+8 offset
 * so results are independent of the server's local timezone.
 */

const CST_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8 in milliseconds

/**
 * Get the current date/time in Beijing time (UTC+8).
 */
export function nowCST(): Date {
  return new Date(Date.now());
}

/**
 * Parse a 'YYYY-MM-DD' date string as Beijing midnight (UTC+8 00:00:00).
 * Returns a Date whose UTC value corresponds to 2026-04-17T00:00:00+08:00.
 */
export function parseDateLocal(str: string | undefined): Date | undefined {
  if (!str) return undefined;
  // Explicitly append +08:00 to force Beijing timezone interpretation
  return new Date(str + "T00:00:00+08:00");
}

/**
 * Parse a 'YYYY-MM-DD' date string as Beijing end-of-day (UTC+8 23:59:59.999).
 * Use this for the upper bound of a date range filter.
 */
export function parseDateLocalEnd(str: string | undefined): Date | undefined {
  if (!str) return undefined;
  return new Date(str + "T23:59:59.999+08:00");
}

/**
 * Get today's date range in Beijing time (UTC+8).
 * Returns { from: Date, to: Date } where from = 00:00:00 CST, to = 23:59:59.999 CST
 */
export function getTodayRangeCST(): { from: Date; to: Date } {
  // Get current UTC timestamp, shift to CST to find the CST date
  const nowUtc = Date.now();
  const cstMs = nowUtc + CST_OFFSET_MS;
  const cstDate = new Date(cstMs);
  // Extract YYYY-MM-DD in CST
  const y = cstDate.getUTCFullYear();
  const m = String(cstDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(cstDate.getUTCDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;
  return {
    from: new Date(dateStr + "T00:00:00+08:00"),
    to: new Date(dateStr + "T23:59:59.999+08:00"),
  };
}

/**
 * Get the start of the current week (Monday) in Beijing time.
 */
export function getWeekStartCST(): Date {
  const nowUtc = Date.now();
  const cstMs = nowUtc + CST_OFFSET_MS;
  const cstDate = new Date(cstMs);
  const dayOfWeek = cstDate.getUTCDay(); // 0=Sun, 1=Mon, ...
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const mondayMs = cstMs - daysToMonday * 24 * 60 * 60 * 1000;
  const monday = new Date(mondayMs);
  const y = monday.getUTCFullYear();
  const m = String(monday.getUTCMonth() + 1).padStart(2, "0");
  const d = String(monday.getUTCDate()).padStart(2, "0");
  return new Date(`${y}-${m}-${d}T00:00:00+08:00`);
}

/**
 * Get the start of the current month in Beijing time.
 */
export function getMonthStartCST(): Date {
  const nowUtc = Date.now();
  const cstMs = nowUtc + CST_OFFSET_MS;
  const cstDate = new Date(cstMs);
  const y = cstDate.getUTCFullYear();
  const m = String(cstDate.getUTCMonth() + 1).padStart(2, "0");
  return new Date(`${y}-${m}-01T00:00:00+08:00`);
}

/**
 * Get period range (day/week/month) in Beijing time.
 * Replaces the server-local-timezone-dependent getPeriodRange() in db.ts.
 */
export function getPeriodRangeCST(period: "day" | "week" | "month"): { from: Date; to: Date } {
  const { from: todayStart, to: todayEnd } = getTodayRangeCST();
  if (period === "day") {
    return { from: todayStart, to: todayEnd };
  } else if (period === "week") {
    return { from: getWeekStartCST(), to: todayEnd };
  } else {
    return { from: getMonthStartCST(), to: todayEnd };
  }
}
