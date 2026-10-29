import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { hasStarted } from "@/lib/meetings";

const schema = z.object({
  records: z
    .array(z.object({ userId: z.string().min(1), status: z.enum(["PRESENT", "ABSENT"]) }))
    .min(1)
    .max(300),
});

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requirePermission("crew:record_attendance");
  const crewId = actor.crewId;
  if (!crewId) throw new HttpError(400, "You are not assigned to a crew");

  const { id } = await ctx.params;
  const { records } = schema.parse(await req.json());

  const meeting = await db.meeting.findUnique({ where: { id } });
  if (!meeting) throw new HttpError(404, "Meeting not found");
  if (meeting.archivedAt) throw new HttpError(409, "This meeting is archived");
  if (!hasStarted(meeting.startsAt)) throw new HttpError(409, "Attendance opens when the meeting starts");

  // Only members of the leader's own crew
  const members = await db.user.findMany({
    where: { crewId, status: "ACTIVE", isDeveloper: false },
    select: { id: true },
  });
  const allowed = new Set(members.map((m) => m.id));
  if (records.some((r) => !allowed.has(r.userId))) {
    throw new HttpError(403, "You can only record attendance for your own crew");
  }

  const ids = records.map((r) => r.userId);
  const [existing, excusedRows] = await Promise.all([
    db.attendanceRecord.findMany({ where: { meetingId: id, userId: { in: ids } }, select: { id: true, userId: true } }),
    db.apology.findMany({ where: { meetingId: id, status: "APPROVED", userId: { in: ids } }, select: { userId: true } }),
  ]);
  const existingByUser = new Map(existing.map((e) => [e.userId, e.id]));
  const excused = new Set(excusedRows.map((e) => e.userId));

  const ops = records.map((r) => {
    const status = excused.has(r.userId) ? ("EXCUSED" as const) : r.status;
    const existingId = existingByUser.get(r.userId);
    return existingId
      ? db.attendanceRecord.update({
          where: { id: existingId },
          data: { status, recordedById: actor.id, recordedAt: new Date() },
        })
      : db.attendanceRecord.create({
          data: { eventType: "MEETING", meetingId: id, userId: r.userId, crewId, status, recordedById: actor.id },
        });
  });
  await db.$transaction(ops);

  await audit(actor.id, "MEETING_ATTENDANCE_RECORDED", "Meeting", id, { crewId, count: records.length });
  return Response.json({ saved: records.length });
});
