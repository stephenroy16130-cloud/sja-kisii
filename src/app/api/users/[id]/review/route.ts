import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { can } from "@/lib/rbac";

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
    // Tier 2: Crew Leader of the SAME crew only
    if (!can(actor, "crew:approve_members") || actor.crewId !== target.crewId) {
      throw new HttpError(403, "Only a Sergeant or Corporal of this member's crew can do this");
    }
    data = { status: approve ? "ACTIVE" : "REJECTED", crewApprovedById: actor.id };
  } else {
    throw new HttpError(409, "This account is not awaiting review");
  }

  const updated = await db.user.update({ where: { id }, data, select: { id: true, status: true } });
  await audit(actor.id, `REGISTRATION_${approve ? "APPROVED" : "REJECTED"}`, "User", id, { from: target.status, to: updated.status });
  return Response.json(updated);
});
