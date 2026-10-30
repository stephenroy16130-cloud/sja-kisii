import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";

const schema = z.object({
  action: z.enum(["ADD", "REMOVE"]),
  targetUserId: z.string().min(1, "Choose a member"),
});

export const POST = route(async (req: Request) => {
  const actor = await requirePermission("crew:request_membership_change");
  if (!actor.crewId) throw new HttpError(400, "You are not assigned to a crew");
  const { action, targetUserId } = schema.parse(await req.json());

  const target = await db.user.findUnique({ where: { id: targetUserId } });
  if (!target || target.status !== "ACTIVE" || target.isDeveloper || target.isSuperintendent) {
    throw new HttpError(404, "Member not found");
  }
  if (target.titles.length > 0) {
    throw new HttpError(400, "Leaders are moved by the Superintendent, not by a request");
  }
  if (action === "ADD" && target.crewId === actor.crewId) throw new HttpError(400, "They are already in your crew");
  if (action === "REMOVE") {
    if (target.crewId !== actor.crewId) throw new HttpError(400, "They are not in your crew");
    if (target.id === actor.id) throw new HttpError(400, "You cannot remove yourself");
  }

  const dup = await db.membershipRequest.findFirst({
    where: { crewId: actor.crewId, targetUserId, action, status: "PENDING" },
    select: { id: true },
  });
  if (dup) throw new HttpError(409, "There is already a pending request for this member");

  const req2 = await db.membershipRequest.create({
    data: { crewId: actor.crewId, targetUserId, action, requestedById: actor.id },
    select: { id: true },
  });
  await audit(actor.id, "MEMBERSHIP_REQUESTED", "MembershipRequest", req2.id, { action, targetUserId });
  return Response.json(req2, { status: 201 });
});
