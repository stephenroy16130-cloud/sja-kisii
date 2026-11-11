import type { Prisma, Title } from "@prisma/client";
import { after } from "next/server";
import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { notifyTitles, notifyUsers } from "@/lib/push";
import { can } from "@/lib/rbac";

const LEADERS: Title[] = ["SERGEANT", "CORPORAL"];

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requireUser();
  const { id } = await ctx.params;
  const { decision } = z.object({ decision: z.enum(["approve", "reject"]) }).parse(await req.json());

  const target = await db.user.findUnique({ where: { id } });
  if (!target) throw new HttpError(404, "User not found");
  const approve = decision === "approve";

  let data: Prisma.UserUncheckedUpdateInput;

  if (target.status === "PENDING_ADMIN") {
    // Tier 1: DO Admin
    if (!can(actor, "user:approve_registration")) throw new HttpError(403, "Only the DO Admin can do this");
    data = { status: approve ? "PENDING_CREW" : "REJECTED", approvedById: actor.id };
  } else if (target.status === "PENDING_CREW") {
    // Tier 2: a Sergeant or Corporal of the SAME crew
    let allowed = can(actor, "crew:approve_members") && actor.crewId === target.crewId;
    // A crew with no Sergeant or Corporal cannot approve anyone, so the DO Admin steps in
    if (!allowed && can(actor, "user:approve_registration") && target.crewId) {
      const leaders = await db.user.count({
        where: { crewId: target.crewId, status: "ACTIVE", titles: { hasSome: LEADERS } },
      });
      allowed = leaders === 0;
    }
    if (!allowed) throw new HttpError(403, "Only a Sergeant or Corporal of this member's crew can do this");
    data = { status: approve ? "ACTIVE" : "REJECTED", crewApprovedById: actor.id };
  } else {
    throw new HttpError(409, "This account is not awaiting review");
  }

  const updated = await db.user.update({ where: { id }, data, select: { id: true, status: true } });
  await audit(actor.id, `REGISTRATION_${approve ? "APPROVED" : "REJECTED"}`, "User", id, {
    from: target.status,
    to: updated.status,
  });

  // The DO Admin approved: tell the crew's Sergeant or Corporal it is their turn
  if (target.status === "PENDING_ADMIN" && approve && target.crewId) {
    const crewId = target.crewId;
    after(async () => {
      const payload = { title: "New member awaiting your approval", body: target.fullName, url: "/dashboard/approvals", tag: "reg2-" + id };
      const leaders = await db.user.findMany({
        where: { crewId, status: "ACTIVE", titles: { hasSome: LEADERS } },
        select: { id: true },
      });
      if (leaders.length > 0) await notifyUsers(leaders.map((l) => l.id), payload);
      else await notifyTitles(["DO_ADMIN"], payload, actor.id);
    });
  }
  return Response.json(updated);
});
