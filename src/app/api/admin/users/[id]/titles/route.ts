import { Title } from "@prisma/client";
import { after } from "next/server";
import { z } from "zod";
import { audit, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { leadershipLocked } from "@/lib/leadership";
import { notifyUsers } from "@/lib/push";
import { can } from "@/lib/rbac";

const schema = z.object({
  titles: z.array(z.nativeEnum(Title)).max(9),
  crewId: z.number().int().min(1).max(4).optional(),
});
const pretty = (t: string) => t.replace(/_/g, " ").toLowerCase();

export const PUT = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requireUser();
  const admin = can(actor, "user:manage_titles"); // the DO Admin
  const appointer = can(actor, "user:appoint_admin"); // the Superintendent
  if (!admin && !appointer) throw new HttpError(403, "You do not have permission to do this");

  const { id } = await ctx.params;
  const { titles, crewId } = schema.parse(await req.json());
  const next = [...new Set(titles)];

  const target = await db.user.findUnique({ where: { id } });
  if (!target) throw new HttpError(404, "User not found");
  if (target.isSuperintendent || target.isDeveloper) throw new HttpError(403, "This account's titles cannot be changed");
  if (target.status !== "ACTIVE") throw new HttpError(409, "Only active members can hold titles");
  if (next.includes("CORPORAL") && next.includes("SERGEANT")) {
    throw new HttpError(400, "A member cannot be both Corporal and Sergeant");
  }

  const beforeSet = new Set<Title>(target.titles);
  const afterSet = new Set<Title>(next);
  const added = next.filter((t) => !beforeSet.has(t));
  const changed = [...target.titles.filter((t) => !afterSet.has(t)), ...added];

  if (changed.length > 0 && target.id === actor.id) throw new HttpError(403, "You cannot change your own titles");
  if (!admin && changed.some((t) => t !== "DO_ADMIN")) {
    throw new HttpError(403, "The Superintendent appoints or replaces the DO Admin only. The DO Admin promotes everyone else.");
  }
  if (admin && changed.includes("DO_ADMIN")) {
    throw new HttpError(403, "Only the Divisional Superintendent appoints or replaces the DO Admin");
  }
  // Promotions can be locked once every post is filled. Taking titles away always works.
  if (admin && added.length > 0 && (await leadershipLocked())) {
    throw new HttpError(409, "Promotions are locked. Reopen them on the People page to promote.");
  }

  // Every leader belongs to a crew. A crew can only be set here when the member has none yet.
  const finalCrew = target.crewId ?? crewId ?? null;
  if (next.length > 0 && !finalCrew) throw new HttpError(400, "Choose a crew for this leader first");

  const updated = await db.user.update({
    where: { id },
    data: { titles: next, ...(target.crewId === null && finalCrew ? { crewId: finalCrew } : {}) },
    select: { id: true, titles: true, crewId: true },
  });
  await audit(actor.id, "TITLES_CHANGED", "User", id, { before: target.titles, after: next, crewId: updated.crewId });

  if (changed.length > 0) {
    after(() =>
      notifyUsers([target.id], {
        title: "Your role changed",
        body: next.length ? "You are now: " + next.map(pretty).join(", ") : "You no longer hold a leadership title.",
        url: "/dashboard",
        tag: "role-" + target.id,
      })
    );
  }
  return Response.json(updated);
});
