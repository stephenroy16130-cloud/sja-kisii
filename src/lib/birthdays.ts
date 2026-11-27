// Wishes can be sent, and are shown to the birthday member, for this many days after the birthday
export const GRACE = 0;
// The page where wish notifications open. Change it if your Overview page has a different address.
export const BIRTHDAY_PATH = "/dashboard";

const DAY = 86_400_000;
const EAT = 3 * 3_600_000;
const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

export const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

// Today's date in Nairobi, as midnight UTC of that date
function nairobiToday(now = Date.now()) {
  const t = new Date(now + EAT);
  return Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
}

// The birthday nearest to today that is not more than GRACE days in the past.
// days: 0 is today, negative is past, positive is still to come. Only day and month are used, never the year.
export function birthdayWindow(dob: Date, now = Date.now()): { days: number; year: number; date: Date } {
  const today = nairobiToday(now);
  const y = new Date(today).getUTCFullYear();
  const m = dob.getUTCMonth();
  const d0 = dob.getUTCDate();
  let best: { days: number; year: number; date: Date } | null = null;
  for (const yr of [y - 1, y, y + 1]) {
    const d = m === 1 && d0 === 29 && !leap(yr) ? 28 : d0; // 29 February is marked on the 28th in other years
    const at = Date.UTC(yr, m, d);
    const days = Math.round((at - today) / DAY);
    if (days >= -GRACE && (!best || days < best.days)) best = { days, year: yr, date: new Date(at) };
  }
  return best ?? { days: 999, year: y + 1, date: new Date(today) };
}

export function whenLabel(days: number, date: Date) {
  if (days === 0) return "Today";
  if (days === -1) return "Yesterday";
  if (days < 0) return `${-days} days ago`;
  if (days === 1) return "Tomorrow";
  return date.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}
