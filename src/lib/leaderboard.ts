import { db } from "./db";

export type CrewRate = { crewId: number; present: number; absent: number; rate: number | null };

// Attendance rate per crew over the last `days` days: meetings, field ops and VERIFIED training.
// Excused absences are left out so a granted apology never hurts a crew.
export async function crewLeaderboard(days = 30): Promise<CrewRate[]> {
  const since = new Date(Date.now() - days * 86_400_000);
  const rows = await db.attendanceRecord.groupBy({
    by: ["crewId", "status"],
    where: {
      crewId: { not: null },
      status: { in: ["PRESENT", "ABSENT"] },
      OR: [
        { meeting: { startsAt: { gte: since } } },
        { fieldOp: { startsAt: { gte: since } } },
        { training: { heldAt: { gte: since }, status: "VERIFIED" } },
      ],
    },
    _count: { _all: true },
  });

  const out: CrewRate[] = [1, 2, 3, 4].map((crewId) => {
    const n = (s: string) => rows.find((r) => r.crewId === crewId && r.status === s)?._count._all ?? 0;
    const present = n("PRESENT");
    const absent = n("ABSENT");
    const total = present + absent;
    return { crewId, present, absent, rate: total > 0 ? present / total : null };
  });

  return out.sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));
}

// A leader holds any title other than plain Band Member, or is the Superintendent
export const isLeader = (u: { titles: string[]; isSuperintendent: boolean }) =>
  u.isSuperintendent || u.titles.some((t) => t !== "BAND_MEMBER");
