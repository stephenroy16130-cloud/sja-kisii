import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { after } from "next/server";
import { HttpError, route } from "@/lib/http";
import { notifyUsers } from "@/lib/push";
import { can } from "@/lib/rbac";

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requireUser();
  const { id } = await ctx.params;
  const { decision } = z.object({ decision: z.enum(["approve", "reject"]) }).parse(await req.json());

  const r = await db.attendanceRecord.findUnique({ where: { id } });
  if (!r || !r.disputed) throw new HttpError(404, "Dispute not found");
  if (r.disputeStatus !== "PENDING") throw new HttpError(409, "This dispute was already decided");

  // The DO who owns that kind of event decides
  const allowed =
    (r.eventType === "MEETING" && can(actor, "meeting:manage")) ||
    (r.eventType === "FIELD_OP" && can(actor, "fieldop:manage")) ||
    (r.eventType === "TRAINING" && can(actor, "training:verify"));
  if (!allowed) throw new HttpError(403, "You do not decide disputes for this kind of event");

  const approve = decision === "approve";
  const u = await db.attendanceRecord.updateMany({
    where: { id, disputeStatus: "PENDING" },
    data: {
      disputeStatus: approve ? "APPROVED" : "REJECTED",
      ...(approve && r.status === "ABSENT" ? { status: "PRESENT" as const, recordedById: actor.id } : {}),
    },
  });
  if (u.count === 0) throw new HttpError(409, "This dispute just changed. Refresh and try again.");

  await audit(actor.id, approve ? "DISPUTE_APPROVED" : "DISPUTE_REJECTED", "AttendanceRecord", id, {
    eventType: r.eventType,
    memberId: r.userId,
  });
  after(() =>
    notifyUsers([r.userId], {
      title: approve ? "Attendance dispute approved" : "Attendance dispute declined",
      body: approve ? "You have been marked present." : "Your absence stands.",
      url: "/dashboard/attendance",
      tag: "dispute",
    })
  );
  return Response.json({ id, decision });
});
