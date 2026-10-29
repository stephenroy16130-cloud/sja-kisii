export const HOUR_MS = 3_600_000;
export const WEEK_MS = 7 * 24 * HOUR_MS;
const EAT_OFFSET_MS = 3 * HOUR_MS; // Kenya is UTC+3 all year

// A week is crowned this many hours after Sunday ends, so late attendance entries still count
export const FINALIZE_GRACE_HOURS = 12;

// Monday 00:00 (Nairobi) of the week containing `date`
export function weekStartOf(date: Date): Date {
  const local = new Date(date.getTime() + EAT_OFFSET_MS);
  const daysSinceMonday = (local.getUTCDay() + 6) % 7;
  const mondayLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - daysSinceMonday);
  return new Date(mondayLocal - EAT_OFFSET_MS);
}

// Exclusive end = next Monday 00:00, so Sunday 23:59:59 is the last moment inside the week
export const weekEndOf = (start: Date) => new Date(start.getTime() + WEEK_MS);

export function currentWeek(now = new Date()) {
  const start = weekStartOf(now);
  return { start, end: weekEndOf(start) };
}

// Latest week that is over and past its grace period
export function lastFinalizableWeekStart(now = new Date()) {
  const t = new Date(now.getTime() - FINALIZE_GRACE_HOURS * HOUR_MS);
  return new Date(weekStartOf(t).getTime() - WEEK_MS);
}

export function weekLabel(start: Date) {
  const f = (d: Date) =>
    d.toLocaleDateString("en-KE", { day: "numeric", month: "short", timeZone: "Africa/Nairobi" });
  return `${f(start)} – ${f(new Date(weekEndOf(start).getTime() - 1))}`;
}
