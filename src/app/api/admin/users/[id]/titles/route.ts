import { Title } from "@prisma/client";
import { z } from "zod";
import { audit, requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";

const schema = z.object({
  titles: z.array(z.nativeEnum(Title)).max(9),
  crewId: z.number().int().min(1).max(4).optional(),
});

export const PUT = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requirePermission("user:manage_titles");
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

  // Every leader belongs to a crew. A crew can only be set here when the member has none yet.
  const finalCrew = target.crewId ?? crewId ?? null;
  if (next.length > 0 && !finalCrew) throw new HttpError(400, "Choose a crew for this leader first");

  const updated = await db.user.update({
    where: { id },
    data: { titles: next, ...(target.crewId === null && finalCrew ? { crewId: finalCrew } : {}) },
    select: { id: true, titles: true, crewId: true },
  });
  await audit(actor.id, "TITLES_CHANGED", "User", id, { before: target.titles, after: next, crewId: updated.crewId });
  return Response.json(updated);
});
