import type { AttendanceStatus, EventType } from "@prisma/client";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { computeStandings } from "@/lib/motw";
import { calcAge, displayName, officialPhoto, socialPhoto } from "@/lib/profile";
import { currentWeek, weekLabel } from "@/lib/weeks";

// DO Admin only. Opening a member's official details is recorded in the audit log.
export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requirePermission("user:manage_accounts");
  const { id } = await ctx.params;

  const u = await db.user.findUnique({
    where: { id },
    select: {
      id: true, fullName: true, preferredName: true, email: true, phone: true,
      dateOfBirth: true, gender: true, idType: true, idNumber: true, crewId: true,
      titles: true, isSuperintendent: true, isDeveloper: true, status: true, createdAt: true,
      officialPhotoAt: true, socialPhotoAt: true,
    },
  });
  if (!u || u.isDeveloper) throw new HttpError(404, "Member not found");

  const { start, end } = currentWeek();
  const [trophies, history, grouped, standings] = await Promise.all([
    db.weeklyResult.count({ where: { winnerId: id } }),
    db.weeklyResult.findMany({
      where: { winnerId: id },
      orderBy: { weekStart: "desc" },
      take: 5,
      select: { weekStart: true, points: true },
    }),
    db.attendanceRecord.groupBy({
      by: ["eventType", "status"],
      where: {
        userId: id,
        OR: [{ eventType: "MEETING" }, { eventType: "FIELD_OP" }, { eventType: "TRAINING", training: { status: "VERIFIED" } }],
      },
      _count: { _all: true },
    }),
    computeStandings(start, end),
  ]);

  const counts: Record<EventType, Record<AttendanceStatus, number>> = {
    MEETING: { PRESENT: 0, ABSENT: 0, EXCUSED: 0 },
    FIELD_OP: { PRESENT: 0, ABSENT: 0, EXCUSED: 0 },
    TRAINING: { PRESENT: 0, ABSENT: 0, EXCUSED: 0 },
  };
  for (const g of grouped) counts[g.eventType][g.status] = g._count._all;

  let present = 0;
  let absent = 0;
  for (const c of Object.values(counts)) {
    present += c.PRESENT;
    absent += c.ABSENT;
  }
  const idx = standings.findIndex((s) => s.userId === id);

  await audit(actor.id, "MEMBER_OFFICIAL_VIEWED", "User", id);

  return Response.json({
    official: {
      fullName: u.fullName,
      dateOfBirth: u.dateOfBirth ? u.dateOfBirth.toISOString().slice(0, 10) : null,
      age: u.dateOfBirth ? calcAge(u.dateOfBirth) : null,
      gender: u.gender,
      phone: u.phone,
      email: u.email,
      idType: u.idType,
      idNumber: u.idNumber,
      photo: officialPhoto(u),
      status: u.status,
      joinedAt: u.createdAt.toISOString(),
    },
    social: {
      preferredName: u.preferredName,
      displayName: displayName(u),
      photo: socialPhoto(u),
      crewId: u.crewId,
      trophies,
      titles: u.titles,
      isSuperintendent: u.isSuperintendent,
    },
    activity: {
      counts,
      rate: present + absent > 0 ? present / (present + absent) : null,
      week: { points: idx >= 0 ? standings[idx].points : 0, rank: idx >= 0 ? idx + 1 : null },
      wins: history.map((h) => ({ weekLabel: weekLabel(h.weekStart), points: h.points })),
    },
  });
});
