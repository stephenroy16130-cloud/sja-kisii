import type { InstrumentStatus, TrainingType, TransactionPurpose, VerificationStatus } from "@prisma/client";
import { BAND_TITLES } from "./band";
import { db } from "./db";
import { WEEK_MS, weekStartOf } from "./weeks";

export const TREND_WEEKS = 8;
const DAY = 86_400_000;

export function weekStarts(n = TREND_WEEKS): Date[] {
  const first = weekStartOf(new Date()).getTime() - (n - 1) * WEEK_MS;
  return Array.from({ length: n }, (_, i) => new Date(first + i * WEEK_MS));
}
export const shortDate = (d: Date) =>
  d.toLocaleDateString("en-KE", { day: "numeric", month: "short", timeZone: "Africa/Nairobi" });

const weekIndex = (d: Date, first: Date, n: number) =>
  Math.min(n - 1, Math.max(0, Math.floor((d.getTime() - first.getTime()) / WEEK_MS)));

export type CrewTrend = { crewId: number; rates: (number | null)[]; present: number; absent: number; rate: number | null };
export type AtRisk = { userId: string; name: string; crewId: number | null; present: number; total: number };

export async function attendanceAnalytics(scope: { all: boolean; crewId: number | null }) {
  const weeks = weekStarts();
  const first = weeks[0];
  const cutoff = new Date(Date.now() - 30 * DAY);

  const rows = await db.attendanceRecord.findMany({
    where: {
      crewId: { not: null },
      status: { in: ["PRESENT", "ABSENT"] }, // excused absences never count against anyone
      OR: [
        { meeting: { startsAt: { gte: first } } },
        { fieldOp: { startsAt: { gte: first } } },
        { training: { heldAt: { gte: first }, status: "VERIFIED" } },
      ],
    },
    select: {
      userId: true, crewId: true, status: true,
      meeting: { select: { startsAt: true } },
      fieldOp: { select: { startsAt: true } },
      training: { select: { heldAt: true } },
    },
  });

  const cell = new Map<string, { p: number; a: number }>();
  const mine = new Map<string, { p: number; a: number }>();
  for (const r of rows) {
    const d = r.meeting?.startsAt ?? r.fieldOp?.startsAt ?? r.training?.heldAt;
    if (!d || r.crewId === null) continue;
    const k = `${r.crewId}:${weekIndex(d, first, weeks.length)}`;
    const c = cell.get(k) ?? { p: 0, a: 0 };
    if (r.status === "PRESENT") c.p++;
    else c.a++;
    cell.set(k, c);

    if (d >= cutoff && (scope.all || (scope.crewId !== null && r.crewId === scope.crewId))) {
      const u = mine.get(r.userId) ?? { p: 0, a: 0 };
      if (r.status === "PRESENT") u.p++;
      else u.a++;
      mine.set(r.userId, u);
    }
  }

  const crews: CrewTrend[] = [1, 2, 3, 4].map((crewId) => {
    let present = 0;
    let absent = 0;
    const rates = weeks.map((_, i) => {
      const c = cell.get(`${crewId}:${i}`);
      if (!c) return null;
      present += c.p;
      absent += c.a;
      return c.p + c.a ? c.p / (c.p + c.a) : null;
    });
    return { crewId, rates, present, absent, rate: present + absent ? present / (present + absent) : null };
  });

  const rate = (v: { p: number; a: number }) => v.p / (v.p + v.a);
  const flagged = [...mine.entries()]
    .filter(([, v]) => v.p + v.a >= 3 && rate(v) < 0.5)
    .sort((x, y) => rate(x[1]) - rate(y[1]) || y[1].p + y[1].a - (x[1].p + x[1].a))
    .slice(0, 15);
  const users = flagged.length
    ? await db.user.findMany({
        where: { id: { in: flagged.map(([id]) => id) }, status: "ACTIVE" },
        select: { id: true, fullName: true, crewId: true },
      })
    : [];
  const byId = new Map(users.map((u) => [u.id, u]));
  const atRisk: AtRisk[] = flagged.flatMap(([id, v]) => {
    const u = byId.get(id);
    return u ? [{ userId: id, name: u.fullName, crewId: u.crewId, present: v.p, total: v.p + v.a }] : [];
  });

  return { weeks, crews, atRisk };
}

export type Money = Record<TransactionPurpose, number>;

export async function financeAnalytics() {
  const weeks = weekStarts();
  const rows = await db.transaction.findMany({
    where: { createdAt: { gte: weeks[0] }, status: { in: ["SUCCESS", "FAILED", "CANCELLED"] } },
    select: { purpose: true, amount: true, status: true, createdAt: true },
  });
  const byWeek: Money[] = weeks.map(() => ({ REGISTRATION_FEE: 0, STORE_ORDER: 0, CREW_EVENT: 0, COLLECTION: 0 }));
  let total = 0;
  let ok = 0;
  let notOk = 0;
  for (const r of rows) {
    if (r.status === "SUCCESS") {
      const amt = Number(String(r.amount));
      byWeek[weekIndex(r.createdAt, weeks[0], weeks.length)][r.purpose] += amt;
      total += amt;
      ok++;
    } else {
      notOk++;
    }
  }
  return { weeks, byWeek, total, ok, notOk };
}

export async function trainingAnalytics() {
  const since = new Date(Date.now() - 90 * DAY);
  const [sessions, att] = await Promise.all([
    db.training.groupBy({ by: ["type", "status"], where: { heldAt: { gte: since } }, _count: { _all: true } }),
    db.attendanceRecord.groupBy({
      by: ["status"],
      where: {
        eventType: "TRAINING",
        status: { in: ["PRESENT", "ABSENT"] },
        training: { heldAt: { gte: since }, status: "VERIFIED" },
      },
      _count: { _all: true },
    }),
  ]);
  const n = (type: TrainingType, status: VerificationStatus) =>
    sessions.find((s) => s.type === type && s.status === status)?._count._all ?? 0;
  const table = (["DRILL", "FIRST_AID"] as TrainingType[]).map((type) => ({
    type,
    verified: n(type, "VERIFIED"),
    pending: n(type, "PENDING"),
    rejected: n(type, "REJECTED"),
  }));
  const p = att.find((a) => a.status === "PRESENT")?._count._all ?? 0;
  const a = att.find((x) => x.status === "ABSENT")?._count._all ?? 0;
  return { table, rate: p + a ? p / (p + a) : null, records: p + a };
}

export async function bandAnalytics() {
  const [byStatus, longest, members] = await Promise.all([
    db.bandInstrument.groupBy({ by: ["status"], _count: { _all: true } }),
    db.instrumentIssuanceLog.findMany({
      where: { returnedAt: null, markedLost: false },
      orderBy: { issuedAt: "asc" },
      take: 5,
      include: { instrument: { select: { name: true } }, issuedTo: { select: { fullName: true } } },
    }),
    db.user.count({ where: { status: "ACTIVE", isDeveloper: false, titles: { hasSome: BAND_TITLES } } }),
  ]);
  const count = (s: InstrumentStatus) => byStatus.find((b) => b.status === s)?._count._all ?? 0;
  return {
    available: count("AVAILABLE"),
    issued: count("ISSUED"),
    damaged: count("DAMAGED"),
    lost: count("LOST"),
    members,
    longest: longest.map((l) => ({
      id: l.id,
      instrument: l.instrument.name,
      holder: l.issuedTo.fullName,
      days: Math.floor((Date.now() - l.issuedAt.getTime()) / DAY),
    })),
  };
}
