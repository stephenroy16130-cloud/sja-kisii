import { requirePermission } from "@/lib/auth";
import { collectionLive } from "@/lib/collections";
import { db } from "@/lib/db";
import { HttpError, route } from "@/lib/http";

export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requirePermission("finance:manage");
  const { id } = await ctx.params;
  const c = await db.collection.findUnique({ where: { id }, select: { id: true, crewId: true } });
  if (!c) throw new HttpError(404, "Activity not found");
  return Response.json(await collectionLive(c), { headers: { "Cache-Control": "no-store" } });
});
