import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { after } from "next/server";
import { HttpError, route } from "@/lib/http";
import { notifyUsers } from "@/lib/push";

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requirePermission("meeting:manage");
  const { id } = await ctx.params;
  const { decision } = z.object({ decision: z.enum(["approve", "reject"]) }).parse(await req.json());

  const apology = await db.apology.findUnique({ where: { id } });
  if (!apology) throw new HttpError(404, "Apology not found");
  if (apology.status !== "PENDING") throw new HttpError(409, "This apology was already decided");

  const updated = await db.apology.update({
    where: { id },
    data: { status: decision === "approve" ? "APPROVED" : "REJECTED", decidedById: actor.id },
    select: { id: true, status: true },
  });
  await audit(actor.id, `APOLOGY_${updated.status}`, "Apology", id, { meetingId: apology.meetingId });
  after(async () => {
    const m = await db.meeting.findUnique({ where: { id: apology.meetingId }, select: { title: true } });
    await notifyUsers([apology.userId], {
      title: updated.status === "APPROVED" ? "Apology approved" : "Apology declined",
      body: m?.title ?? "General meeting",
      url: "/dashboard/meetings/" + apology.meetingId,
      tag: "apology",
    });
  });
  return Response.json(updated);
});
