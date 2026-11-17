import type { Prisma } from "@prisma/client";
import { db } from "./db";

const EAT = 3 * 3_600_000; // Nairobi is three hours ahead of UTC
const DAY = 86_400_000;
const WEEK = 7 * DAY;

// Monday 00:00 Nairobi time of the week a date falls in, as a plain number for grouping
function weekKey(d: Date): number {
  const t = new Date(d.getTime() + EAT);
  const dow = (t.getUTCDay() + 6) % 7; // Monday is 0
  t.setUTCHours(0, 0, 0, 0);
  return t.getTime() - dow * DAY;
}
const weekLabel = (key: number) =>
  new Date(key).toLocaleDateString("en-KE", { day: "numeric", month: "short", timeZone: "UTC" });
const lastWeeks = (n: number) => {
  const cur = weekKey(new Date());
  return Array.from({ length: n }, (_, i) => cur - (n - 1 - i) * WEEK);
};

export type Kind = "MEETING" | "FIELD_OP" | "TRAINING" | "BAND";
export const KIND_WORD: Record<Kind, string> = {
  MEETING: "Meetings",
  FIELD_OP: "Field operations",
  TRAINING: "Training",
  BAND: "Band practice",
};

const rowSelect = {
  status: true,
  eventType: true,
  crewId: true,
  meeting: { select: { id: true, title: true, startsAt: true } },
  fieldOp: { select: { id: true, title: true, startsAt: true } },
  training: { select: { id: true, title: true, heldAt: true, type: true, status: true } },
} satisfies Prisma.AttendanceRecordSelect;
type Row = Prisma.AttendanceRecordGetPayload<{ select: typeof rowSelect }>;

type Norm = { kind: Kind; status: string; at: Date; title: string; key: string; crewId: number | null };

// One simple shape for any attendance record. Only verified training counts.
function norm(r: Row): Norm | null {
  if (r.eventType === "MEETING" && r.meeting) {
    return { kind: "MEETING", status: r.status, at: r.meeting.startsAt, title: r.meeting.title, key: "M" + r.meeting.id, crewId: r.crewId };
  }
  if (r.eventType === "FIELD_OP" && r.fieldOp) {
    return { kind: "FIELD_OP", status: r.status, at: r.fieldOp.startsAt, title: r.fieldOp.title, key: "F" + r.fieldOp.id, crewId: r.crewId };
  }
  if (r.eventType === "TRAINING" && r.training && r.training.status === "VERIFIED") {
    return {
      kind: r.training.type === "BAND" ? "BAND" : "TRAINING",
      status: r.status,
      at: r.training.heldAt,
      title: r.training.title,
      key: "T" + r.training.id,
      crewId: r.crewId,
    };
  }
  return null;
}
const notNull = (x: Norm | null): x is Norm => x !== null;
const isPresent = (i: Norm) => i.status === "PRESENT";

function weekly(items: Norm[], n = 8) {
  return lastWeeks(n).map((key) => {
    const w = items.filter((i) => weekKey(i.at) === key);
    return {
      key,
      label: weekLabel(key),
      present: w.filter(isPresent).length,
      absent: w.filter((i) => i.status === "ABSENT").length,
    };
  });
}

function byKind(items: Norm[]) {
  return (Object.keys(KIND_WORD) as Kind[]).map((k) => {
    const c = items.filter((i) => i.kind === k);
    return { kind: k, label: KIND_WORD[k], present: c.filter(isPresent).length, total: c.length };
  });
}

// One member's own record
export async function personalInsights(userId: string) {
  const rows = await db.attendanceRecord.findMany({ where: { userId }, select: rowSelect, take: 1000 });
  const all = rows.map(norm).filter(notNull);
  // Excused events are left out: they count neither for nor against
  const counted = all.filter((i) => i.status === "PRESENT" || i.status === "ABSENT");
  const sorted = [...counted].sort((a, b) => b.at.getTime() - a.at.getTime());

  let streak = 0;
  for (const i of sorted) {
    if (isPresent(i)) streak++;
    else break;
  }
  let best = 0;
  let run = 0;
  for (const i of [...sorted].reverse()) {
    if (isPresent(i)) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }

  return {
    present: counted.filter(isPresent).length,
    total: counted.length,
    excused: all.filter((i) => i.status === "EXCUSED").length,
    kinds: byKind(counted),
    weeks: weekly(counted),
    streak,
    best,
  };
}

// A crew's record, or every crew's when crewId is null
export async function divisionInsights(crewId: number | null) {
  const now = Date.now();
  const since = new Date(now - 8 * WEEK);
  const rows = await db.attendanceRecord.findMany({
    where: {
      status: { in: ["PRESENT", "ABSENT"] },
      ...(crewId ? { crewId } : {}),
      OR: [
        { meeting: { startsAt: { gte: since } } },
        { fieldOp: { startsAt: { gte: since } } },
        { training: { heldAt: { gte: since }, status: "VERIFIED" } },
      ],
    },
    select: rowSelect,
    take: 6000,
  });
  const items = rows.map(norm).filter(notNull);
  const month = items.filter((i) => i.at.getTime() >= now - 30 * DAY);

  const events = new Map<string, { title: string; kind: Kind; at: Date; present: number; total: number }>();
  for (const i of items) {
    const e = events.get(i.key) ?? { title: i.title, kind: i.kind, at: i.at, present: 0, total: 0 };
    e.total++;
    if (isPresent(i)) e.present++;
    events.set(i.key, e);
  }

  return {
    overall: { present: month.filter(isPresent).length, total: month.length },
    crews: [1, 2, 3, 4].map((c) => {
      const x = month.filter((i) => i.crewId === c);
      return { crewId: c, present: x.filter(isPresent).length, total: x.length };
    }),
    kinds: byKind(month),
    weeks: weekly(items),
    recent: [...events.values()].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 8),
  };
}
