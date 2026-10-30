import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { TX_OPTS } from "@/lib/store";

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requirePermission("crew:approve_membership_change");
  const { id } = await ctx.params;
  const { decision } = z.object({ decision: z.enum(["approve", "reject"]) }).parse(await req.json());

  const r = await db.membershipRequest.findUnique({ where: { id }, include: { targetUser: true } });
  if (!r) throw new HttpError(404, "Request not found");
  if (r.status !== "PENDING") throw new HttpError(409, "This request was already decided");

  if (decision === "reject") {
    await db.membershipRequest.update({ where: { id }, data: { status: "REJECTED", decidedById: actor.id } });
  } else {
    const t = r.targetUser;
    if (t.status !== "ACTIVE" || t.titles.length > 0) throw new HttpError(409, "This member can no longer be moved this way");
    if (r.action === "REMOVE" && t.crewId !== r.crewId) throw new HttpError(409, "They are no longer in that crew");

    await db.$transaction(async (tx) => {
      const u = await tx.membershipRequest.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "APPROVED", decidedById: actor.id },
      });
      if (u.count === 0) throw new HttpError(409, "This request just changed. Refresh and try again.");
      await tx.user.update({
        where: { id: t.id },
        data: { crewId: r.action === "ADD" ? r.crewId : null },
      });
    }, TX_OPTS);
  }

  await audit(actor.id, `MEMBERSHIP_${decision === "approve" ? "APPROVED" : "REJECTED"}`, "MembershipRequest", id, {
    action: r.action,
    crewId: r.crewId,
    targetUserId: r.targetUserId,
  });
  return Response.json({ id, decision });
});
