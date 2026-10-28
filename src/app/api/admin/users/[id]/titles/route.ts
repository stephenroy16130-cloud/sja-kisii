import { Title } from "@prisma/client";
import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";

export const PUT = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requirePermission("user:manage_titles");
  const { id } = await ctx.params;
  const { titles } = z.object({ titles: z.array(z.nativeEnum(Title)).max(9) }).parse(await req.json());
  const next = [...new Set(titles)];

  const target = await db.user.findUnique({ where: { id } });
  if (!target) throw new HttpError(404, "User not found");
  if (target.isSuperintendent || target.isDeveloper) throw new HttpError(403, "This account's titles cannot be changed");
  if (target.status !== "ACTIVE") throw new HttpError(409, "Only active members can hold titles");

  const isCrewLeader = next.includes("CORPORAL") || next.includes("SERGEANT");
  if (next.includes("CORPORAL") && next.includes("SERGEANT")) throw new HttpError(400, "A member cannot be both Corporal and Sergeant");
  if (isCrewLeader && !target.crewId) throw new HttpError(400, "A Crew Leader must belong to a crew");

  // Demotion = removing titles. The user and all their history stay intact.
  const updated = await db.user.update({ where: { id }, data: { titles: next }, select: { id: true, titles: true } });
  await audit(actor.id, "TITLES_CHANGED", "User", id, { before: target.titles, after: next });
  return Response.json(updated);
});
