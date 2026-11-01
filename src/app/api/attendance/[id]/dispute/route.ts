import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { DISPUTE_DAYS, eventInfo, withinWindow } from "@/lib/disputes";
import { HttpError, route } from "@/lib/http";

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requireUser();
  const { id } = await ctx.params;
  const { reason } = z
    .object({ reason: z.string().trim().min(5, "Please explain why you were present").max(500) })
    .parse(await req.json());

  const r = await db.attendanceRecord.findUnique({
    where: { id },
    include: {
      meeting: { select: { title: true, startsAt: true } },
      fieldOp: { select: { title: true, startsAt: true } },
      training: { select: { title: true, heldAt: true } },
    },
  });
  // Members can only dispute their own record
  if (!r || r.userId !== actor.id) throw new HttpError(404, "Record not found");
  if (r.status !== "ABSENT") throw new HttpError(409, "Only an absence can be disputed");
  if (r.disputed) throw new HttpError(409, "You have already disputed this");

  const info = eventInfo(r);
  if (!info || !withinWindow(info.date)) {
    throw new HttpError(409, `Disputes close ${DISPUTE_DAYS} days after the event`);
  }

  const u = await db.attendanceRecord.updateMany({
    where: { id, disputed: false, status: "ABSENT" },
    data: { disputed: true, disputeReason: reason, disputeStatus: "PENDING" },
  });
  if (u.count === 0) throw new HttpError(409, "This record just changed. Refresh and try again.");

  await audit(actor.id, "ATTENDANCE_DISPUTED", "AttendanceRecord", id, { event: info.title });
  return Response.json({ id });
});
