import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { LEADER_TITLES, targetCrewIds } from "@/lib/fieldops";
import { HttpError, route } from "@/lib/http";
import { hasStarted } from "@/lib/meetings";

const schema = z.object({
  crewId: z.number().int().min(1).max(4),
  records: z
    .array(z.object({ userId: z.string().min(1), status: z.enum(["PRESENT", "ABSENT"]) }))
    .min(1)
    .max(300),
});

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requirePermission("crew:record_attendance");
  if (!actor.crewId) throw new HttpError(400, "You are not assigned to a crew");

  const { id } = await ctx.params;
  const { crewId, records } = schema.parse(await req.json());

  const op = await db.fieldOp.findUnique({ where: { id }, include: { crews: { select: { id: true } } } });
  if (!op) throw new HttpError(404, "Operation not found");
  if (!hasStarted(op.startsAt)) throw new HttpError(409, "Attendance opens when the operation starts");
  if (!targetCrewIds(op).includes(crewId)) throw new HttpError(400, "This operation does not include that crew");

  // Cross-crew override: only a leader who is present, and only if no leader of that crew is present
  const override = crewId !== actor.crewId;
  if (override) {
    const me = await db.attendanceRecord.findUnique({
      where: { userId_fieldOpId: { userId: actor.id, fieldOpId: id } },
      select: { status: true },
    });
    if (me?.status !== "PRESENT") {
      throw new HttpError(403, "Only a Sergeant or Corporal who is marked present can record for another crew");
    }
    const leadersPresent = await db.attendanceRecord.count({
      where: { fieldOpId: id, status: "PRESENT", user: { crewId, titles: { hasSome: LEADER_TITLES } } },
    });
    if (leadersPresent > 0) {
      throw new HttpError(409, "That crew's leader is present and can record their own attendance");
    }
  }

  // Only active members of the crew being recorded
  const members = await db.user.findMany({
    where: { crewId, status: "ACTIVE", isDeveloper: false },
    select: { id: true },
  });
  const allowed = new Set(members.map((m) => m.id));
  if (records.some((r) => !allowed.has(r.userId))) {
    throw new HttpError(403, "Those members are not in the crew you are recording");
  }

  const ids = records.map((r) => r.userId);
  const existing = await db.attendanceRecord.findMany({
    where: { fieldOpId: id, userId: { in: ids } },
    select: { id: true, userId: true },
  });
  const existingByUser = new Map(existing.map((e) => [e.userId, e.id]));

  const ops = records.map((r) => {
    const existingId = existingByUser.get(r.userId);
    return existingId
      ? db.attendanceRecord.update({
          where: { id: existingId },
          data: { status: r.status, recordedById: actor.id, recordedAt: new Date() },
        })
      : db.attendanceRecord.create({
          data: { eventType: "FIELD_OP", fieldOpId: id, userId: r.userId, crewId, status: r.status, recordedById: actor.id },
        });
  });
  await db.$transaction(ops);

  await audit(actor.id, "FIELDOP_ATTENDANCE_RECORDED", "FieldOp", id, { crewId, count: records.length, override });
  return Response.json({ saved: records.length, override });
});
