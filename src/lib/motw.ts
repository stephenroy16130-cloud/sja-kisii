import type { AttendanceStatus, EventType } from "@prisma/client";
import { db } from "./db";
import { currentWeek, lastFinalizableWeekStart, weekEndOf, weekLabel, weekStartOf, WEEK_MS } from "./weeks";

export const POINTS: Record<EventType, number> = { MEETING: 10, FIELD_OP: 15, TRAINING: 10 };
export const PERFECT_WEEK_BONUS = 5;
const MAX_LOOKBACK_WEEKS = 52;

export type Standing = {
  userId: string;
  fullName: string;
  crewId: number | null;
  points: number;
  optional: number; // Field Ops + Training attended
  perfect: boolean;
  joinedAt: number;
};

type Rec = { type: EventType; status: AttendanceStatus };

// Standings for one week, sorted: points, then optional activities, then earliest member
export async function computeStandings(start: Date, end: Date): Promise<Standing[]> {
  const range = { gte: start, lt: end };
  const records = await db.attendanceRecord.findMany({
    where: {
      OR: [
        { meeting: { startsAt: range } },
        { fieldOp: { startsAt: range } },
        { training: { heldAt: range, status: "VERIFIED" } }, // only verified training counts
      ],
    },
    select: {
      userId: true, crewId: true, eventType: true, status: true,
      meetingId: true, fieldOpId: true, trainingId: true,
    },
  });
  if (records.length === 0) return [];

  // Which events each crew had attendance taken for, and what each member's record says
  const crewEvents = new Map<number | null, Set<string>>();
  const byUser = new Map<string, Map<string, Rec>>();
  for (const r of records) {
    const id = r.meetingId ?? r.fieldOpId ?? r.trainingId;
    if (!id) continue;
    const key = `${r.eventType}:${id}`;

    let set = crewEvents.get(r.crewId);
    if (!set) { set = new Set(); crewEvents.set(r.crewId, set); }
    set.add(key);

    let mine = byUser.get(r.userId);
    if (!mine) { mine = new Map(); byUser.set(r.userId, mine); }
    mine.set(key, { type: r.eventType, status: r.status });
  }

  const users = await db.user.findMany({
    where: { id: { in: [...byUser.keys()] }, status: "ACTIVE", isDeveloper: false },
    select: { id: true, fullName: true, crewId: true, createdAt: true },
  });

  const out: Standing[] = [];
  for (const u of users) {
    const mine = byUser.get(u.id);
    if (!mine) continue;

    let points = 0;
    let optional = 0;
    for (const rec of mine.values()) {
      if (rec.status !== "PRESENT") continue;
      points += POINTS[rec.type];
      if (rec.type !== "MEETING") optional++;
    }
    if (points === 0) continue;

    // Perfect week: present at every event the crew had attendance taken for (excused ones skipped)
    let applicable = 0;
    let present = 0;
    for (const key of crewEvents.get(u.crewId) ?? []) {
      const rec = mine.get(key);
      if (rec?.status === "EXCUSED") continue;
      applicable++;
      if (rec?.status === "PRESENT") present++;
    }
    const perfect = applicable > 0 && present === applicable;
    if (perfect) points += PERFECT_WEEK_BONUS;

    out.push({
      userId: u.id, fullName: u.fullName, crewId: u.crewId,
      points, optional, perfect, joinedAt: u.createdAt.getTime(),
    });
  }

  out.sort((a, b) => b.points - a.points || b.optional - a.optional || a.joinedAt - b.joinedAt);
  return out;
}

// Crowns every finished week that has no result yet. Safe to call often (one cheap query when up to date).
export async function finalizeCompletedWeeks() {
  const lastFinal = lastFinalizableWeekStart();
  const latest = await db.weeklyResult.findFirst({ orderBy: { weekStart: "desc" }, select: { weekStart: true } });
  if (latest && latest.weekStart.getTime() >= lastFinal.getTime()) return;

  let from: Date;
  if (latest) {
    from = new Date(latest.weekStart.getTime() + WEEK_MS);
  } else {
    const [m, f, t] = await Promise.all([
      db.meeting.aggregate({ _min: { startsAt: true } }),
      db.fieldOp.aggregate({ _min: { startsAt: true } }),
      db.training.aggregate({ _min: { heldAt: true } }),
    ]);
    const dates = [m._min.startsAt, f._min.startsAt, t._min.heldAt].filter((d): d is Date => d !== null);
    if (dates.length === 0) return;
    from = weekStartOf(new Date(Math.min(...dates.map((d) => d.getTime()))));
  }
  const floor = new Date(lastFinal.getTime() - MAX_LOOKBACK_WEEKS * WEEK_MS);
  if (from.getTime() < floor.getTime()) from = floor;

  for (let ws = from; ws.getTime() <= lastFinal.getTime(); ws = new Date(ws.getTime() + WEEK_MS)) {
    const standings = await computeStandings(ws, weekEndOf(ws));
    const top = standings[0];
    await db.weeklyResult.upsert({
      where: { weekStart: ws },
      update: {},
      create: {
        weekStart: ws,
        weekEnd: weekEndOf(ws),
        winnerId: top?.userId ?? null,
        points: top?.points ?? 0,
        optionalCount: top?.optional ?? 0,
        perfectWeek: top?.perfect ?? false,
        topFive: standings.slice(0, 5).map((s) => ({
          userId: s.userId, name: s.fullName, points: s.points, optional: s.optional, perfect: s.perfect,
        })),
      },
    });
  }
}

// Everything the dashboard needs for Hall of Fame and the Trophy Case
export async function loadMotw(userId: string) {
  try {
    await finalizeCompletedWeeks();
  } catch (e) {
    console.error("Member of the Week finalize failed", e);
  }

  const { start, end } = currentWeek();
  const [standings, lastResult, winCounts, myHistory] = await Promise.all([
    computeStandings(start, end),
    db.weeklyResult.findFirst({
      where: { winnerId: { not: null } },
      orderBy: { weekStart: "desc" },
      include: { winner: { select: { id: true, fullName: true, crewId: true } } },
    }),
    db.weeklyResult.groupBy({ by: ["winnerId"], where: { winnerId: { not: null } }, _count: { _all: true } }),
    db.weeklyResult.findMany({
      where: { winnerId: userId },
      orderBy: { weekStart: "desc" },
      take: 5,
      select: { weekStart: true, points: true },
    }),
  ]);

  const wins = new Map<string, number>();
  for (const w of winCounts) if (w.winnerId) wins.set(w.winnerId, w._count._all);

  const mineIdx = standings.findIndex((s) => s.userId === userId);

  return {
    hall: {
      weekLabel: weekLabel(start),
      leaders: standings.slice(0, 3).map((s) => ({
        userId: s.userId, fullName: s.fullName, crewId: s.crewId, points: s.points, wins: wins.get(s.userId) ?? 0,
      })),
      last: lastResult?.winner
        ? {
            userId: lastResult.winner.id,
            fullName: lastResult.winner.fullName,
            crewId: lastResult.winner.crewId,
            points: lastResult.points,
            wins: wins.get(lastResult.winner.id) ?? 0,
            weekLabel: weekLabel(lastResult.weekStart),
          }
        : null,
    },
    myWins: wins.get(userId) ?? 0,
    myHistory: myHistory.map((h) => ({ weekLabel: weekLabel(h.weekStart), points: h.points })),
    myWeek: {
      points: mineIdx >= 0 ? standings[mineIdx].points : 0,
      rank: mineIdx >= 0 ? mineIdx + 1 : null,
      perfect: mineIdx >= 0 ? standings[mineIdx].perfect : false,
    },
  };
}
