import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { hasStarted } from "@/lib/meetings";
import { can } from "@/lib/rbac";

const schema = z.object({
  records: z
    .array(z.object({ userId: z.string().min(1), status: z.enum(["PRESENT", "ABSENT"]) }))
    .min(1)
    .max(400),
});

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requireUser();
  const { id } = await ctx.params;
  const { records } = schema.parse(await req.json());

  const training = await db.training.findUnique({ where: { id } });
  if (!training) throw new HttpError(404, "Training record not found");

  const verifier = can(actor, "training:verify");
  if (training.createdById !== actor.id && !verifier) {
    throw new HttpError(403, "Only the creator of this record or DO Training can record attendance");
  }
  if (training.status === "REJECTED") throw new HttpError(409, "This record was rejected");
  if (training.status === "VERIFIED" && !verifier) {
    throw new HttpError(409, "Verified records are locked. Ask DO Training to change them.");
  }
  if (!hasStarted(training.heldAt)) throw new HttpError(409, "Attendance opens when the session starts");

  // Crew First Aid: that crew. Drills (no crew): every active member who belongs to a crew.
  const members = await db.user.findMany({
    where: { status: "ACTIVE", isDeveloper: false, crewId: training.crewId ?? { not: null } },
    select: { id: true, crewId: true },
  });
  const crewOf = new Map(members.map((m) => [m.id, m.crewId]));
  if (records.some((r) => !crewOf.has(r.userId))) {
    throw new HttpError(403, "Some of those members are not part of this session");
  }

  const existing = await db.attendanceRecord.findMany({
    where: { trainingId: id, userId: { in: records.map((r) => r.userId) } },
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
          data: {
            eventType: "TRAINING",
            trainingId: id,
            userId: r.userId,
            crewId: crewOf.get(r.userId) ?? null,
            status: r.status,
            recordedById: actor.id,
          },
        });
  });
  await db.$transaction(ops);

  await audit(actor.id, "TRAINING_ATTENDANCE_RECORDED", "Training", id, { count: records.length });
  return Response.json({ saved: records.length });
});
