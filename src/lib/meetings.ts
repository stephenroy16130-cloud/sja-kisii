export const LOCK_HOURS = 2;

export const lockTime = (startsAt: Date) => new Date(startsAt.getTime() - LOCK_HOURS * 60 * 60 * 1000);
export const isApologyLocked = (startsAt: Date, now = new Date()) => now >= lockTime(startsAt);
export const hasStarted = (startsAt: Date, now = new Date()) => now >= startsAt;

export const fmt = (d: Date) =>
  d.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" });
